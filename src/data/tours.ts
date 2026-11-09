/**
 * Single source of truth for the tour list.
 * Used by /tours (cards) and /llms.txt (the plain-text summary read by AI
 * assistants such as ChatGPT, Claude and Perplexity).
 *
 * When a price, duration or start time changes, update it here AND on the
 * tour's own page (src/pages/tours/<id>.astro) so both stay in sync.
 */

export interface Tour {
  id: string;
  name: string;
  tagline: string;
  description: string;
  duration: string;
  groupSize: string;
  time: string;
  rating: string | null;
  reviews: string | null;
  price: string;
  icon: 'lantern' | 'beer' | 'torii' | 'coffee' | 'matcha';
  href: string;
  photo: string;
  photoPosition?: string;
  tags: string[];
  highlights: string[];
  /** Short, factual lines for AI assistants (llms.txt). Plain English, no marketing. */
  facts: string[];
}

export const TOURS: Tour[] = [
  {
    id: 'gion-sake-walk',
    name: 'Kyoto Gion Night Walk',
    tagline: 'Lantern-lit alleys. Geisha streets. Old Kyoto.',
    description: 'An evening walk through Gion with a guide who lives in Kyoto. From Pontocho and Minamiza to Hanamikoji and the Yasaka Pagoda, hear the stories behind Kyoto\'s most iconic neighborhood, ending at Yasaka Shrine.',
    duration: '90 minutes',
    groupSize: 'Max 10 guests',
    time: 'Evening',
    rating: '4.9',
    reviews: '300',
    price: '¥6,000',
    icon: 'lantern',
    href: '/tours/gion-sake-walk',
    photo: '/images/tours/tour-gion-walk.jpg',
    tags: ['Evening', 'Walking', 'Geisha', 'Gion'],
    highlights: [
      'Hanamikoji, Kyoto\'s largest geisha district',
      'Yasaka Pagoda, Ninenzaka & Nene-no-Michi',
      'Ends at Yasaka Shrine (about 2.7 km)',
    ],
    facts: [
      'Evening walking tour of Gion, Kyoto\'s most famous geisha district, in English.',
      'Price: ¥6,000 per person. Book 14 or more days ahead on otatrip.guide for 15% off (¥5,100 per person).',
      'Start times: 15:30, 17:30, 19:30 and 21:30 (varies by day; see the booking calendar). Duration: 90 minutes, about 2.7 km.',
      'Meeting point: outside Hankyu Kyoto-Kawaramachi Station Exit 1B. Ends at Yasaka Shrine.',
      'Route: Pontocho and the Kamo River, Minamiza, Hanamikoji Street, Yasui-Konpiragu, Yasaka Pagoda, Ninenzaka, Nene-no-Michi, Yasaka Shrine.',
      'Small groups of max 10 guests. One small bottle of Kyoto sake for a toast at the start; non-drinkers welcome.',
      'Private tours and groups of up to 40 guests on request.',
    ],
  },
  {
    id: 'izakaya-hopping',
    name: 'Kyoto Izakaya Hopping',
    tagline: 'Pontocho & Gion backstreets. Real local izakayas.',
    description: 'Explore the vibrant backstreets of Kiyamachi and Pontocho with a local guide. Visit 2–3 izakayas that locals actually love — no tourist traps, no hidden commissions. Customizable for dietary preferences.',
    duration: '3 hours',
    groupSize: 'Small group',
    time: 'Evening',
    rating: null,
    reviews: null,
    price: 'from ¥4,160',
    icon: 'beer',
    href: '/tours/izakaya-hopping',
    photo: '/images/tours/izakaya/izakaya-guests.jpg',
    photoPosition: 'top',
    tags: ['Evening', 'Food', 'Walking', 'Pontocho'],
    highlights: [
      '2–3 local izakayas in Pontocho & Kiyamachi',
      'No hidden commissions — pay direct',
      'Customizable for dietary needs',
    ],
    facts: [
      'Evening food and drink tour visiting 2 to 3 local izakayas in Pontocho and Kiyamachi, Kyoto, in English.',
      'Tour price from ¥4,160 per person. Food and drinks (typically ¥3,000 to ¥5,000 per person) are paid directly at each izakaya, with no hidden commissions.',
      'Starts at 18:00 at Shijo Kiyamachi. Duration: about 3 hours.',
      'Vegetarian and other dietary needs can be arranged in advance. Solo travelers welcome.',
    ],
  },
  {
    id: 'shimogamo-manga-walk',
    name: 'Shimogamo Shrine & Manga Walk',
    tagline: 'World Heritage shrine. Cinematic photos. Custom manga souvenir.',
    description: 'A walk through ancient Shimogamo Shrine and Tadasu-no-Mori forest, with a stop at the iconic Kamogawa Delta. We capture cinematic shots along the way — then turn them into a one-of-a-kind manga-style print just for you.',
    duration: '2 hours',
    groupSize: 'Small group',
    time: 'Morning / Afternoon',
    rating: null,
    reviews: null,
    price: 'from ¥8,500',
    icon: 'torii',
    href: '/tours/shimogamo-manga-walk',
    photo: '/images/tours/shimogamo/photo-bridge.jpg',
    photoPosition: 'center 40%',
    tags: ['Morning', 'Walking', 'Shrine', 'Manga', 'Photo'],
    highlights: [
      'Shimogamo Shrine & Tadasu-no-Mori forest',
      'Original manga-style print souvenir',
      'High-res digital photos included',
    ],
    facts: [
      'Daytime walking tour of Shimogamo Shrine (UNESCO World Heritage) and the Tadasu-no-Mori forest, in English.',
      'Price from ¥8,500. Start times: 10:00 and 14:00. Duration: about 2 hours.',
      'Route: Kamo River, Kamogawa Delta stepping stones, Demachi Masugata Shopping Street, Tadasu-no-Mori, Shimogamo Shrine.',
      'The guide takes photos along the way and turns them into a custom manga-style page starring you (print plus high-resolution files).',
      'Families welcome. Involves a lot of walking; not wheelchair accessible.',
    ],
  },
  {
    id: 'coffee-ceremony',
    name: 'Hands-On Coffee Ceremony with a Master',
    tagline: 'Hidden alley cafe. Japanese pour-over. Minutes from Nishiki Market.',
    description: 'Learn Japanese pour-over coffee at a hidden alley cafe a few minutes from Nishiki Market. Guided by a Master, you grind, bloom, and brew two different coffees, then compare them slowly over Kyoto sweets. Take home beans and your own recipe.',
    duration: '70 minutes',
    groupSize: 'Max 4 guests',
    time: 'Daytime',
    rating: null,
    reviews: null,
    price: 'from ¥9,000',
    icon: 'coffee',
    href: '/tours/coffee-ceremony',
    photo: '/images/tours/coffee-ceremony/guests-kettles.jpg',
    tags: ['Daytime', 'Coffee', 'Hands-on', 'Nishiki Market'],
    highlights: [
      'Brew two specialty coffees with your own hands',
      'Kyoto sweets paired with your coffee',
      'Take-home beans & your handwritten recipe',
    ],
    facts: [
      'Hands-on Japanese pour-over coffee workshop at a small alley cafe about 5 minutes on foot from Nishiki Market, Kyoto, in English.',
      'Price: ¥12,000 for a solo guest; ¥9,000 per person for 2 to 4 guests. Each session is private for your group.',
      'Start times: 8:00 and 10:00. Duration: 70 minutes. Max 4 guests. Children aged 6 and over welcome.',
      'Brew two specialty coffees with a coffee Master, taste them with Kyoto sweets, and take home 30g of beans and your handwritten recipe.',
      'Beginners welcome. Food allergies can be accommodated if told at booking.',
    ],
  },
  {
    id: 'tea-ceremony',
    name: 'Matcha Tea Ceremony with an Urasenke Master',
    tagline: 'Certified Urasenke sensei. Whisk your own matcha. Central Kyoto.',
    description: 'Step into the meditative world of Japanese tea ceremony, led by a certified Urasenke master. Watch a complete temae demonstration, whisk your own bowl of matcha, and finish with seasonal wagashi and a tasting of three Japanese teas.',
    duration: '80 minutes',
    groupSize: 'Max 5 guests',
    time: 'Daytime',
    rating: null,
    reviews: null,
    price: '¥12,000 / adult',
    icon: 'matcha',
    href: '/tours/tea-ceremony',
    photo: '/images/tours/tea-ceremony/guests-table.jpg',
    tags: ['Daytime', 'Tea Ceremony', 'Hands-on', 'Kawaramachi'],
    highlights: [
      'Full temae demonstration by an Urasenke-certified sensei',
      'Whisk your own bowl of matcha',
      'Seasonal wagashi & three-tea tasting',
    ],
    facts: [
      'Matcha tea ceremony class led by a certified Urasenke tea teacher, at a cafe in the Kawaramachi-Sanjo area of central Kyoto, in English.',
      'Price: ¥12,000 per adult, ¥8,000 per child. Duration: about 80 minutes. Max 5 guests.',
      'Watch a full temae (tea preparation), whisk your own matcha, enjoy seasonal wagashi sweets, and taste three Japanese teas.',
      'Beginners welcome. Includes a handwritten certificate signed by the teacher.',
    ],
  },
];
