// One-off: look up landmark coordinates in OpenStreetMap by name (so they are not typed by hand).
// Run by hand: node scripts/map/fetch-pois.mjs  -> scripts/map/.cache/pois.json
import { writeFile } from 'node:fs/promises';
import { BBOX } from './config.mjs';
const NAMES = ['鹿苑寺', '金閣寺', '清水寺', '伏見稲荷大社', '二条城', '元離宮二条城', '京都御所', '賀茂御祖神社', '下鴨神社', '天龍寺', '渡月橋',
  '京都タワー', '錦市場', '八坂神社', '法観寺', '八坂の塔', '慈照寺', '銀閣寺', '平安神宮', '東寺', '教王護国寺', '東福寺', '龍安寺', '北野天満宮',
  '南禅寺', '三十三間堂', '蓮華王院', '竹林の小径', '先斗町', '先斗町通', '花見小路通', '野宮神社', '京都国際マンガミュージアム', '安井金比羅宮',
  '糺の森', '出町桝形商店街', '錦小路通', '仁和寺', '千本鳥居', '嵐山公園', '円山公園', '京都駅', '南座'];
const b = `${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e}`;
const re = `^(${NAMES.join('|')})$`;
const body = `[out:json][timeout:90];nwr[name~"${re}"](${b});out tags center;`;
for (const host of ['https://overpass.kumi.systems', 'https://overpass-api.de']) {
  const res = await fetch(`${host}/api/interpreter`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'map-data-builder/1.0' }, body: 'data=' + encodeURIComponent(body) });
  if (!res.ok) { console.error(host, res.status); continue; }
  const j = await res.json();
  await writeFile(new URL('./.cache/pois.json', import.meta.url), JSON.stringify(j));
  for (const e of j.elements) {
    const c = e.center || e; const t = e.tags;
    console.log([t.name, e.type, (c.lat ?? 0).toFixed(5), (c.lon ?? 0).toFixed(5), t.tourism || t.amenity || t.historic || t.highway || t.leisure || t.natural || t.railway || t.man_made || t.building || ''].join('\t'));
  }
  break;
}
