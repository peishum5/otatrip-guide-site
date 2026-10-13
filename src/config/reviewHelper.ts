/**
 * Settings for the post-tour review helper (/guest/review).
 *
 * Shown to guests at the END of a tour. They tap a few words and quick
 * ratings, type their guide's name, and get a short draft review they can
 * copy and paste into TripAdvisor.
 *
 * 運用メモ（日本語）:
 * - ツアーが増えたら TOURS に1行足すだけ。専用ページ /review/<slug> が自動でできる。
 * - TripAdvisor はツアーごとに別商品なので、投稿リンクも各ツアーに書く。
 *   未設定のツアーは会社ページ（TRIPADVISOR_URL）に飛ぶ。
 * - ?g=Shumpei を付けたリンクを渡すと、ガイド名を入れた状態で開ける。
 * - 文面は毎回少しずつ言い回しが変わる（全員同じ文章だと TripAdvisor に
 *   不正レビューと疑われるため）。お客さんが自由に書き足せる。
 * - 回答はどこにも送信しない。ブラウザの中で文面を作るだけ。
 */

import { TRIPADVISOR_URL } from './site';

export type ReviewTour = {
  slug: string;
  /** Full name shown on the page. */
  name: string;
  /** Short name used inside the review text. */
  shortName: string;
  /** TripAdvisor "write a review" link for this tour product. */
  tripadvisor?: string;
};

export const TOURS: ReviewTour[] = [
  {
    slug: 'gion-sake-walk',
    name: 'Kyoto Gion Night Walk',
    shortName: 'Gion Night Walk',
    tripadvisor:
      'https://www.tripadvisor.com/UserReviewEdit-g298564-d27759588-Kyoto_Gion_Night_Walk_Sake_Secret_Alleys_Geisha_District-Kyoto_Kyoto_Prefecture_Kinki.html',
  },
  { slug: 'izakaya-hopping', name: 'Kyoto Izakaya Hopping', shortName: 'Izakaya Hopping tour' },
  {
    slug: 'shimogamo-manga-walk',
    name: 'Shimogamo Shrine & Manga Walk',
    shortName: 'Shimogamo & Manga Walk',
  },
  { slug: 'coffee-ceremony', name: 'Hands-On Coffee Ceremony', shortName: 'Coffee Ceremony' },
  { slug: 'tea-ceremony', name: 'Matcha Tea Ceremony', shortName: 'Matcha Tea Ceremony' },
];

export function findTour(slug: string): ReviewTour | undefined {
  return TOURS.find((tour) => tour.slug === slug);
}

export function tripadvisorUrlFor(tour: ReviewTour): string {
  return tour.tripadvisor || TRIPADVISOR_URL;
}

/** Impression words. Adjectives, so they read naturally inside a sentence. */
export const IMPRESSION_WORDS = [
  'Fun',
  'Authentic',
  'Eye-opening',
  'Relaxed',
  'Lively',
  'Cozy',
  'Delicious',
  'Unique',
  'Charming',
  'Unforgettable',
];

/** How many words the guest can pick. Three keeps the review short. */
export const MAX_WORDS = 3;

/**
 * The three quick ratings. Every level is positive on purpose: the lowest is
 * still "Good". Levels are 1 (Good), 2 (Great), 3 (Amazing).
 */
export const RATING_LEVELS = ['Good', 'Great', 'Amazing!'];

export const RATING_AXES = [
  { key: 'friendliness', label: 'Friendliness' },
  { key: 'learning', label: 'What you learned' },
  { key: 'route', label: 'The route & stops' },
];

/** Cap on the typed guide name. */
export const MAX_GUIDE_NAME_LENGTH = 40;

/**
 * Sentence pieces for the draft. {g} = guide name, {t} = tour short name,
 * {w} = picked words. Each slot has variants; one is picked at random so that
 * no two guests post identical text. No dashes: they read as machine-written.
 */
export const TEMPLATES = {
  openerWithWords: [
    'Our {t} with {g} was {w}.',
    'The {t} with {g} was {w}!',
    'We joined the {t} with {g} and it was {w}.',
  ],
  openerNoWords: [
    'We had a great time on the {t} with {g}.',
    'We really enjoyed the {t} with {g}.',
  ],
  friendliness: {
    3: [
      '{G} was so friendly, it felt like exploring with a local friend.',
      '{G} was incredibly warm and made everyone feel at home.',
    ],
    2: ['{G} was really friendly and easy to talk to.', '{G} was kind and fun to be around.'],
    1: ['{G} was friendly and welcoming.', '{G} was nice and easygoing.'],
  },
  learning: {
    3: [
      'We learned so much about Kyoto that we never would have found on our own.',
      'Every stop came with a great story, and we learned a ton.',
    ],
    2: [
      'We learned a lot about local culture along the way.',
      'There were lots of interesting stories about the area.',
    ],
    1: ['We picked up some fun facts about Kyoto.', 'We got some nice insights into local life.'],
  },
  route: {
    3: [
      'Every stop was a gem we would never have found ourselves.',
      'The route was perfect, full of real local spots.',
    ],
    2: ['We really enjoyed the places we visited.', 'The stops were a great mix.'],
    1: ['The route was easy to follow and nicely paced.', 'The stops were a nice mix.'],
  },
  closer: ['Highly recommend!', 'Would definitely recommend.', "Don't miss it if you're in Kyoto!"],
};
