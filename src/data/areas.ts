/**
 * Areas shown on the Kyoto map (/map).
 *
 * Wording rule: every fact here is taken from an article already on this site
 * (those were checked against official sources) or from src/data/tours.ts.
 * Do not add new facts here without checking them. Prices are left out on
 * purpose (they change); link to the article instead.
 *
 * Positions are real latitude/longitude, looked up in OpenStreetMap
 * (scripts/map/fetch-pois.mjs).
 */
import type { SpriteId } from '../scripts/kyoto-map/sprites';

export type TimeMode = 'morning' | 'day' | 'night';

export interface Route {
  from: string;
  how: string;
  time?: string;
  /** Line ids from src/scripts/kyoto-map/engine.ts LINES, lit up on the map. Empty for bus / walking. */
  lines: string[];
  /** Article the route was taken from. */
  source: string;
}

export interface Area {
  id: string;
  name: string;
  tagline: string;
  lat: number;
  lon: number;
  /** Times of day the area is at its best (drives the pulsing rings). */
  times: TimeMode[];
  bestTime: string;
  timeNeeded?: string;
  stations: string;
  /** "How to enjoy it": three or four short lines. */
  enjoy: string[];
  routes: Route[];
  /** Blog entry ids (src/content/blog/<id>.mdx); the first one supplies the photo. */
  articles: string[];
  /** Tour ids from src/data/tours.ts. */
  tours: string[];
  /** Search text for the "Open in Google Maps" link. */
  mapsQuery: string;
}

