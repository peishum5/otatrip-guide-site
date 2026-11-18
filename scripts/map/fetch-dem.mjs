// One-off: download open elevation tiles (Terrarium PNG, AWS Open Data "Terrain Tiles")
// and sample them into a coarse height grid: scripts/map/.cache/dem.json
// Run by hand: node scripts/map/fetch-dem.mjs
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { BBOX, ORIGIN, toXY, CELL } from './config.mjs';

const Z = 12, N = 2 ** Z;
const lon2x = (lon) => ((lon + 180) / 360) * N;
const lat2y = (lat) => { const r = (lat * Math.PI) / 180; return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * N; };
const tiles = new Map();
async function tile(tx, ty) {
  const k = `${tx}/${ty}`;
  if (!tiles.has(k)) {
    const res = await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Z}/${tx}/${ty}.png`, { headers: { 'User-Agent': 'map-data-builder/1.0' } });
    if (!res.ok) throw new Error(`tile ${k} ${res.status}`);
    const { data, info } = await sharp(Buffer.from(await res.arrayBuffer())).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    tiles.set(k, { data, w: info.width });
    console.log('tile', k, info.width);
  }
  return tiles.get(k);
}
async function elev(lon, lat) {
  const fx = lon2x(lon), fy = lat2y(lat);
  const t = await tile(Math.floor(fx), Math.floor(fy));
  const px = Math.min(t.w - 1, Math.floor((fx % 1) * t.w)), py = Math.min(t.w - 1, Math.floor((fy % 1) * t.w));
  const i = (py * t.w + px) * 3;
  return t.data[i] * 256 + t.data[i + 1] + t.data[i + 2] / 256 - 32768;
}
const [x0, y0] = toXY(BBOX.w, BBOX.s), [x1, y1] = toXY(BBOX.e, BBOX.n);
const cols = Math.floor((x1 - x0) / CELL), rows = Math.floor((y1 - y0) / CELL);
const KX = Math.cos((ORIGIN.lat * Math.PI) / 180) * 111320, KY = 110950;
const h = [];
for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
  const x = x0 + (c + 0.5) * CELL, y = y0 + (r + 0.5) * CELL;
  h.push(Math.round(await elev(ORIGIN.lon + x / KX, ORIGIN.lat + y / KY)));
}
await writeFile(new URL('./.cache/dem.json', import.meta.url), JSON.stringify({ x0, y0, cols, rows, cell: CELL, h }));
console.log(cols, rows, 'min', Math.min(...h), 'max', Math.max(...h));
