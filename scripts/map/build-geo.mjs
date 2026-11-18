// Turns the raw downloads in scripts/map/.cache into the small file the page ships:
//   src/data/map/kyoto-geo.json
// Run by hand after fetch-osm.mjs / fetch-dem.mjs:  node scripts/map/build-geo.mjs
// Geometry © OpenStreetMap contributors (ODbL). Elevation: Terrain Tiles (AWS Open Data).
import { readFile, writeFile } from 'node:fs/promises';
import { BBOX, toXY, CELL } from './config.mjs';

const cache = (n) => new URL(`./.cache/${n}.json`, import.meta.url);
const load = async (n) => {
  try { return JSON.parse(await readFile(cache(n), 'utf8')).elements; }
  catch { console.warn(`(no ${n}.json — skipped)`); return []; }
};
const dem = JSON.parse(await readFile(cache('dem'), 'utf8'));
const [X0, Y0] = toXY(BBOX.w, BBOX.s);
const [X1, Y1] = toXY(BBOX.e, BBOX.n);
const inBox = ([x, y], pad = 0) => x >= X0 - pad && x <= X1 + pad && y >= Y0 - pad && y <= Y1 + pad;
const pts = (e) => (e.geometry || []).map((g) => toXY(g.lon, g.lat));
const ascii = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

// ---------- geometry helpers ----------
function distSeg(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
function simplify(p, tol) {
  if (p.length < 3) return p;
  const keep = new Uint8Array(p.length); keep[0] = keep[p.length - 1] = 1;
  const stack = [[0, p.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let m = -1, md = tol;
    for (let i = a + 1; i < b; i++) { const d = distSeg(p[i], p[a], p[b]); if (d > md) { md = d; m = i; } }
    if (m > 0) { keep[m] = 1; stack.push([a, m], [m, b]); }
  }
  return p.filter((_, i) => keep[i]);
}
/** Split a polyline into the pieces that lie inside the map box. */
function clip(p, pad = 150) {
  const out = []; let cur = [];
  for (const q of p) { if (inBox(q, pad)) cur.push(q); else { if (cur.length > 1) out.push(cur); cur = []; } }
  if (cur.length > 1) out.push(cur);
  return out;
}
const len = (p) => { let l = 0; for (let i = 1; i < p.length; i++) l += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return l; };

/** Drop ways that run alongside an already-kept way (second track / other carriageway). */
function dedupeParallel(ways, gap) {
  const G = 80, grid = new Map(), kept = [];
  const key = (x, y) => `${Math.floor(x / G)},${Math.floor(y / G)}`;
  const add = (a, b) => {
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (G / 2)));
    for (let i = 0; i <= n; i++) {
      const k = key(a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push([a, b]);
    }
  };
  const near = (p) => {
    const cx = Math.floor(p[0] / G), cy = Math.floor(p[1] / G);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++)
      for (const [a, b] of grid.get(`${cx + i},${cy + j}`) || []) if (distSeg(p, a, b) < gap) return true;
    return false;
  };
  for (const w of [...ways].sort((a, b) => len(b) - len(a))) {
    // sample along the way so long straight segments are tested too
    const samples = [];
    for (let i = 1; i < w.length; i++) {
      const n = Math.max(1, Math.ceil(Math.hypot(w[i][0] - w[i - 1][0], w[i][1] - w[i - 1][1]) / 40));
      for (let k = 0; k < n; k++) samples.push([w[i - 1][0] + ((w[i][0] - w[i - 1][0]) * k) / n, w[i - 1][1] + ((w[i][1] - w[i - 1][1]) * k) / n]);
    }
    samples.push(w[w.length - 1]);
    if (samples.filter(near).length / samples.length > 0.6) continue;
    kept.push(w);
    for (let i = 1; i < w.length; i++) add(w[i - 1], w[i]);
  }
  return kept;
}
/** Join pieces whose ends touch (within `gap` metres) into longer polylines. */
function chain(ways, gap) {
  const rest = ways.map((w) => w.slice()); const out = [];
  const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  while (rest.length) {
    let cur = rest.shift(), grown = true;
    while (grown) {
      grown = false;
      for (let i = 0; i < rest.length; i++) {
        const w = rest[i], h = cur[0], t = cur[cur.length - 1];
        if (d(t, w[0]) <= gap) cur = cur.concat(w);
        else if (d(t, w[w.length - 1]) <= gap) cur = cur.concat(w.slice().reverse());
        else if (d(h, w[w.length - 1]) <= gap) cur = w.concat(cur);
        else if (d(h, w[0]) <= gap) cur = w.slice().reverse().concat(cur);
        else continue;
        rest.splice(i, 1); grown = true; break;
      }
    }
    out.push(cur);
  }
  return out;
}
/** Flat, delta-encoded [x0,y0,dx,dy,...] — small in JSON and gzip-friendly. */
const enc = (p) => { const o = []; let px = 0, py = 0; for (const [x, y] of p) { o.push(x - px, y - py); px = x; py = y; } return o; };

