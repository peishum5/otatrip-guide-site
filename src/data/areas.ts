/**
 * Areas shown on the Kyoto map (/map).
 *
 * Wording rule: every fact here is taken from an article already on this site
 * (those were checked against official sources) or from src/data/tours.ts.
 * Do not add new facts here without checking them. Prices are left out on
 * purpose (they change); link to the article instead.
 *
 * Routes between areas live in src/data/map/routes.ts.
 *
 * Positions are real latitude/longitude, looked up in OpenStreetMap
 * (scripts/map/fetch-pois.mjs).
 */
import type { SpriteId } from '../scripts/kyoto-map/sprites';

export type TimeMode = 'morning' | 'day' | 'night';

export interface Area {
  id: string;
  name: string;
  /** Short name for the pin on the map. */
  short: string;
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
  /** Named places inside the area, each with one line from the articles. */
  spots: { name: string; note: string; at?: string }[];
  /** Photos already published on this site (public/images/...). */
  photos: { src: string; label: string }[];
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
    short: 'Gion',
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
    spots: [
      { name: 'Hanamikoji', note: 'The classic row of ochaya, the private teahouses where geisha entertain. Walk the part south of Shijo Street.', at: 'hanamikoji' },
      { name: 'Shirakawa canal at Shimbashi', note: 'A stone lane beside the water under willow trees. Quieter than Hanamikoji.' },
      { name: 'Ishibei-koji', note: 'A short stone-paved lane between high walls. Photography is banned here.' },
      { name: 'Nene-no-michi', note: 'The stone path behind Kodaiji Temple that links Gion to the Higashiyama walk.' },
    ],
    photos: [
      { src: '/images/blog/inline/gion-maiko-street.jpg', label: 'Hanamikoji at dusk' },
      { src: '/images/blog/inline/gion-shimbashi.jpg', label: 'Shimbashi' },
      { src: '/images/blog/inline/pontocho-night.jpg', label: 'Pontocho' },
    ],
    articles: ['neighborhoods/gion', 'culture/maiko-geisha', 'itineraries/kyoto-at-night'],
    tours: ['gion-sake-walk'],
    mapsQuery: 'Hanamikoji Street Kyoto',
  },
  {
    id: 'higashiyama',
    short: 'Higashiyama',
    name: 'Higashiyama & Kiyomizu',
    tagline: 'Stone lanes from Kiyomizudera down to Yasaka Shrine.',
    lat: 34.9965, lon: 135.7815,
    times: ['morning'],
    bestTime: '9–11am on weekdays, or late afternoon',
    timeNeeded: '2–3 hours',
    stations: 'Bus stop Gojo-zaka or Kiyomizu-michi. The walk ends near Gion-Shijo (Keihan)',
    enjoy: [
      'Walk south to north: start at Kiyomizudera and finish at Yasaka Shrine, about 3 km.',
      'Wear flat rubber soles. The stone slopes are steep and slippery when wet.',
      'Kiyomizudera is quietest from 6 to 8am, before the tour groups.',
      'Take Sannenzaka and Ninenzaka on foot. No bus goes where the good lanes are.',
      'The walk ends beside Gion, so it pairs well with an evening there.',
    ],
    spots: [
      { name: 'Kiyomizudera', note: 'The hilltop temple with the famous wooden stage. Allow 60–75 minutes.', at: 'kiyomizu' },
      { name: 'Sannenzaka', note: 'A steep stone slope lined with old shopfronts. Take it slowly.' },
      { name: 'Ninenzaka', note: 'A shorter, gentler slope with ceramics, matcha and sweets.' },
      { name: 'Kodaiji', note: 'Founded in 1606. Its evening garden light-ups in spring and autumn are among Kyoto\'s best.' },
      { name: 'Maruyama Park & Yasaka Shrine', note: 'Both free and always open. The shrine gate opens straight onto Shijo Avenue and Gion.', at: 'yasaka-shrine' },
    ],
    photos: [
      { src: '/images/blog/inline/kiyomizudera-stage-view.jpg', label: 'Kiyomizudera' },
      { src: '/images/blog/inline/higashiyama-sannenzaka-morning.jpg', label: 'Sannenzaka' },
      { src: '/images/blog/inline/higashiyama-ninenzaka-shops.jpg', label: 'Ninenzaka' },
    ],
    articles: ['neighborhoods/higashiyama', 'sights/kiyomizudera', 'culture/kimono-rental'],
    tours: ['gion-sake-walk'],
    mapsQuery: 'Kiyomizudera Kyoto',
  },
  {
    id: 'downtown',
    short: 'Downtown',
    name: 'Downtown: Kawaramachi, Nishiki & Pontocho',
    tagline: 'Market snacks by day, izakaya alleys by night.',
    lat: 35.0050, lon: 135.7672,
    times: ['day', 'night'],
    bestTime: 'Nishiki Market on weekday mornings before 11am; Pontocho after dark',
    timeNeeded: '60–90 min for the market',
    stations: 'Karasuma or Kyoto-Kawaramachi (Hankyu), Shijo (subway)',
    enjoy: [
      'Snack through Nishiki Market before 11am on a weekday, and eat lunch elsewhere.',
      'Eat at the stall where you bought the food, not while walking.',
      'Walk Pontocho once to read the menus, then choose. Book ahead on weekends.',
      'Three of our hands-on experiences start here: coffee, matcha and izakaya hopping.',
    ],
    spots: [
      { name: 'Nishiki Market', note: 'A covered food arcade. Best buys: pickles, fresh tofu, tamagoyaki and warabi-mochi. Start at the western half.', at: 'nishiki' },
      { name: 'Teramachi arcade', note: 'A covered shopping street with fans, washi paper, tea and bookshops, 5 minutes on foot from Nishiki.' },
      { name: 'Pontocho', note: 'A narrow alley of restaurants at every price, one block from the Kamo River.', at: 'pontocho' },
    ],
    photos: [
      { src: '/images/blog/inline/nishiki-market-arcade.jpg', label: 'Nishiki Market' },
      { src: '/images/blog/inline/nishiki-tamagoyaki-skewer.jpg', label: 'Tamagoyaki' },
      { src: '/images/blog/inline/pontocho-night.jpg', label: 'Pontocho' },
    ],
    articles: ['food/nishiki-market', 'food/izakaya-etiquette', 'food/what-to-eat-kyoto'],
    tours: ['izakaya-hopping', 'coffee-ceremony', 'tea-ceremony'],
    mapsQuery: 'Nishiki Market Kyoto',
  },
  {
    id: 'kyoto-station',
    short: 'Kyoto Stn',
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
    spots: [
      { name: 'Karasuma exit (north)', note: 'The side for almost everything: the bus terminal, the subway, taxis and the city centre.' },
      { name: 'Hachijo exit (south)', note: 'For the Kintetsu line to Nara and the airport limousine bus. Crossing between the two exits takes 10–15 minutes with luggage.' },
      { name: 'To-ji', note: 'The temple with the five-story pagoda, within walking distance of the station.', at: 'toji' },
    ],
    photos: [
      { src: '/images/blog/inline/kyoto-station-concourse.jpg', label: 'The concourse' },
      { src: '/images/blog/inline/kyoto-station-arrival.jpg', label: 'Arriving' },
    ],
    articles: ['plan/kyoto-station-guide', 'plan/transport-kyoto', 'plan/kyoto-luggage-storage'],
    tours: [],
    mapsQuery: 'Kyoto Station',
  },
  {
    id: 'fushimi-inari',
    short: 'Fushimi Inari',
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
      'The full loop to the summit is 4 km of uneven stone steps. Wear walking shoes.',
      'On Keihan, get off at Fushimi-Inari, not Fushimi-Momoyama.',
    ],
    spots: [
      { name: 'Lower gates', note: 'The famous torii tunnels, in the first 20 minutes. Every classic photo is taken here.', at: 'fushimi-inari' },
      { name: 'Yotsutsuji junction', note: 'The first clearing, 30–40 minutes up, with views over southern Kyoto. Most people turn back here.' },
      { name: 'Summit loop', note: 'Quiet forest and dozens of small sub-shrines. 2–3 hours round trip; the summit itself has little view.' },
    ],
    photos: [
      { src: '/images/blog/inline/fushimi-dawn.jpg', label: 'Lower gates at dawn' },
      { src: '/images/blog/inline/fushimi-summit.jpg', label: 'View from Yotsutsuji' },
    ],
    articles: ['sights/fushimi-inari', 'food/sake-kyoto'],
    tours: [],
    mapsQuery: 'Fushimi Inari Taisha Kyoto',
  },
  {
    id: 'arashiyama',
    short: 'Arashiyama',
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
    spots: [
      { name: 'Bamboo Grove', note: 'The famous 500 m path just north of Tenryu-ji. Free.', at: 'bamboo' },
      { name: 'Tenryu-ji', note: 'A UNESCO World Heritage garden from 1339, with the hills as its backdrop. Allow 30–45 minutes.', at: 'tenryuji' },
      { name: 'Togetsukyo Bridge', note: 'The centre of the district and its best-known view. Best in morning light.', at: 'togetsukyo' },
      { name: 'Jojakko-ji', note: 'A mossy temple 5 minutes uphill from the grove, with pagoda views and a fraction of the visitors.' },
      { name: 'Okochi Sanso Villa', note: 'A film star\'s hillside estate at the far end of the bamboo path, with terraced gardens and city views.' },
      { name: 'Sagano Scenic Railway', note: 'A small tourist train through the Hozugawa gorge. Book weeks ahead in autumn.' },
    ],
    photos: [
      { src: '/images/blog/inline/arashiyama-bamboo-tunnel.jpg', label: 'Bamboo Grove' },
      { src: '/images/blog/inline/arashiyama-tenryuji-pond.jpg', label: 'Tenryu-ji' },
      { src: '/images/blog/inline/arashiyama-togetsukyo-bridge.jpg', label: 'Togetsukyo Bridge' },
    ],
    articles: ['neighborhoods/arashiyama', 'sights/arashiyama-bamboo'],
    tours: [],
    mapsQuery: 'Arashiyama Bamboo Grove Kyoto',
  },
  {
    id: 'kinkakuji',
    short: 'Kinkaku-ji',
    name: 'Kinkaku-ji',
    tagline: 'The Golden Pavilion, mirrored in its pond.',
    lat: 35.0396, lon: 135.7295,
    times: ['morning', 'day'],
    bestTime: 'At the 9am opening, or on an overcast day',
    timeNeeded: '30–40 min',
    stations: 'No station at the gate. Bus or taxi',
    enjoy: [
      'Go at the 9am opening or on an overcast day.',
      'The visit takes 30–40 minutes on a set path. You cannot go inside the pavilion.',
      'Take the subway to Kitaoji, then a bus. It is more reliable than the bus all the way from Kyoto Station.',
      'No train runs here. A taxi is worth it for a group or a tight schedule.',
    ],
    spots: [
      { name: 'Main viewpoint', note: 'Right after the entrance, across the pond. This is the classic reflection shot.', at: 'kinkakuji' },
      { name: 'Upper garden', note: 'The path loops up past Anmintaku Pond. Usually quieter.' },
      { name: 'Ryoan-ji', note: 'The famous 15-stone Zen garden, about a 20-minute walk southwest.', at: 'ryoanji' },
      { name: 'Ninna-ji', note: 'About 10 minutes further on foot. The three make a compact morning.', at: 'ninnaji' },
    ],
    photos: [
      { src: '/images/blog/inline/kinkakuji-reflection.jpg', label: 'The reflection' },
      { src: '/images/blog/inline/kinkakuji-pond-path.jpg', label: 'The pond path' },
    ],
    articles: ['sights/kinkakuji'],
    tours: [],
    mapsQuery: 'Kinkaku-ji Kyoto',
  },
  {
    id: 'nijo',
    short: 'Nijo Castle',
    name: 'Nijo Castle',
    tagline: 'The shogun\'s castle in the middle of the city grid.',
    lat: 35.0142, lon: 135.7485,
    times: ['day'],
    bestTime: 'At the 8:45am opening on a weekday',
    timeNeeded: '2–2.5 hours',
    stations: 'Nijojo-mae (subway Tozai Line), 1 min walk',
    enjoy: [
      'Go at the 8:45am opening. Tour groups fill the palace corridors by midday.',
      'Allow 2–2.5 hours for the palace and the gardens.',
      'The palace building is closed on Tuesdays in January, July, August and December.',
      'The subway stops at the gate: Nijojo-mae on the Tozai Line is a 1-minute walk.',
    ],
    spots: [
      { name: 'Ninomaru Palace', note: 'Six connected buildings, from the waiting rooms to the shogun\'s chambers. Shoes off, and no photos inside.', at: 'nijo-castle' },
      { name: 'Nightingale floors', note: 'Every board chirps under your weight, so nobody could cross the palace unheard.' },
      { name: 'Ninomaru Garden', note: 'Designed in 1626, with three islands in a central pond.' },
      { name: 'The main tower base', note: 'Lightning destroyed the tower in 1750 and it was never rebuilt. Only the stone base remains.' },
    ],
    photos: [
      { src: '/images/blog/inline/nijo-castle-outer-walls.jpg', label: 'Outer walls' },
      { src: '/images/blog/inline/nijo-castle-ninomaru-garden.jpg', label: 'Ninomaru Garden' },
      { src: '/images/blog/inline/nijo-castle-kano-paintings.jpg', label: 'Kano paintings' },
    ],
    articles: ['sights/nijo-castle'],
    tours: [],
    mapsQuery: 'Nijo Castle Kyoto',
  },
  {
    id: 'shimogamo',
    short: 'Shimogamo',
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
    spots: [
      { name: 'Shimogamo Shrine', note: 'A UNESCO World Heritage shrine.', at: 'shimogamo' },
      { name: 'Tadasu-no-Mori', note: 'The forest you walk through to reach the shrine.' },
      { name: 'Kamogawa Delta', note: 'Where the Kamo and Takano Rivers meet, famous for its stepping stones.' },
      { name: 'Demachi Masugata Shopping Street', note: 'A covered arcade with local sweets and fresh produce.' },
    ],
    photos: [
      { src: '/images/tours/shimogamo/photo-shrine.jpg', label: 'Shimogamo Shrine' },
      { src: '/images/tours/shimogamo/photo-delta.jpg', label: 'Kamogawa Delta' },
      { src: '/images/tours/shimogamo/photo-bridge.jpg', label: 'Kamo River' },
    ],
    articles: [],
    tours: ['shimogamo-manga-walk'],
    mapsQuery: 'Shimogamo Shrine Kyoto',
  },
];

