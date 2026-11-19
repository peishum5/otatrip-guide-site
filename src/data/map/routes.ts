/**
 * How to get between the areas on the Kyoto map (/map).
 *
 * Every row names where it came from:
 *  - an article id  = the route and time are written in that article (checked against official sources)
 *  - 'map'          = the route follows from the rail lines and stations in the map data itself;
 *                     no travel time is given for these because none has been checked.
 * Do not add travel times from memory. Fares are left out on purpose (they change).
 */
export interface Route {
  /** Area ids from src/data/areas.ts. A route works in both directions. */
  a: string;
  b: string;
  how: string;
  time?: string;
  /** Line ids from src/scripts/kyoto-map/engine.ts LINES, lit up on the map. Empty for bus / walking / taxi. */
  lines: string[];
  source: string;
}

export const ROUTES: Route[] = [
  // --- from Kyoto Station ---
  { a: 'kyoto-station', b: 'fushimi-inari', how: 'JR Nara Line, 2 stops to Inari. The shrine is across the street', time: '5 min', lines: ['jr-nara'], source: 'plan/kyoto-station-guide' },
  { a: 'kyoto-station', b: 'arashiyama', how: 'JR Sagano Line to Saga-Arashiyama', time: '15 min', lines: ['jr-sagano'], source: 'plan/kyoto-station-guide' },
  { a: 'kyoto-station', b: 'downtown', how: 'Karasuma subway line, 2 stops to Shijo', time: '5 min', lines: ['subway-karasuma'], source: 'plan/kyoto-station-guide' },
  { a: 'kyoto-station', b: 'gion', how: 'Bus 206 (stand D2 at Kyoto Station) to the Gion stop', time: 'about 20 min', lines: [], source: 'plan/kyoto-station-guide' },
  { a: 'kyoto-station', b: 'gion', how: 'Karasuma subway to Shijo, Hankyu one stop to Kyoto-Kawaramachi, then 10 min on foot across the river', lines: ['subway-karasuma', 'hankyu'], source: 'plan/kyoto-station-guide' },
  { a: 'kyoto-station', b: 'higashiyama', how: 'Bus 206 (stand D2 at Kyoto Station) to Gojo-zaka, then 10 min uphill on foot', time: 'about 25 min', lines: [], source: 'plan/kyoto-station-guide' },
  { a: 'kyoto-station', b: 'kinkakuji', how: 'Karasuma subway to Kitaoji (13 min), then bus 204 or 205 to Kinkakuji-michi (11 min)', time: 'about 25 min', lines: ['subway-karasuma'], source: 'plan/kyoto-station-guide' },
  { a: 'kyoto-station', b: 'kinkakuji', how: 'Bus 205 (stand B3 at Kyoto Station), no change. Not the Rapid 205, which skips Kinkakuji', time: 'about 40 min', lines: [], source: 'plan/transport-kyoto' },
  { a: 'kyoto-station', b: 'nijo', how: 'Karasuma subway to Karasuma Oike, change to the Tozai Line for Nijojo-mae', lines: ['subway-karasuma', 'subway-tozai'], source: 'map' },
  { a: 'kyoto-station', b: 'nijo', how: 'City Bus 9 or 50 to Nijo-jo-mae', time: 'about 20 min', lines: [], source: 'sights/nijo-castle' },
  { a: 'kyoto-station', b: 'shimogamo', how: 'JR Nara Line one stop to Tofukuji, change to the Keihan Line and ride north to Demachiyanagi, the last stop', lines: ['jr-nara', 'keihan'], source: 'map' },
  // --- between areas ---
  { a: 'gion', b: 'higashiyama', how: 'On foot. Yasaka Shrine, at the edge of Gion, is the north end of the Higashiyama walk', lines: [], source: 'neighborhoods/higashiyama' },
  { a: 'gion', b: 'downtown', how: 'On foot, west across the Kamo River', time: '10–15 min', lines: [], source: 'neighborhoods/gion' },
  { a: 'gion', b: 'fushimi-inari', how: 'Keihan Line between Gion-Shijo and Fushimi-Inari, then a 5-minute walk to the shrine', time: '10 min', lines: ['keihan'], source: 'plan/transport-kyoto' },
  { a: 'gion', b: 'arashiyama', how: 'Hankyu between Kyoto-Kawaramachi and Arashiyama (change at Katsura)', time: '35–40 min', lines: ['hankyu'], source: 'plan/transport-kyoto' },
  { a: 'gion', b: 'nijo', how: 'Tozai subway line between Higashiyama Station and Nijojo-mae, plus 10 min on foot on the Gion side', time: '20 min', lines: ['subway-tozai'], source: 'plan/transport-kyoto' },
  { a: 'gion', b: 'shimogamo', how: 'Keihan Line between Gion-Shijo and Demachiyanagi, the last stop going north', lines: ['keihan'], source: 'map' },
  { a: 'higashiyama', b: 'fushimi-inari', how: 'Taxi from Inari, or Bus 207 from Tofukuji', lines: [], source: 'itineraries/kyoto-1-day' },
  { a: 'arashiyama', b: 'kinkakuji', how: 'JR between Saga-Arashiyama and Emmachi, then bus 204 or 205 to Kinkakuji-michi. Or a taxi', time: '40–50 min', lines: ['jr-sagano'], source: 'itineraries/kyoto-2-days' },
  { a: 'fushimi-inari', b: 'shimogamo', how: 'Keihan Line between Fushimi-Inari and Demachiyanagi, no change', lines: ['keihan'], source: 'map' },
  { a: 'downtown', b: 'nijo', how: 'Tozai subway line between Karasuma Oike and Nijojo-mae, one stop', lines: ['subway-tozai'], source: 'map' },
];