// ---------- railways ----------
const LINE_RULES = [
  [/新幹線/, 'shinkansen'], [/東海道/, 'jr-kyoto'], [/山陰/, 'jr-sagano'], [/奈良線/, 'jr-nara'],
  [/烏丸線/, 'subway-karasuma'], [/東西線/, 'subway-tozai'], [/阪急/, 'hankyu'],
  [/京阪電気鉄道(京阪本線|鴨東線)/, 'keihan'], [/京福/, 'randen'], [/叡山/, 'eizan'],
  [/近畿日本鉄道/, 'kintetsu'], [/嵯峨野観光/, 'torokko'],
];
const lineOf = (name) => (LINE_RULES.find(([re]) => re.test(name || '')) || [])[1];
const railRaw = {};
for (const e of await load('rail')) {
  const id = lineOf(e.tags.name); if (!id) continue;
  const under = id.startsWith('subway') || e.tags.tunnel === 'yes' ? 1 : 0;
  for (const piece of clip(pts(e))) ((railRaw[id] ||= { 0: [], 1: [] })[under]).push(piece);
}
const rail = [], railAll = {};
for (const [id, byU] of Object.entries(railRaw)) {
  const kept = { 0: [], 1: [] };
  // de-duplicate across surface/underground together so a portal doesn't double up
  const all = dedupeParallel([...byU[0].map((w) => ((w.u = 0), w)), ...byU[1].map((w) => ((w.u = 1), w))], 14);
  for (const w of all) kept[w.u].push(w);
  for (const u of [0, 1]) for (const c of chain(kept[u], 45)) {
    const s = simplify(c, 12); if (len(s) > 120) rail.push({ id, u, p: enc(s) });
  }
  railAll[id] = all;
}
// one long path per line for the little moving train
const trains = [];
for (const [id, all] of Object.entries(railAll)) {
  if (id === 'shinkansen') continue;
  const longest = chain(all, 70).sort((a, b) => len(b) - len(a))[0];
  if (longest && len(longest) > 1500) trains.push({ id, p: enc(simplify(longest, 25)) });
}

// ---------- stations ----------
const railSegs = Object.entries(railAll).flatMap(([id, ws]) => ws.flatMap((w) => w.slice(1).map((b, i) => [id, w[i], b])));
const stations = [];
for (const e of await load('stations')) {
  if (e.tags.railway !== 'station') continue;
  const n = ascii(e.tags['name:en']).replace(/ Station$/, '').replace(/・.*/, '').trim(); if (!n) continue;
  const p = toXY(e.lon, e.lat); if (!inBox(p)) continue;
  const lines = [...new Set(railSegs.filter(([, a, b]) => distSeg(p, a, b) < 90).map(([id]) => id))];
  const same = stations.find((s) => s.n.toLowerCase() === n.toLowerCase() && Math.hypot(s.x - p[0], s.y - p[1]) < 450);
  if (same) { same.l = [...new Set([...same.l, ...lines])]; same.c.push(p); continue; }
  stations.push({ n, x: p[0], y: p[1], l: lines, c: [p] });
}
for (const s of stations) {
  s.x = Math.round(s.c.reduce((a, p) => a + p[0], 0) / s.c.length);
  s.y = Math.round(s.c.reduce((a, p) => a + p[1], 0) / s.c.length);
  delete s.c;
}

// ---------- rivers ----------
const RIVERS = { 桂川: ['Katsura River', 110], 鴨川: ['Kamo River', 70], 賀茂川: ['Kamo River', 60], 高野川: ['Takano River', 45],
  琵琶湖疏水: ['Lake Biwa Canal', 14], 白川: ['Shirakawa', 8], 高瀬川: ['Takase River', 6], 天神川: ['Tenjin River', 14], 堀川: ['Horikawa', 8] };
const rivRaw = {};
for (const e of await load('rivers')) {
  const r = RIVERS[e.tags.name]; if (!r || e.tags.tunnel) continue;
  for (const piece of clip(pts(e))) (rivRaw[e.tags.name] ||= []).push(piece);
}
const rivers = [];
for (const [name, ws] of Object.entries(rivRaw)) {
  const [n, w] = RIVERS[name];
  for (const c of chain(dedupeParallel(ws, 20), 60)) { const s = simplify(c, 10); if (len(s) > 250) rivers.push({ n, w, p: enc(s) }); }
}

// ---------- roads ----------
// Sign-style names for the streets travellers actually navigate by.
const STREETS = { 四条通: 'Shijo-dori', 三条通: 'Sanjo-dori', 五条通: 'Gojo-dori', 七条通: 'Shichijo-dori', 御池通: 'Oike-dori',
  丸太町通: 'Marutamachi-dori', 今出川通: 'Imadegawa-dori', 北大路通: 'Kitaoji-dori', 九条通: 'Kujo-dori', 九条通り: 'Kujo-dori',
  河原町通: 'Kawaramachi-dori', 烏丸通: 'Karasuma-dori', 堀川通: 'Horikawa-dori', 千本通: 'Senbon-dori', 西大路通: 'Nishioji-dori',
  東大路通: 'Higashioji-dori', 川端通: 'Kawabata-dori', 白川通: 'Shirakawa-dori', 塩小路通: 'Shiokoji-dori', 北山通: 'Kitayama-dori' };
