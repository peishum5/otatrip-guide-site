/**
 * Kyoto diorama renderer.
 *
 * A tiny software renderer: every frame is drawn into a low-resolution pixel
 * buffer (so it reads as pixel art) and scaled up by the browser. No libraries.
 *
 * Geography is real: src/data/map/kyoto-geo.json is generated from
 * OpenStreetMap + open elevation data by scripts/map/*.mjs. Everything is
 * placed by latitude/longitude with one constant scale, north at the top.
 * Only two things are stylised: hills are drawn taller than life (EXAG) and
 * landmark icons are larger than the real buildings.
 */
import geo from '../../data/map/kyoto-geo.json';
import { SPRITES, PALETTE, LIT, type SpriteId } from './sprites';

export type TimeMode = 'morning' | 'day' | 'night';
export interface Landmark { id: string; name: string; lat: number; lon: number; sprite: SpriteId; major?: boolean; glow?: boolean; /** Only appears once you zoom in. */ detail?: boolean }
export interface AreaPin { id: string; lat: number; lon: number; times: TimeMode[] }
export interface MapOptions {
  landmarks: Landmark[];
  areas: AreaPin[];
  /** Station names that are labelled even on the full-city view. */
  hubs: string[];
  reducedMotion: boolean;
  /** Called after the camera moved and a new frame was drawn. */
  onCamera?: () => void;
  /** Called when the map is tapped (not dragged): the station or landmark under the finger, or null. */
  onTap?: (hit: MapHit | null) => void;
}
export interface MapHit { kind: 'station' | 'landmark'; id: string; name: string; lines: string[]; x: number; y: number }

/** Real line colours, nudged so they stay distinct from each other on a small map. */
export const LINES: Record<string, { name: string; color: string }> = {
  'jr-kyoto': { name: 'JR Kyoto Line', color: '#1565c0' },
  'jr-sagano': { name: 'JR Sagano Line', color: '#7b4fd0' },
  'jr-nara': { name: 'JR Nara Line', color: '#9c5a1c' },
  'subway-karasuma': { name: 'Subway Karasuma Line', color: '#00a651' },
  'subway-tozai': { name: 'Subway Tozai Line', color: '#f0502d' },
  hankyu: { name: 'Hankyu', color: '#8e1f3f' },
  keihan: { name: 'Keihan', color: '#00695c' },
  randen: { name: 'Randen tram', color: '#c2409b' },
  eizan: { name: 'Eizan', color: '#e08a00' },
  kintetsu: { name: 'Kintetsu', color: '#b71c1c' },
  torokko: { name: 'Sagano Scenic Railway', color: '#6d4c2f' },
  shinkansen: { name: 'Shinkansen', color: '#5c6f9c' },
};

// ---- projection (must match scripts/map/config.mjs) ----
const ORIGIN = { lat: 35.0075, lon: 135.73 };
const KX = Math.cos((ORIGIN.lat * Math.PI) / 180) * 111320;
const KY = 110950;
export const toXY = (lon: number, lat: number): [number, number] => [(lon - ORIGIN.lon) * KX, (lat - ORIGIN.lat) * KY];

const TILT = 0.62; // how far the board is tipped away from the viewer
const BASE_STEP = 5; // the basin floor (below ~75 m) is drawn flat
const EXAG = 2.2; // hills are drawn this many times taller than life
const MAX_SCALE = 0.15; // px per metre
const DETAIL_S = 0.07; // zoom at which the extra sights appear
const DETAIL_LABEL_S = 0.085; // ...and at which they are named

