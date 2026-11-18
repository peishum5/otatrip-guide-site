// One-off: download raw OpenStreetMap data for central Kyoto into scripts/map/.cache.
// Run by hand: node scripts/map/fetch-osm.mjs   (then: node scripts/map/build-geo.mjs)
// Only the map bounding box is sent. Data © OpenStreetMap contributors (ODbL).
import { writeFile, mkdir } from 'node:fs/promises';
import { BBOX } from './config.mjs';

const b = `${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e}`;
const QUERIES = {
  rail: `way[railway~"^(rail|subway|light_rail|tram)$"][!service](${b});`,
  stations: `node[railway~"^(station|halt|tram_stop)$"](${b});`,
  rivers: `way[waterway~"^(river|canal)$"](${b});`,
  roads: `way[highway~"^(trunk|primary|secondary|tertiary)$"](${b});`,
  green: `(way[leisure=park](${b});relation[leisure=park](${b});way[natural=wood](${b});relation[natural=wood](${b});way[landuse=forest](${b});relation[landuse=forest](${b}););`,
  water: `(way[natural=water](${b});relation[natural=water](${b}););`,
};
const dir = new URL('./.cache/', import.meta.url);
await mkdir(dir, { recursive: true });
for (const [name, q] of Object.entries(QUERIES)) {
  const body = `[out:json][timeout:120];${q}out tags geom;`;
  let ok = false;
  for (const host of ['https://overpass-api.de', 'https://overpass.kumi.systems']) {
    const res = await fetch(`${host}/api/interpreter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'map-data-builder/1.0' },
      body: 'data=' + encodeURIComponent(body),
    });
    if (!res.ok) { console.error(name, host, res.status); continue; }
    const text = await res.text();
    await writeFile(new URL(`${name}.json`, dir), text);
    console.log(name, (text.length / 1024).toFixed(0) + 'KB', JSON.parse(text).elements.length, 'elements');
    ok = true; break;
  }
  if (!ok) process.exitCode = 1;
  await new Promise((r) => setTimeout(r, 3000));
}