const CLASS = { trunk: 0, primary: 0, secondary: 1, tertiary: 2 };
const roadRaw = new Map();
for (const e of await load('roads')) {
  const name = e.tags.name || '';
  const cls = STREETS[name] ? Math.min(CLASS[e.tags.highway], 1) : CLASS[e.tags.highway];
  const k = `${cls}|${name}`;
  for (const piece of clip(pts(e))) { if (!roadRaw.has(k)) roadRaw.set(k, []); roadRaw.get(k).push(piece); }
}
const roads = [], labels = [];
for (const [k, ws] of roadRaw) {
  const [cls, name] = k.split('|');
  const chains = chain(name ? dedupeParallel(ws, 28) : ws, 40);
  for (const c of chains) { const s = simplify(c, 14); if (len(s) > (cls === '2' ? 300 : 150)) roads.push({ c: +cls, p: enc(s) }); }
  if (STREETS[name] && !labels.some((l) => l.n === STREETS[name])) {
    const all = chains.flat();
    const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
    const ew = Math.max(...xs) - Math.min(...xs) > Math.max(...ys) - Math.min(...ys);
    labels.push({ n: STREETS[name], ew: ew ? 1 : 0, p: enc(simplify(chains.sort((a, b) => len(b) - len(a))[0], 60)) });
  }
}
roads.sort((a, b) => b.c - a.c);

// ---------- land cover grid (forest / park / water) + heights ----------
const { cols, rows } = dem;
function rasterise(elements, test) {
  const mask = new Uint8Array(cols * rows);
  for (const e of elements) {
    if (!test(e.tags || {})) continue;
    const rings = e.type === 'way' ? [pts(e)] : (e.members || []).filter((m) => m.geometry).map((m) => m.geometry.map((g) => toXY(g.lon, g.lat)));
    const segs = rings.flatMap((r) => r.slice(1).map((b, i) => [r[i], b]));
    if (!segs.length) continue;
    const ys = segs.flatMap((s) => [s[0][1], s[1][1]]), xs = segs.flatMap((s) => [s[0][0], s[1][0]]);
    const r0 = Math.max(0, Math.floor((Math.min(...ys) - dem.y0) / CELL)), r1 = Math.min(rows - 1, Math.floor((Math.max(...ys) - dem.y0) / CELL));
    const c0 = Math.max(0, Math.floor((Math.min(...xs) - dem.x0) / CELL)), c1 = Math.min(cols - 1, Math.floor((Math.max(...xs) - dem.x0) / CELL));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      // 4 sample points per cell, even-odd rule over every ring of the element
      let hit = 0;
      for (const [ox, oy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
        const x = dem.x0 + (c + ox) * CELL, y = dem.y0 + (r + oy) * CELL; let inside = false;
        for (const [a, b] of segs) if ((a[1] > y) !== (b[1] > y) && x < a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1])) inside = !inside;
        if (inside) hit++;
      }
      if (hit >= 2) mask[r * cols + c] = 1;
    }
  }
  return mask;
}
const green = await load('green');
const forest = rasterise(green, (t) => t.natural === 'wood' || t.landuse === 'forest');
const park = rasterise(green, (t) => t.leisure === 'park');
const water = rasterise(await load('water'), (t) => t.natural === 'water');
// land codes: 0 town, 1 forest, 2 park, 3 water
const land = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => {
  const i = r * cols + c; return water[i] ? 3 : forest[i] ? 1 : park[i] ? 2 : 0;
}).join(''));
// heights in 10 m steps, one base-36 pair per cell would be wasteful: clamp to 0..35 steps of 15 m
const H_STEP = 15;
const height = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) =>
  Math.max(0, Math.min(35, Math.round(dem.h[r * cols + c] / H_STEP))).toString(36)).join(''));

const out = {
  attribution: '© OpenStreetMap contributors (ODbL); elevation: Terrain Tiles on AWS (JAXA AW3D30 and others)',
  box: [X0, Y0, X1, Y1], grid: { x0: dem.x0, y0: dem.y0, cols, rows, cell: CELL, hStep: H_STEP, height, land },
  rail, trains, stations, rivers, roads, labels,
};
const json = JSON.stringify(out);
await writeFile(new URL('../../src/data/map/kyoto-geo.json', import.meta.url), json);
const { gzipSync } = await import('node:zlib');
console.log(`kyoto-geo.json ${(json.length / 1024).toFixed(1)}KB (gzip ${(gzipSync(json).length / 1024).toFixed(1)}KB)`);
console.log({ rail: rail.length, trains: trains.map((t) => t.id).join(','), stations: stations.length, rivers: rivers.length, roads: roads.length, labels: labels.length,
  forest: forest.reduce((a, b) => a + b, 0), park: park.reduce((a, b) => a + b, 0), water: water.reduce((a, b) => a + b, 0) });