// ---- colour helpers (canvas ImageData is little-endian ABGR) ----
type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const pack = ([r, g, b]: RGB) => (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function tint(mode: TimeMode, [r, g, b]: RGB): RGB {
  if (mode === 'night') return [r * 0.3 + 6, g * 0.36 + 12, b * 0.52 + 30].map((v) => Math.round(clamp(v, 0, 255))) as RGB;
  if (mode === 'morning') return [r * 0.98 + 10, g * 0.93 + 2, b * 0.84].map((v) => Math.round(clamp(v, 0, 255))) as RGB;
  return [r, g, b];
}
const hash = (a: number, b: number, c: number) => {
  let h = Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
};

function buildPalette(mode: TimeMode) {
  const t = (h: string) => pack(tint(mode, hex(h)));
  const raw = (h: string) => pack(hex(h));
  const night = mode === 'night';
  return {
    town: ['#ded3b6', '#dacfb1', '#e2d8bc'].map(t),
    roof: ['#cfc4a7', '#c9bea2', '#d3c9ad', '#c6bca4', '#ccc2a9'].map(t),
    wall: t('#bdb295'),
    window: night ? raw('#ffd76a') : t('#bdb295'),
    park: ['#8ccc62', '#80c257', '#96d46c'].map(t),
    forest: ['#3f9148', '#37843f', '#2f7638', '#4a9c50'].map(t),
    forestHi: t('#62b25c'),
    water: t('#3d8fe0'),
    waterHi: night ? raw('#7fa8e8') : raw('#bfe3ff'),
    cliff: ['#8a7858', '#77664a'].map(t),
    step: ['#cfc3a2', '#c8bc9a'].map(t),
    cliffForest: ['#2a6431', '#225528'].map(t),
    board: ['#6b4a2b', '#59391f', '#463018'].map(t),
    road: night ? [raw('#c79a3c'), raw('#8f7434'), raw('#4f4a3a')] : [t('#fffdf0'), t('#f5edd4'), t('#c9bd9a')],
    sky: (night ? ['#070b24', '#0b1232', '#101a44', '#16225a'] : mode === 'morning' ? ['#f7b98c', '#f9c9a0', '#fbdab8', '#fde9d2'] : ['#6ec0f2', '#84ccf5', '#9bd7f8', '#b4e2fa']).map(raw),
    star: raw('#e8f0ff'),
    station: raw('#ffffff'),
    stationEdge: raw('#16161c'),
    casing: night ? raw('#05060f') : raw('#2a2a33'),
    ring: raw('#ffb000'),
    ringSel: raw('#00e5ff'),
    white: raw('#ffffff'),
    cloud: night ? 0 : raw('#ffffff'),
    glow: hex('#ffb347'),
    line: Object.fromEntries(Object.entries(LINES).map(([id, l]) => [id, night ? pack(hex(l.color).map((v) => Math.round(v * 0.75 + 50)) as RGB) : raw(l.color)])) as Record<string, number>,
    sprite: Object.fromEntries(Object.entries(PALETTE).map(([ch, h]) => [ch, night && !LIT.has(ch) ? pack(hex(h).map((v, i) => Math.round(v * (i === 2 ? 0.62 : 0.5) + 14)) as RGB) : raw(h)])) as Record<string, number>,
  };
}

/** [x0,y0,dx,dy,...] -> absolute coordinates */
function dec(p: number[]): Float32Array {
  const o = new Float32Array(p.length);
  let x = 0, y = 0;
  for (let i = 0; i < p.length; i += 2) { x += p[i]; y += p[i + 1]; o[i] = x; o[i + 1] = y; }
  return o;
}

export function createKyotoMap(canvas: HTMLCanvasElement, labelCanvas: HTMLCanvasElement, opts: MapOptions) {
  const ctx = canvas.getContext('2d')!;
  const lctx = labelCanvas.getContext('2d')!;
  const g = geo.grid;
  const [X0, Y0, X1, Y1] = geo.box;
  const { cols, rows, cell } = g;
  const LV = g.hStep * EXAG; // drawn metres per height level

  // --- static data, decoded once ---
  const L = new Uint8Array(cols * rows); // height level
  const T = new Uint8Array(cols * rows); // 0 town 1 forest 2 park 3 water
  let maxLv = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const lv = Math.max(0, parseInt(g.height[r][c], 36) - BASE_STEP);
    L[r * cols + c] = lv; T[r * cols + c] = +g.land[r][c];
    if (lv > maxLv) maxLv = lv;
  }
  const rail = geo.rail.map((l) => ({ id: l.id, u: l.u, p: dec(l.p) }));
  const roads = geo.roads.map((l) => ({ c: l.c, p: dec(l.p) }));
  const rivers = geo.rivers.map((l) => ({ n: l.n, w: l.w, p: dec(l.p) }));
  const streetLabels = geo.labels.map((l) => ({ n: l.n, ew: !!l.ew, p: dec(l.p) }));
  const trains = geo.trains.map((tr, i) => {
    const p = dec(tr.p); const cum = [0];
    for (let k = 2; k < p.length; k += 2) cum.push(cum[cum.length - 1] + Math.hypot(p[k] - p[k - 2], p[k + 1] - p[k - 1]));
    return { id: tr.id, p, cum, total: cum[cum.length - 1], offset: (i * 0.37) % 1 };
  });
  const stations = geo.stations.map((s) => ({ ...s, hub: opts.hubs.includes(s.n) }));
  const landmarks = opts.landmarks.map((m) => { const [x, y] = toXY(m.lon, m.lat); return { ...m, x, y }; }).sort((a, b) => b.y - a.y);
  /** Three tiers: the main sights always show, the rest from a little zoom, the extra picks once you are close. */
  const seen = (m: Landmark, s: number) => m.major || (m.detail ? s >= DETAIL_S : s >= home.s * 1.5);
  const areas = opts.areas.map((a) => { const [x, y] = toXY(a.lon, a.lat); return { ...a, x, y }; });
  const sprites = Object.fromEntries(Object.entries(SPRITES).map(([id, rowsS]) => [id, { w: rowsS[0].length, h: rowsS.length, rows: rowsS as readonly string[] }]));

  // --- state ---
  let W = 0, H = 0, cssScale = 1, dpr = 1;
  let img: ImageData, buf: Uint32Array, base: Uint32Array, rowBuf: Int16Array;
  let mode: TimeMode = 'day';
  let pal = buildPalette(mode);
  const cam = { x: (X0 + X1) / 2, y: (Y0 + Y1) / 2, s: 0.03 };
  const home = { x: cam.x, y: cam.y, s: cam.s };
  let tween: null | { fx: number; fy: number; fs: number; tx: number; ty: number; ts: number; t0: number; ms: number } = null;
  let dirty = true, running = false, raf = 0, lastAnim = 0, visible = true;
  let highlight: string[] = [];
  let selected: string | null = null;
  let sparkles: number[] = [];
  let fontsReady = false;
  /** True while the view is meant to show the whole city (so a resize re-fits it). */
  let homeMode = true;
  /** onCamera is held back until the caller has the map object in hand. */
  let ready = false;
  /** Boxes (CSS px) already used by the page's own pins, so map text keeps clear of them. */
  let reserved: [number, number, number, number][] = [];
  /** A single spot being pointed at (world metres). */
  let mark: { x: number; y: number } | null = null;

  const idxAt = (x: number, y: number) => clamp(Math.floor((y - g.y0) / cell), 0, rows - 1) * cols + clamp(Math.floor((x - g.x0) / cell), 0, cols - 1);
  const sx = (x: number) => W / 2 + (x - cam.x) * cam.s;
  const sy = (y: number) => H / 2 - (y - cam.y) * cam.s * TILT;
  /** World point -> buffer pixel, standing on the ground at that spot. */
  const project = (x: number, y: number): [number, number, number] => {
    const i = idxAt(x, y);
    return [sx(x), sy(y) - L[i] * LV * cam.s, (i / cols) | 0];
  };

  function fitHome() {
    const bw = X1 - X0, bh = Y1 - Y0, top = maxLv * LV * 0.75;
    home.s = Math.min(W / (bw * 1.02), H / (bh * TILT + top + 500));
    const board = Math.max(4, 300 * home.s);
    home.x = (X0 + X1) / 2;
    home.y = (Y0 + Y1) / 2 + (top * home.s - board) / (2 * home.s * TILT);
  }
  const atHome = () => !tween && Math.abs(cam.s - home.s) < home.s * 0.02;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    const pd = rect.width >= 640 ? Math.max(2, Math.round(dpr * 2)) : Math.max(2, Math.round(dpr * 1.34));
    W = Math.ceil((rect.width * dpr) / pd); H = Math.ceil((rect.height * dpr) / pd);
    cssScale = rect.width / W;
    canvas.width = W; canvas.height = H;
    labelCanvas.width = Math.round(rect.width * dpr); labelCanvas.height = Math.round(rect.height * dpr);
    img = ctx.createImageData(W, H);
    buf = new Uint32Array(img.data.buffer);
    base = new Uint32Array(W * H); rowBuf = new Int16Array(W * H);
    fitHome();
    if (homeMode) { cam.x = home.x; cam.y = home.y; cam.s = home.s; tween = null; }
    else cam.s = clamp(cam.s, home.s, MAX_SCALE);
    updateTouchAction();
    dirty = true;
    paint(performance.now());
  }
  function updateTouchAction() { canvas.style.touchAction = cam.s <= home.s * 1.02 ? 'pan-y' : 'none'; }

  // ---------------- base frame ----------------
  function fillRect(x0: number, y0: number, x1: number, y1: number, col: number, row: number) {
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(W, x1); y1 = Math.min(H, y1);
    for (let y = y0; y < y1; y++) { const o = y * W; for (let x = x0; x < x1; x++) { buf[o + x] = col; rowBuf[o + x] = row; } }
  }

  function drawTerrain() {
    const s = cam.s, cw = cell * s, night = mode === 'night';
    const detail = cw >= 8, lots = cw >= 14 ? 3 : 2;
    const c0 = clamp(Math.floor((cam.x - W / 2 / s - g.x0) / cell), 0, cols - 1);
    const c1 = clamp(Math.ceil((cam.x + W / 2 / s - g.x0) / cell), 0, cols - 1);
    const board = Math.max(4, Math.round(300 * s));
    for (let r = rows - 1; r >= 0; r--) {
      const syN = sy(g.y0 + (r + 1) * cell), syS = sy(g.y0 + r * cell);
      if (syS < 0 || syN - maxLv * LV * s > H) continue;
      for (let c = c0; c <= c1; c++) {
        const i = r * cols + c, lv = L[i], type = T[i], hp = lv * LV * s;
        const xa = Math.round(sx(g.x0 + c * cell)), xb = Math.round(sx(g.x0 + (c + 1) * cell));
        const top = Math.round(syN - hp), bot = Math.round(syS - hp);
        const hsh = hash(c, r, 0);
        if (!detail || type === 3) {
          const col = type === 3 ? pal.water : type === 1 ? pal.forest[(hsh + (lv >> 1)) & 3] : type === 2 ? pal.park[hsh % 3] : pal.town[hsh % 3];
          fillRect(xa, top, xb, bot, col, r);
        } else {
          const wpx = xb - xa, hpx = bot - top;
          for (let py = Math.max(0, top); py < Math.min(H, bot); py++) {
            const v = (py - top) / hpx, o = py * W;
            for (let px = Math.max(0, xa); px < Math.min(W, xb); px++) {
              const u = (px - xa) / wpx;
              let col: number;
              if (type === 0) {
                const lu = (u * lots) | 0, lw = (v * lots) | 0, fu = u * lots - lu, fv = v * lots - lw;
                const h = hash(c * 8 + lu, r * 8 + lw, 1);
                if ((h & 15) === 0) col = pal.park[h % 3];
                else if (fu > 0.14 && fu < 0.86 && fv > 0.12 && fv < 0.9) col = fv > 0.6 ? (night && ((h >> 8) & 3) === 0 ? pal.window : pal.wall) : pal.roof[(h >> 3) % pal.roof.length];
                else col = pal.town[hsh % 3];
              } else if (type === 1) {
                const lu = (u * 3) | 0, lw = (v * 3) | 0, fu = u * 3 - lu - 0.5, fv = v * 3 - lw - 0.5;
                const h = hash(c * 8 + lu, r * 8 + lw, 2);
                col = fu * fu + fv * fv < 0.2 ? (fu < 0 && fv < 0 ? pal.forestHi : pal.forest[h & 3]) : pal.forest[2];
              } else {
                col = pal.park[hash(c * 8 + ((u * 3) | 0), r * 8 + ((v * 3) | 0), 3) % 3];
              }
              buf[o + px] = col; rowBuf[o + px] = r;
            }
          }
        }
        // south-facing wall where the ground drops (and the edge of the board)
        const lvS = r > 0 ? L[i - cols] : -1;
        if (lv > lvS) {
          const end = r > 0 ? Math.round(syS - lvS * LV * s) : Math.round(syS) + board;
          for (let py = Math.max(0, bot); py < Math.min(H, end); py++) {
            // a single step down in town is a gentle slope, not a cliff: shade it lightly
            const set = r === 0 && py >= Math.round(syS) ? pal.board : type === 1 ? pal.cliffForest : r > 0 && lv - lvS <= 2 ? pal.step : pal.cliff;
            const col = set[(py - bot) % set.length === set.length - 1 ? set.length - 1 : (py >> 1) % (set.length - 1 || 1)];
            const o = py * W;
            for (let px = Math.max(0, xa); px < Math.min(W, xb); px++) { buf[o + px] = col; rowBuf[o + px] = r; }
          }
        }
      }
    }
  }

  /** Draw a world polyline pixel by pixel so it follows the ground and hides behind hills. */
  function drawLine(p: Float32Array, col: number, w: number, dash = 0, collect?: number[], force = false) {
    const s = cam.s, maxH = maxLv * LV * s;
    let run = 0;
    for (let k = 2; k < p.length; k += 2) {
      const ax = p[k - 2], ay = p[k - 1], bx = p[k], by = p[k + 1];
      const x0 = sx(ax), x1 = sx(bx), y0 = sy(ay), y1 = sy(by);
      const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) + 1;
      if (Math.max(x0, x1) < -w || Math.min(x0, x1) > W + w || Math.max(y0, y1) < -w || Math.min(y0, y1) - maxH > H + w) { run += n; continue; }
      for (let j = 0; j < n; j++, run++) {
        if (dash && run % (dash * 2) >= dash) continue;
        const f = n > 1 ? j / (n - 1) : 0, x = ax + (bx - ax) * f, y = ay + (by - ay) * f;
        const i = idxAt(x, y), row = (i / cols) | 0;
        const px = Math.round(sx(x) - w / 2), py = Math.round(sy(y) - L[i] * LV * s - w / 2);
        for (let dy = 0; dy < w; dy++) {
          const yy = py + dy; if (yy < 0 || yy >= H) continue;
          for (let dx = 0; dx < w; dx++) {
            const xx = px + dx; if (xx < 0 || xx >= W) continue;
            const o = yy * W + xx;
            if (force || rowBuf[o] >= row - 1) { buf[o] = col; if (collect && (run + dx + dy) % 5 === 0) collect.push(o); }
          }
        }
      }
    }
  }

  function drawSprite(id: SpriteId, cx: number, gy: number, k: number) {
    const sp = sprites[id];
    const x0 = Math.round(cx - (sp.w * k) / 2), y0 = Math.round(gy - sp.h * k);
    for (let r = 0; r < sp.h; r++) for (let c = 0; c < sp.w; c++) {
      const ch = sp.rows[r][c]; if (ch === '.') continue;
      const col = pal.sprite[ch];
      for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) {
        const x = x0 + c * k + dx, y = y0 + r * k + dy;
        if (x >= 0 && x < W && y >= 0 && y < H) buf[y * W + x] = col;
      }
    }
  }

  function renderBase() {
    const s = cam.s;
    // sky
    for (let y = 0; y < H; y++) { const col = pal.sky[Math.min(3, ((y / H) * 4) | 0)]; buf.fill(col, y * W, (y + 1) * W); }
    rowBuf.fill(-1);
    if (mode === 'night') for (let i = 0; i < W * H; i += 1) if (hash(i % W, (i / W) | 0, 9) % 211 === 0) buf[i] = pal.star;
    drawTerrain();
    if (mode === 'night') for (let i = 0; i < W * H; i++) if (rowBuf[i] >= 0 && buf[i] === pal.star) buf[i] = pal.sky[0];

    sparkles = [];
    for (const r of rivers) {
      if (r.w < 20 && s < 0.05) continue;
      drawLine(r.p, pal.water, Math.max(r.w >= 45 ? 2 : 1, Math.round(r.w * s)), 0, sparkles);
    }
    for (const r of roads) {
      if (r.c === 2 && s < 0.045) continue;
      drawLine(r.p, pal.road[r.c], r.c === 0 && s >= 0.08 ? 2 : 1);
    }
    const rw = s >= 0.07 ? 2 : 1;
    for (const l of rail) {
      if (l.id === 'shinkansen') { drawLine(l.p, pal.line[l.id], 1, 2); continue; }
      if (!l.u && s >= 0.05) drawLine(l.p, pal.casing, rw + 2);
    }
    for (const l of rail) if (l.id !== 'shinkansen') drawLine(l.p, pal.line[l.id], rw, l.u ? (rw === 2 ? 4 : 3) : 0);
    for (const st of stations) {
      if (!st.hub && s < 0.05) continue;
      const [px, py] = project(st.x, st.y), x = Math.round(px), y = Math.round(py), big = s >= 0.07;
      const e = big ? 2 : 1;
      fillRect(x - e, y - e, x + e + 1, y + e + 1, pal.stationEdge, rowBuf[clamp(y, 0, H - 1) * W + clamp(x, 0, W - 1)]);
      fillRect(x - e + 1, y - e + 1, x + e, y + e, pal.station, rowBuf[clamp(y, 0, H - 1) * W + clamp(x, 0, W - 1)]);
    }
    const k = s >= 0.085 ? 2 : 1;
    for (const m of landmarks) {
      if (!seen(m, s)) continue;
      const [px, py] = project(m.x, m.y);
      if (px < -30 || px > W + 30 || py < -10 || py > H + 40) continue;
      drawSprite(m.sprite, px, py + 1, k);
    }
  }

  // ---------------- animated overlay ----------------
  function blend(o: number, [r, gg, b]: RGB, a: number) {
    const c = buf[o];
    buf[o] = (0xff000000 | (Math.round(((c >> 16) & 255) * (1 - a) + b * a) << 16) | (Math.round(((c >> 8) & 255) * (1 - a) + gg * a) << 8) | Math.round((c & 255) * (1 - a) + r * a)) >>> 0;
  }
  function ring(x: number, y: number, radius: number, col: number, dotted: boolean, phase: number) {
    const n = Math.max(24, Math.round(radius * cam.s * 5));
    for (let i = 0; i < n; i++) {
      if (dotted && (i + phase) % 3 === 0) continue;
      const a = (i / n) * Math.PI * 2;
      const [px, py] = project(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
      const xx = Math.round(px), yy = Math.round(py);
      if (xx >= 0 && xx < W && yy >= 0 && yy < H) buf[yy * W + xx] = col;
    }
  }
  const CLOUD = ['...wwww.....', '.wwwwwwww...', 'wwwwwwwwwww.', '.wwwwwwwwww.'];
  function drawOverlay(t: number, animated: boolean) {
    const s = cam.s;
    // routes being pointed at
    if (highlight.length) {
      const on = !animated || ((t / 320) | 0) % 2 === 0;
      for (const l of rail) if (highlight.includes(l.id)) {
        drawLine(l.p, pal.white, (s >= 0.07 ? 2 : 1) + 2, 0, undefined, true);
        drawLine(l.p, on ? pal.line[l.id] : pal.white, s >= 0.07 ? 2 : 1, 0, undefined, true);
      }
    }
    // areas that suit the chosen time of day pulse; the chosen area gets a solid ring
    for (const a of areas) {
      if (a.id === selected) { ring(a.x, a.y, 620, pal.ringSel, false, 0); ring(a.x, a.y, 640, pal.ringSel, false, 0); }
      else if (a.times.includes(mode)) ring(a.x, a.y, animated ? 380 + 90 * Math.sin(t / 420) : 420, pal.ring, true, animated ? (t / 160) | 0 : 0);
    }
    if (mark) { const r = animated ? 150 + 50 * Math.sin(t / 220) : 170; ring(mark.x, mark.y, r, pal.white, false, 0); ring(mark.x, mark.y, r + 22 / Math.max(cam.s * 100, 1), pal.ringSel, false, 0); }
    if (!animated) return;
    // water glints
    const tick = (t / 380) | 0;
    for (let i = 0; i < sparkles.length; i++) if (hash(i, tick, 5) % 23 === 0) buf[sparkles[i]] = pal.waterHi;
    // trains shuttle along their real lines (sped up)
    for (const tr of trains) {
      const period = tr.total / 55; // seconds end to end
      let f = ((t / 1000 / period + tr.offset) % 2); if (f > 1) f = 2 - f;
      for (let car = 0; car < 3; car++) {
        const d = clamp(f * tr.total - car * (2.2 / s), 0, tr.total);
        let k = 1; while (k < tr.cum.length - 1 && tr.cum[k] < d) k++;
        const seg = tr.cum[k] - tr.cum[k - 1] || 1, q = (d - tr.cum[k - 1]) / seg;
        const x = tr.p[k * 2 - 2] + (tr.p[k * 2] - tr.p[k * 2 - 2]) * q, y = tr.p[k * 2 - 1] + (tr.p[k * 2 + 1] - tr.p[k * 2 - 1]) * q;
        const [px, py] = project(x, y), e = s >= 0.07 ? 1 : 0;
        const col = car === 0 ? pal.white : pal.line[tr.id];
        for (let dy = -e; dy <= 1; dy++) for (let dx = -e; dx <= 1; dx++) {
          const xx = Math.round(px) + dx, yy = Math.round(py) + dy;
          if (xx >= 0 && xx < W && yy >= 0 && yy < H) buf[yy * W + xx] = col;
        }
      }
    }
    // lantern glow after dark
    if (mode === 'night') for (const m of landmarks) {
      if (!m.glow) continue;
      const [px, py] = project(m.x, m.y), rad = (s >= 0.085 ? 9 : 5) + (hash(m.x | 0, (t / 140) | 0, 7) % 2);
      for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
        const d = Math.abs(dx) + Math.abs(dy) * 1.4; if (d > rad) continue;
        const xx = Math.round(px) + dx, yy = Math.round(py) - 3 + dy;
        if (xx >= 0 && xx < W && yy >= 0 && yy < H) blend(yy * W + xx, pal.glow, 0.42 * (1 - d / rad));
      }
    }
    // a few drifting clouds on the wide view (kept off the map once you zoom in)
    if (pal.cloud && s < home.s * 1.4) for (let n = 0; n < 3; n++) {
      const cx = ((t / (260 + n * 70) + n * W * 0.41) % (W + 40)) - 20, cy = Math.round(H * (0.08 + n * 0.05));
      for (let r = 0; r < CLOUD.length; r++) for (let c = 0; c < CLOUD[r].length; c++) {
        if (CLOUD[r][c] === '.') continue;
        const xx = Math.round(cx) + c, yy = cy + r;
        if (xx >= 0 && xx < W && yy >= 0 && yy < H && rowBuf[yy * W + xx] < 0) buf[yy * W + xx] = pal.cloud;
      }
    }
  }

  // ---------------- text labels (sharp, drawn above the pixel layer) ----------------
  function drawLabels() {
    const s = cam.s, k = dpr, cw = labelCanvas.width / k, ch = labelCanvas.height / k;
    lctx.setTransform(k, 0, 0, k, 0, 0);
    lctx.clearRect(0, 0, cw, ch);
    if (!fontsReady) return;
    const taken: [number, number, number, number][] = reserved.slice();
    const free = (b: [number, number, number, number]) => b[0] >= 2 && b[2] <= cw - 2 && b[1] >= 2 && b[3] <= ch - 2 && !taken.some((t) => b[0] < t[2] && b[2] > t[0] && b[1] < t[3] && b[3] > t[1]);
    lctx.textBaseline = 'middle'; lctx.lineJoin = 'round';
    const put = (text: string, x: number, y: number, color: string, size: number, centred = false) => {
      lctx.font = `${size}px DotGothic16, sans-serif`;
      const w = lctx.measureText(text).width, h = size + 2;
      const tries: [number, number][] = centred ? [[x - w / 2, y]] : [[x + 6, y], [x - w - 6, y], [x - w / 2, y - h], [x - w / 2, y + h]];
      for (const [tx, ty] of tries) {
        const box: [number, number, number, number] = [tx - 2, ty - h / 2, tx + w + 2, ty + h / 2];
        if (!free(box)) continue;
        taken.push(box);
        lctx.strokeStyle = 'rgba(8,8,12,0.92)'; lctx.lineWidth = 3; lctx.strokeText(text, tx, ty);
        lctx.fillStyle = color; lctx.fillText(text, tx, ty);
        return;
      }
    };
    const on = (px: number, py: number) => px > 0 && px < W && py > 0 && py < H;
    for (const st of stations) if (st.hub) { const [px, py] = project(st.x, st.y); if (on(px, py)) put(st.n, px * cssScale, py * cssScale, '#ffffff', 11); }
    for (const m of landmarks) {
      if (m.detail || !(m.major ? s >= home.s * 1.6 : s >= 0.06)) continue;
      const [px, py] = project(m.x, m.y); if (on(px, py)) put(m.name, px * cssScale, (py - 6) * cssScale, '#ffcf5c', 11);
    }
    // the zoomed-in picks come after the main sights, so they never push a bigger name off the map
    if (s >= DETAIL_LABEL_S) for (const m of landmarks) {
      if (!m.detail) continue;
      const [px, py] = project(m.x, m.y); if (on(px, py)) put(m.name, px * cssScale, (py - 6) * cssScale, '#ffe3a1', 10);
    }
    if (s >= 0.06) for (const st of stations) if (!st.hub) { const [px, py] = project(st.x, st.y); if (on(px, py)) put(st.n, px * cssScale, py * cssScale, '#e6e6e6', 10); }
    if (s >= 0.055) for (const l of streetLabels) {
      // label each street where it crosses a fixed line of the view, so it stays put while you read
      const target = l.ew ? cam.x - (W * 0.3) / s : cam.y + (H * 0.28) / (s * TILT);
      for (let i = 2; i < l.p.length; i += 2) {
        const a = l.ew ? l.p[i - 2] : l.p[i - 1], b = l.ew ? l.p[i] : l.p[i + 1];
        if ((a - target) * (b - target) > 0 || a === b) continue;
        const f = (target - a) / (b - a);
        const [px, py] = project(l.p[i - 2] + (l.p[i] - l.p[i - 2]) * f, l.p[i - 1] + (l.p[i + 1] - l.p[i - 1]) * f);
        if (on(px, py)) put(l.n, px * cssScale, py * cssScale, '#cfe8ff', 10, true);
        break;
      }
    }
  }

  // ---------------- loop ----------------
  function frame(t: number) {
    raf = requestAnimationFrame(frame);
    if (tween) {
      const q = clamp((t - tween.t0) / tween.ms, 0, 1), e = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
      // zoom is eased in log space so it feels even
      cam.s = Math.exp(Math.log(tween.fs) + (Math.log(tween.ts) - Math.log(tween.fs)) * e);
      cam.x = tween.fx + (tween.tx - tween.fx) * e; cam.y = tween.fy + (tween.ty - tween.fy) * e;
      if (q >= 1) { tween = null; updateTouchAction(); }
      dirty = true;
    }
    paint(t);
  }
  function paint(t: number) {
    if (!W) return; // nothing to draw on until the first resize (a deep link can ask for an area before that)
    const redraw = dirty;
    if (dirty) { renderBase(); base.set(buf); drawLabels(); dirty = false; }
    if (redraw || (!opts.reducedMotion && t - lastAnim > 60)) {
      if (!redraw) buf.set(base);
      drawOverlay(t, !opts.reducedMotion);
      ctx.putImageData(img, 0, 0);
      lastAnim = t;
      if (redraw && ready) opts.onCamera?.();
    }
  }
  function start() { if (!running && visible && !document.hidden) { running = true; raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  function clampCam() {
    cam.s = clamp(cam.s, home.s, MAX_SCALE);
    if (cam.s <= home.s * 1.001) { cam.x = home.x; cam.y = home.y; }
    cam.x = clamp(cam.x, X0, X1); cam.y = clamp(cam.y, Y0, Y1);
  }
  function flyTo(x: number, y: number, s: number, ms = 750) {
    s = clamp(s, home.s, MAX_SCALE);
    const same = Math.abs(cam.x - x) < 1 && Math.abs(cam.y - y) < 1 && Math.abs(cam.s - s) < cam.s * 0.001;
    if (opts.reducedMotion || same) { cam.x = x; cam.y = y; cam.s = s; tween = null; updateTouchAction(); dirty = true; paint(performance.now()); return; }
    tween = { fx: cam.x, fy: cam.y, fs: cam.s, tx: x, ty: y, ts: s, t0: performance.now(), ms };
  }
  function zoomAt(factor: number, bx = W / 2, by = H / 2) {
    const wx = cam.x + (bx - W / 2) / cam.s, wy = cam.y - (by - H / 2) / (cam.s * TILT);
    cam.s = clamp(cam.s * factor, home.s, MAX_SCALE);
    cam.x = wx - (bx - W / 2) / cam.s; cam.y = wy + (by - H / 2) / (cam.s * TILT);
    tween = null; clampCam(); homeMode = cam.s <= home.s * 1.001; updateTouchAction(); dirty = true;
  }

  // ---------------- input: drag to move, pinch / ctrl+wheel to zoom ----------------
  const pointers = new Map<number, { x: number; y: number }>();
  let pinch = 0;
  const local = (e: PointerEvent | WheelEvent) => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / cssScale, y: (e.clientY - r.top) / cssScale }; };
  let downAt: { x: number; y: number } | null = null, moved = 0;
  const onDown = (e: PointerEvent) => { const p = local(e); pointers.set(e.pointerId, p); try { canvas.setPointerCapture(e.pointerId); } catch { /* not a live pointer */ } pinch = 0; downAt = pointers.size === 1 ? p : null; moved = 0; };
  const onMove = (e: PointerEvent) => {
    const prev = pointers.get(e.pointerId); if (!prev) return;
    const cur = local(e); pointers.set(e.pointerId, cur);
    moved += Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y);
    if (pointers.size === 1) {
      if (cam.s <= home.s * 1.02) return;
      cam.x -= (cur.x - prev.x) / cam.s; cam.y += (cur.y - prev.y) / (cam.s * TILT);
      tween = null; homeMode = false; clampCam(); dirty = true;
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) zoomAt(d / pinch, (a.x + b.x) / 2, (a.y + b.y) / 2);
      pinch = d;
    }
  };
  const onUp = (e: PointerEvent) => {
    pointers.delete(e.pointerId); pinch = 0;
    if (e.type === 'pointerup' && downAt && moved < 5) opts.onTap?.(pick(downAt.x, downAt.y));
    downAt = null;
  };
  /** What is drawn under a buffer pixel: the nearest visible landmark or station, if close enough. */
  function pick(bx: number, by: number): MapHit | null {
    const s = cam.s, k = s >= 0.085 ? 2 : 1;
    let best: MapHit | null = null, bd = Infinity;
    for (const m of landmarks) {
      if (!seen(m, s)) continue;
      const [px, py] = project(m.x, m.y), sp = sprites[m.sprite];
      const dx = Math.abs(bx - px), dy = Math.abs(by - (py - (sp.h * k) / 2));
      if (dx <= (sp.w * k) / 2 + 3 && dy <= (sp.h * k) / 2 + 3 && dx + dy < bd) { bd = dx + dy; best = { kind: 'landmark', id: m.id, name: m.name, lines: [], x: m.x, y: m.y }; }
    }
    for (const st of stations) {
      if (!st.hub && s < 0.05) continue;
      const [px, py] = project(st.x, st.y), d = Math.hypot(bx - px, by - py);
      if (d <= 7 && d < bd) { bd = d; best = { kind: 'station', id: st.n, name: st.n, lines: st.l.filter((l: string) => l !== 'shinkansen'), x: st.x, y: st.y }; }
    }
    return best;
  }
  const onWheel = (e: WheelEvent) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); const p = local(e); zoomAt(Math.exp(-e.deltaY * 0.01), p.x, p.y); };
  const onDbl = (e: MouseEvent) => { homeMode = false; const p = local(e as unknown as PointerEvent); const wx = cam.x + (p.x - W / 2) / cam.s, wy = cam.y - (p.y - H / 2) / (cam.s * TILT); flyTo(wx, wy, cam.s * 1.8, 400); };
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false }); canvas.addEventListener('dblclick', onDbl);

  const ro = new ResizeObserver(() => resize()); ro.observe(canvas);
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? start() : stop(); }); io.observe(canvas);
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVis);
  document.fonts?.ready.then(() => { fontsReady = true; dirty = true; });
  resize(); start();
  queueMicrotask(() => { ready = true; opts.onCamera?.(); });

  return {
    /** Fly to an area, or back to the whole city with null. */
    focusArea(id: string | null) {
      selected = id; dirty = true;
      const a = areas.find((x) => x.id === id);
      homeMode = !a;
      if (!a) return flyTo(home.x, home.y, home.s);
      flyTo(a.x, a.y - 150, W / (W < 320 ? 2600 : 3600));
    },
    setTime(m: TimeMode) { mode = m; pal = buildPalette(m); dirty = true; },
    setHighlight(ids: string[]) { highlight = ids; dirty = true; },
    /** Tell the map which boxes (CSS px) the page's pins cover; redraws only the text. */
    setReserved(boxes: [number, number, number, number][]) { reserved = boxes; drawLabels(); },
    /** Point at one spot (ring on the map) and bring it into view; null clears it. */
    pointAt(lat: number | null, lon?: number) {
      if (lat === null || lon === undefined) { mark = null; dirty = true; return; }
      const [x, y] = toXY(lon, lat); mark = { x, y }; homeMode = false; dirty = true;
      flyTo(x, y - 60, Math.max(cam.s, Math.min(MAX_SCALE, W / (W < 320 ? 1500 : 2200))), 600);
    },
    /** Position of a world point (metres, as given in a MapHit) in CSS pixels. */
    placeXY(x: number, y: number) { const [px, py] = project(x, y); return { x: px * cssScale, y: py * cssScale, inside: px >= 0 && px <= W && py >= 0 && py <= H }; },
    zoomBy(f: number) { const s = clamp(cam.s * f, home.s, MAX_SCALE); homeMode = s <= home.s * 1.001; homeMode ? flyTo(home.x, home.y, home.s, 300) : flyTo(cam.x, cam.y, s, 300); },
    isHome: atHome,
    /** Width of one kilometre (east-west) in CSS pixels, for the scale bar. */
    kmPx: () => 1000 * cam.s * cssScale,
    /** Position of a place in CSS pixels inside the map box. */
    place(lat: number, lon: number) {
      const [x, y] = toXY(lon, lat), [px, py] = project(x, y);
      return { x: px * cssScale, y: py * cssScale, inside: px >= 0 && px <= W && py >= 0 && py <= H };
    },
    /** Debug / verification helper: metres between two lat/lon points as the map sees them. */
    metres(a: [number, number], b: [number, number]) { const p = toXY(a[1], a[0]), q = toXY(b[1], b[0]); return Math.hypot(p[0] - q[0], p[1] - q[1]); },
    destroy() { stop(); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis); },
  };
}