export interface LandmarkDef { id: string; /** Area this landmark belongs to, if any. */ area?: string; name: string; lat: number; lon: number; sprite: SpriteId; major?: boolean; glow?: boolean; /** Shown only when zoomed in (the guide's extra picks). */ detail?: boolean; /** One line shown when tapped. Facts from our articles only, no prices. */ note?: string }

/** Landmark icons. Coordinates from OpenStreetMap. */
export const LANDMARKS: LandmarkDef[] = [
  { id: 'kinkakuji', area: 'kinkakuji', name: 'Kinkaku-ji', lat: 35.03959, lon: 135.72951, sprite: 'kinkaku', major: true },
  { id: 'kiyomizu', area: 'higashiyama', name: 'Kiyomizudera', lat: 34.99442, lon: 135.78448, sprite: 'kiyomizu', major: true },
  { id: 'yasaka-pagoda', area: 'higashiyama', name: 'Yasaka Pagoda', lat: 34.99856, lon: 135.77925, sprite: 'pagoda', major: true },
  { id: 'yasaka-shrine', area: 'gion', name: 'Yasaka Shrine', lat: 35.00349, lon: 135.77839, sprite: 'shrine' },
  { id: 'hanamikoji', area: 'gion', name: 'Hanamikoji', lat: 35.0026, lon: 135.7752, sprite: 'machiya', major: true, glow: true },
  { id: 'pontocho', area: 'downtown', name: 'Pontocho', lat: 35.00598, lon: 135.77107, sprite: 'lantern', glow: true },
  { id: 'nishiki', area: 'downtown', name: 'Nishiki Market', lat: 35.00503, lon: 135.76471, sprite: 'market', major: true },
  { id: 'kyoto-tower', area: 'kyoto-station', name: 'Kyoto Tower', lat: 34.98756, lon: 135.75933, sprite: 'tower', major: true },
  { id: 'fushimi-inari', area: 'fushimi-inari', name: 'Fushimi Inari', lat: 34.96724, lon: 135.77299, sprite: 'toriis', major: true },
  { id: 'nijo-castle', area: 'nijo', name: 'Nijo Castle', lat: 35.01396, lon: 135.74851, sprite: 'castle', major: true },
  { id: 'imperial-palace', name: 'Imperial Palace', lat: 35.02526, lon: 135.76235, sprite: 'palace', note: "The palace park around it is free to walk." },
  { id: 'shimogamo', area: 'shimogamo', name: 'Shimogamo Shrine', lat: 35.0390, lon: 135.7730, sprite: 'shrine', major: true },
  { id: 'bamboo', area: 'arashiyama', name: 'Bamboo Grove', lat: 35.0171, lon: 135.6722, sprite: 'bamboo', major: true },
  { id: 'tenryuji', area: 'arashiyama', name: 'Tenryu-ji', lat: 35.01617, lon: 135.67462, sprite: 'temple' },
  { id: 'togetsukyo', area: 'arashiyama', name: 'Togetsukyo Bridge', lat: 35.01287, lon: 135.67776, sprite: 'bridge', major: true },
  { id: 'ginkakuji', name: 'Ginkaku-ji', lat: 35.02691, lon: 135.79843, sprite: 'temple', note: "At the north end of the Philosopher's Path." },
  { id: 'heian', name: 'Heian Shrine', lat: 35.01617, lon: 135.7829, sprite: 'torii', note: "Wide, easy canal-side paths nearby. Bean-throwing here at Setsubun, 3 February." },
  { id: 'nanzenji', name: 'Nanzen-ji', lat: 35.01162, lon: 135.79268, sprite: 'temple', note: "The grounds are free. The yudofu restaurants nearby fill from 11:30, so arrive at 11:00." },
  { id: 'sanjusangendo', name: 'Sanjusangen-do', lat: 34.98799, lon: 135.77178, sprite: 'hall', note: "Each mid-January, young archers in kimono shoot along the temple's long hall." },
  { id: 'tofukuji', name: 'Tofuku-ji', lat: 34.97717, lon: 135.77528, sprite: 'temple', note: "Its Tsutenkyo Bridge is Kyoto's most celebrated autumn viewpoint. Arrive before 8am." },
  { id: 'toji', area: 'kyoto-station', name: 'To-ji', lat: 34.98119, lon: 135.74771, sprite: 'pagoda', note: "On the 21st of every month, one of Japan's largest antique markets fills the grounds." },
  { id: 'kitano', name: 'Kitano Tenmangu', lat: 35.03024, lon: 135.73487, sprite: 'shrine', note: "Plum blossoms peak around 25 February. Market on the 25th of the month." },
  { id: 'ryoanji', area: 'kinkakuji', name: 'Ryoan-ji', lat: 35.03349, lon: 135.71806, sprite: 'temple', note: "You view the rock garden from a covered veranda, so it is at its best in rain." },
  { id: 'ninnaji', area: 'kinkakuji', name: 'Ninna-ji', lat: 35.02975, lon: 135.71403, sprite: 'pagoda', note: "Late-blooming cherry, one to two weeks after the rest of the city." },
  // --- OTAtrip Guide's extra picks: appear once you zoom in. Notes come from our own articles; positions from OpenStreetMap ---
  { id: 'shirakawa', area: 'gion', name: "Shirakawa Canal", lat: 35.00558, lon: 135.7745, sprite: 'lane', detail: true, glow: true, note: "The canal at Shimbashi, at its best under lantern light. Almost empty after 10pm." },
  { id: 'minamiza', area: 'gion', name: "Minamiza Theatre", lat: 35.00349, lon: 135.7724, sprite: 'machiya', detail: true, note: "Kyoto's kabuki theatre, home of the Kaomise performances each December." },
  { id: 'miyagawacho', area: 'gion', name: "Miyagawacho", lat: 34.99812, lon: 135.76999, sprite: 'lantern', detail: true, glow: true, note: "A geisha district between Gion and the Kamo River, quieter than Hanamikoji." },
  { id: 'maruyama', area: 'higashiyama', name: "Maruyama Park", lat: 35.00375, lon: 135.78084, sprite: 'sakura', detail: true, note: "Free and always open. Its weeping cherry is lit at night in blossom season." },
  { id: 'chionin', area: 'higashiyama', name: "Chion-in", lat: 35.00552, lon: 135.78324, sprite: 'gate', detail: true, note: "Known for its giant bell, rung by a team of monks on New Year's Eve." },
  { id: 'shorenin', area: 'higashiyama', name: "Shoren-in", lat: 35.00748, lon: 135.78337, sprite: 'temple', detail: true, note: "A short walk north of Chion-in. Lit up on autumn evenings." },
  { id: 'kodaiji', area: 'higashiyama', name: "Kodai-ji", lat: 35.00032, lon: 135.78135, sprite: 'temple', detail: true, note: "A short walk from Yasaka Shrine. Nene-no-michi, the stone path below it, links Gion to the Higashiyama walk." },
  { id: 'ishibei', area: 'higashiyama', name: "Ishibei-koji", lat: 34.99995, lon: 135.77969, sprite: 'lane', detail: true, note: "A quiet side lane with no souvenir stalls, a 5-minute detour. Photography is not allowed." },
  { id: 'ninenzaka', area: 'higashiyama', name: "Ninenzaka", lat: 34.99809, lon: 135.78083, sprite: 'lane', detail: true, note: "The lower of the two old lanes below Kiyomizudera. Packed on weekend afternoons, so go early." },
  { id: 'sannenzaka', area: 'higashiyama', name: "Sannenzaka", lat: 34.99724, lon: 135.78093, sprite: 'lane', detail: true, note: "Leave Kiyomizudera downhill this way, not back down the lane you came up." },
  { id: 'kyohaku', name: "Kyoto National Museum", lat: 34.99005, lon: 135.77291, sprite: 'museum', detail: true, note: "One of Japan's best collections of Buddhist and decorative art. A good rainy-day stop." },
  { id: 'teramachi', area: 'downtown', name: "Teramachi Arcade", lat: 35.00618, lon: 135.76696, sprite: 'market', detail: true, note: "A covered shopping street with fans, washi paper, tea and bookshops, 5 minutes on foot from Nishiki Market." },
  { id: 'manga-museum', name: "Manga Museum", lat: 35.01168, lon: 135.75918, sprite: 'museum', detail: true, note: "A former elementary school with about 50,000 manga on open shelves to read on the spot. Closed Wednesdays." },
  { id: 'yotsutsuji', area: 'fushimi-inari', name: "Yotsutsuji Viewpoint", lat: 34.96916, lon: 135.78146, sprite: 'view', detail: true, note: "The first clearing on the mountain, 30 to 40 minutes up, with views over southern Kyoto. Most people turn back here." },
  { id: 'nonomiya', area: 'arashiyama', name: "Nonomiya Shrine", lat: 35.01775, lon: 135.67416, sprite: 'torii', detail: true, note: "A small shrine in the bamboo just before the grove entrance, linked to The Tale of Genji." },
  { id: 'okochi', area: 'arashiyama', name: "Okochi Sanso", lat: 35.01666, lon: 135.66967, sprite: 'machiya', detail: true, note: "A film star's hillside estate at the far end of the bamboo path. Terraced gardens, city views, no crowds." },
  { id: 'jojakkoji', area: 'arashiyama', name: "Jojakko-ji", lat: 35.01964, lon: 135.66857, sprite: 'temple', detail: true, note: "A mossy hillside temple that tour groups skip. Ten minutes up to the pagoda for views over Arashiyama." },
  { id: 'hirano', name: "Hirano Shrine", lat: 35.03236, lon: 135.73251, sprite: 'sakura', detail: true, note: "About 60 varieties of cherry that bloom in turn from late March through late April." },
  { id: 'kamishichiken', name: "Kamishichiken", lat: 35.03075, lon: 135.73684, sprite: 'lantern', detail: true, glow: true, note: "The oldest of Kyoto's five geisha districts, beside Kitano Tenmangu." },
  { id: 'philosophers-path', name: "Philosopher's Path", lat: 35.0225, lon: 135.79501, sprite: 'sakura', detail: true, note: "A 2 km canal walk between Nanzen-ji and Ginkaku-ji. Quietest at 7 to 9am." },
  { id: 'eikando', name: "Eikan-do", lat: 35.0141, lon: 135.79497, sprite: 'temple', detail: true, note: "Our pick if you pay for one autumn night illumination. The queues are very long, so arrive early." },
  { id: 'keage', name: "Keage Incline", lat: 35.0095, lon: 135.78958, sprite: 'sakura', detail: true, note: "Old railway tracks under rows of cherry trees. Best before 8am, in morning light." },
  { id: 'tadasu', area: 'shimogamo', name: "Tadasu-no-Mori", lat: 35.03697, lon: 135.77273, sprite: 'forest', detail: true, note: "The forest you walk through to reach the shrine." },
  { id: 'kamo-delta', area: 'shimogamo', name: "Kamogawa Delta", lat: 35.03011, lon: 135.7717, sprite: 'stones', detail: true, note: "Where the Kamo and Takano Rivers meet, famous for its stepping stones." },
  { id: 'masugata', area: 'shimogamo', name: "Demachi Masugata", lat: 35.03029, lon: 135.76885, sprite: 'market', detail: true, note: "A covered arcade with local sweets and fresh produce." },
];

/** Stations labelled on the full-city view (names as in kyoto-geo.json). */
export const HUB_STATIONS = ['Kyoto', 'Kyoto Kawaramachi', 'Gion-shijo', 'Saga-Arashiyama', 'Inari', 'Nijojo-mae', 'Demachiyanagi', 'Karasuma Oike'];