export const AREAS: Area[] = [
  {
    id: 'gion',
    name: 'Gion',
    tagline: 'Lantern-lit teahouse streets. Best after 5pm.',
    lat: 35.0030, lon: 135.7752,
    times: ['night'],
    bestTime: 'Weekday evenings, 5pm–8pm',
    timeNeeded: '1–2 hours on foot',
    stations: 'Gion-Shijo (Keihan), Kyoto-Kawaramachi (Hankyu)',
    enjoy: [
      'Walk four streets: Hanamikoji, the Shirakawa canal at Shimbashi, Ishibei-koji and Nene-no-michi.',
      'Come in the evening. The lanterns are lit and the midday tour groups have gone.',
      'Seeing a maiko is luck. Never block, follow or photograph them, and stay out of private alleys.',
      'Pontocho, one block west across the river, has restaurants at every price.',
    ],
    routes: [
      { from: 'Kyoto Station', how: 'Bus 206 from stand D2', lines: [], source: 'plan/kyoto-station-guide' },
      { from: 'Fushimi Inari', how: 'Keihan Line from Fushimi-Inari to Gion-Shijo', time: '10 min', lines: ['keihan'], source: 'plan/transport-kyoto' },
      { from: 'Arashiyama', how: 'Hankyu from Arashiyama to Kyoto-Kawaramachi (change at Katsura), then walk', time: '35–40 min', lines: ['hankyu'], source: 'plan/transport-kyoto' },
      { from: 'Nijo Castle', how: 'Tozai subway line to Higashiyama, then 10 min on foot', time: '20 min', lines: ['subway-tozai'], source: 'plan/transport-kyoto' },
    ],
    articles: ['neighborhoods/gion', 'culture/maiko-geisha', 'itineraries/kyoto-at-night'],
    tours: ['gion-sake-walk'],
    mapsQuery: 'Hanamikoji Street Kyoto',
  },
  {
    id: 'higashiyama',
    name: 'Higashiyama & Kiyomizu',
    tagline: 'Stone lanes from Kiyomizudera down to Yasaka Shrine.',
    lat: 34.9965, lon: 135.7815,
    times: ['morning'],
    bestTime: '9–11am on weekdays, or late afternoon',
    timeNeeded: '2–3 hours',
    stations: 'Bus stop Gojo-zaka or Kiyomizu-michi. The walk ends near Gion-Shijo (Keihan)',
    enjoy: [
      'Start at Kiyomizudera and walk downhill: about 3 km to Yasaka Shrine.',
      'Kiyomizudera is quietest from 6 to 8am, before the tour groups.',
      'Take Sannenzaka and Ninenzaka on foot. No bus goes where the good lanes are.',
      'The walk ends beside Gion, so it pairs well with an evening there.',
    ],
    routes: [
      { from: 'Kyoto Station', how: 'Bus 206 from stand D2 to Gojozaka, then 10 min uphill on foot', time: '20–30 min', lines: [], source: 'plan/transport-kyoto' },
    ],
    articles: ['neighborhoods/higashiyama', 'sights/kiyomizudera', 'culture/kimono-rental'],
    tours: ['gion-sake-walk'],
    mapsQuery: 'Kiyomizudera Kyoto',
  },
  {
    id: 'downtown',
    name: 'Downtown: Kawaramachi, Nishiki & Pontocho',
    tagline: 'Market snacks by day, izakaya alleys by night.',
    lat: 35.0050, lon: 135.7672,
    times: ['day', 'night'],
    bestTime: 'Nishiki Market on weekday mornings before 11am; Pontocho after dark',
    timeNeeded: '60–90 min for the market',
    stations: 'Karasuma or Kyoto-Kawaramachi (Hankyu), Shijo (subway)',
    enjoy: [
      'Graze through Nishiki Market in the morning, before it fills up.',
      'Walk Pontocho once to read the menus, then choose. Book ahead on weekends.',
      'Three of our hands-on experiences start here: coffee, matcha and izakaya hopping.',
    ],
    routes: [
      { from: 'Kyoto Station', how: 'Karasuma subway line north to Shijo', lines: ['subway-karasuma'], source: 'food/nishiki-market' },
    ],
    articles: ['food/nishiki-market', 'food/izakaya-etiquette', 'food/what-to-eat-kyoto'],
    tours: ['izakaya-hopping', 'coffee-ceremony', 'tea-ceremony'],
    mapsQuery: 'Nishiki Market Kyoto',
  },
  {
    id: 'kyoto-station',
    name: 'Kyoto Station',
    tagline: 'Where you arrive, and where most buses and trains start.',
    lat: 34.9858, lon: 135.7588,
    times: ['day'],
    bestTime: 'Any time. Avoid buses 8:00–9:30am and 5:00–7:00pm',
    stations: 'Kyoto (JR, Kintetsu, subway Karasuma Line)',
    enjoy: [
      'The main exit is Karasuma, on the north side.',
      'Bus 206 leaves from stand D2 for Gion and Kiyomizudera; bus 205 from stand B3 for Kinkakuji.',
      'Trains are faster than buses for Fushimi Inari and Arashiyama.',
      'Coin lockers fill by 10am in peak season. Crosta Kyoto on the B1 floor is the staffed backup.',
    ],
    routes: [],
    articles: ['plan/kyoto-station-guide', 'plan/transport-kyoto', 'plan/kyoto-luggage-storage'],
    tours: [],
    mapsQuery: 'Kyoto Station',
  },
  {
    id: 'fushimi-inari',
    name: 'Fushimi Inari',
    tagline: 'Thousands of red gates up a forested mountain.',
    lat: 34.9672, lon: 135.7735,
    times: ['morning', 'night'],
    bestTime: 'Before 8am or after 5pm',
    timeNeeded: '30–40 min up to the Yotsutsuji viewpoint; 2–3 hours for the full loop',
    stations: 'Inari (JR Nara Line), Fushimi-Inari (Keihan)',
    enjoy: [
      'Free and open 24 hours, so go early or late and skip the 9am–4pm crowds.',
      'Climb at least to the Yotsutsuji viewpoint, 30–40 minutes uphill.',
      'The full loop to the summit is 4 km.',
      'On Keihan, get off at Fushimi-Inari, not Fushimi-Momoyama.',
    ],
    routes: [
      { from: 'Kyoto Station', how: 'JR Nara Line to Inari. The gate is across the street', time: '5 min', lines: ['jr-nara'], source: 'plan/transport-kyoto' },
      { from: 'Gion', how: 'Keihan Line from Gion-Shijo to Fushimi-Inari', time: '10 min', lines: ['keihan'], source: 'plan/transport-kyoto' },
    ],
    articles: ['sights/fushimi-inari', 'food/sake-kyoto'],
    tours: [],
    mapsQuery: 'Fushimi Inari Taisha Kyoto',
  },
  {
    id: 'arashiyama',
    name: 'Arashiyama',
    tagline: 'Bamboo grove, a great temple garden and a quiet river.',
    lat: 35.0150, lon: 135.6760,
    times: ['morning'],
    bestTime: 'Weekday mornings, before 9am',
    timeNeeded: 'Half a day (3–4 hours)',
    stations: 'Saga-Arashiyama (JR), Arashiyama (Randen tram / Hankyu)',
    enjoy: [
      'Do the bamboo grove first. Before 8am it is nearly empty.',
      'Do not skip the Tenryu-ji garden, then walk down to Togetsukyo Bridge.',
      'Add one detour: mossy Jojakko-ji, 5 minutes uphill from the grove.',
      'Eat one block back from the bridge. The places facing it are overpriced.',
    ],
    routes: [
      { from: 'Kyoto Station', how: 'JR Sagano Line to Saga-Arashiyama', time: '15 min', lines: ['jr-sagano'], source: 'plan/transport-kyoto' },
      { from: 'Gion', how: 'Walk to Hankyu Kyoto-Kawaramachi, then Hankyu to Arashiyama (change at Katsura)', time: '35–40 min', lines: ['hankyu'], source: 'plan/transport-kyoto' },
    ],
    articles: ['neighborhoods/arashiyama', 'sights/arashiyama-bamboo'],
    tours: [],
    mapsQuery: 'Arashiyama Bamboo Grove Kyoto',
  },
  {
    id: 'kinkakuji',
    name: 'Kinkaku-ji & the North-West',
    tagline: 'The Golden Pavilion, mirrored in its pond.',
    lat: 35.0396, lon: 135.7295,
    times: ['morning', 'day'],
    bestTime: 'At the 9am opening, or on an overcast day',
    timeNeeded: '30–40 min',
    stations: 'No station at the gate. Bus or taxi',
    enjoy: [
      'Go at the 9am opening or on an overcast day.',
      'The visit itself takes 30–40 minutes.',
      'No train runs here. A taxi is worth it for a group or a tight schedule.',
    ],
    routes: [
      { from: 'Kyoto Station', how: 'Bus 205 from stand B3 to Kinkakuji-michi (not the Rapid 205, which skips it), or a taxi', time: '40 min', lines: [], source: 'plan/transport-kyoto' },
    ],
    articles: ['sights/kinkakuji'],
    tours: [],
    mapsQuery: 'Kinkaku-ji Kyoto',
  },
  {
    id: 'nijo',
    name: 'Nijo Castle & the Imperial Palace',
    tagline: 'The shogun\'s castle in the middle of the city grid.',
    lat: 35.0142, lon: 135.7485,
    times: ['day'],
    bestTime: 'Weekday mornings',
    timeNeeded: '2–2.5 hours',
    stations: 'Nijojo-mae (subway Tozai Line), 1 min walk',
    enjoy: [
      'Allow 2–2.5 hours for the castle and its gardens.',
      'The palace building is closed on Tuesdays in January, July, August and December.',
      'The subway stops at the gate: Nijojo-mae on the Tozai Line is a 1-minute walk.',
    ],
    routes: [
      { from: 'Kyoto Station', how: 'Karasuma subway line to Karasuma Oike, change to the Tozai Line for Nijojo-mae', lines: ['subway-karasuma', 'subway-tozai'], source: 'sights/nijo-castle' },
      { from: 'Gion', how: '10 min on foot to Higashiyama Station, then the Tozai subway line', time: '20 min', lines: ['subway-tozai'], source: 'plan/transport-kyoto' },
    ],
    articles: ['sights/nijo-castle'],
    tours: [],
    mapsQuery: 'Nijo Castle Kyoto',
  },
  {
    id: 'shimogamo',
    name: 'Shimogamo & the Kamo River',
    tagline: 'A World Heritage shrine inside an ancient forest.',
    lat: 35.0368, lon: 135.7727,
    times: ['morning', 'day'],
    bestTime: 'Morning or afternoon',
    stations: 'Demachiyanagi (Keihan, Eizan)',
    enjoy: [
      'Walk through the Tadasu-no-Mori forest to Shimogamo Shrine.',
      'Cross the stepping stones at the Kamogawa Delta, where two rivers meet.',
      'Browse Demachi Masugata Shopping Street, a local covered arcade.',
    ],
    routes: [],
    articles: [],
    tours: ['shimogamo-manga-walk'],
    mapsQuery: 'Shimogamo Shrine Kyoto',
  },
];

