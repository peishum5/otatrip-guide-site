// Shared by the map data scripts. Covers Arashiyama (W) to Higashiyama (E),
// Kinkaku-ji / Shimogamo (N) to Fushimi Inari (S).
export const BBOX = { s: 34.955, w: 135.655, n: 35.06, e: 135.805 };
// Local flat projection, metres from ORIGIN (x east, y north).
export const ORIGIN = { lat: 35.0075, lon: 135.73 };
const KX = Math.cos((ORIGIN.lat * Math.PI) / 180) * 111320;
const KY = 110950;
export const toXY = (lon, lat) => [Math.round((lon - ORIGIN.lon) * KX), Math.round((lat - ORIGIN.lat) * KY)];
export const CELL = 100; // metres per height-grid cell