export interface LandmarkDef { id: string; name: string; lat: number; lon: number; sprite: SpriteId; major?: boolean; glow?: boolean }

/** Landmark icons. Coordinates from OpenStreetMap. */
export const LANDMARKS: LandmarkDef[] = [
  { id: 'kinkakuji', name: 'Kinkaku-ji', lat: 35.03959, lon: 135.72951, sprite: 'kinkaku', major: true },
  { id: 'kiyomizu', name: 'Kiyomizudera', lat: 34.99442, lon: 135.78448, sprite: 'kiyomizu', major: true },
  { id: 'yasaka-pagoda', name: 'Yasaka Pagoda', lat: 34.99856, lon: 135.77925, sprite: 'pagoda', major: true },
  { id: 'yasaka-shrine', name: 'Yasaka Shrine', lat: 35.00349, lon: 135.77839, sprite: 'shrine' },
  { id: 'hanamikoji', name: 'Hanamikoji', lat: 35.0026, lon: 135.7752, sprite: 'machiya', major: true, glow: true },
  { id: 'pontocho', name: 'Pontocho', lat: 35.00598, lon: 135.77107, sprite: 'lantern', glow: true },
  { id: 'nishiki', name: 'Nishiki Market', lat: 35.00503, lon: 135.76471, sprite: 'market', major: true },
  { id: 'kyoto-tower', name: 'Kyoto Tower', lat: 34.98756, lon: 135.75933, sprite: 'tower', major: true },
  { id: 'fushimi-inari', name: 'Fushimi Inari', lat: 34.96724, lon: 135.77299, sprite: 'toriis', major: true },
  { id: 'nijo-castle', name: 'Nijo Castle', lat: 35.01396, lon: 135.74851, sprite: 'castle', major: true },
  { id: 'imperial-palace', name: 'Imperial Palace', lat: 35.02526, lon: 135.76235, sprite: 'palace' },
  { id: 'shimogamo', name: 'Shimogamo Shrine', lat: 35.0390, lon: 135.7730, sprite: 'shrine', major: true },
  { id: 'bamboo', name: 'Bamboo Grove', lat: 35.0171, lon: 135.6722, sprite: 'bamboo', major: true },
  { id: 'tenryuji', name: 'Tenryu-ji', lat: 35.01617, lon: 135.67462, sprite: 'temple' },
  { id: 'togetsukyo', name: 'Togetsukyo Bridge', lat: 35.01287, lon: 135.67776, sprite: 'bridge', major: true },
  { id: 'ginkakuji', name: 'Ginkaku-ji', lat: 35.02691, lon: 135.79843, sprite: 'temple' },
  { id: 'heian', name: 'Heian Shrine', lat: 35.01617, lon: 135.7829, sprite: 'torii' },
  { id: 'nanzenji', name: 'Nanzen-ji', lat: 35.01162, lon: 135.79268, sprite: 'temple' },
  { id: 'sanjusangendo', name: 'Sanjusangen-do', lat: 34.98799, lon: 135.77178, sprite: 'hall' },
  { id: 'tofukuji', name: 'Tofuku-ji', lat: 34.97717, lon: 135.77528, sprite: 'temple' },
  { id: 'toji', name: 'To-ji', lat: 34.98119, lon: 135.74771, sprite: 'pagoda' },
  { id: 'kitano', name: 'Kitano Tenmangu', lat: 35.03024, lon: 135.73487, sprite: 'shrine' },
  { id: 'ryoanji', name: 'Ryoan-ji', lat: 35.03349, lon: 135.71806, sprite: 'temple' },
  { id: 'ninnaji', name: 'Ninna-ji', lat: 35.02975, lon: 135.71403, sprite: 'pagoda' },
];

/** Stations labelled on the full-city view (names as in kyoto-geo.json). */
export const HUB_STATIONS = ['Kyoto', 'Kyoto Kawaramachi', 'Gion-shijo', 'Saga-Arashiyama', 'Inari', 'Nijojo-mae', 'Demachiyanagi', 'Karasuma Oike'];
