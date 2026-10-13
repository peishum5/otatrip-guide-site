/**
 * Settings for the post-tour review helper (/guest/review).
 *
 * Shown to guests at the END of a tour. They tap a few words and quick
 * ratings, type their guide's name, say where they booked, and get a short
 * draft review they can paste into that site's review form (plus Google Maps).
 *
 * 運用メモ（日本語）:
 * - ツアーが増えたら TOURS に1行足すだけ。専用ページ /review/<slug> が自動でできる。
 * - TripAdvisor・GetYourGuide はツアーごとに別商品なので、投稿リンクも各ツアーに書く。
 *   TripAdvisor が未設定のツアーは会社ページ（TRIPADVISOR_URL）に飛ぶ。
 *   GetYourGuide が未設定のツアーは「アプリから書いてね」という案内文を出す。
 * - 「どこで予約したか」で最後のボタンが変わる（BOOKING_SOURCES）。
 *   Viator は配れる投稿リンクがないので TripAdvisor に案内する（同じグループ会社）。
 *   Klook も配れるリンクがないので、アプリでの書き方を案内する。
 * - Google マップのボタンは、どの予約サイトを選んでも下に出る（店舗単位で1つ）。
 * - ?g=Shumpei を付けたリンクを渡すと、ガイド名を入れた状態で開ける。
 * - 文面は毎回少しずつ言い回しが変わる（全員同じ文章だと TripAdvisor に
 *   不正レビューと疑われるため）。お客さんが自由に書き足せる。
 * - 回答はオーナー専用スプレッドシート「OTAtrip レビュー回答ログ」に記録する
 *   （送信先は下の REVIEW_LOG_ENDPOINT。GAS は ~/8E6/OTAtripGuide/ReviewLog）。
 *   記録に失敗しても、お客さんの画面（コピー・投稿先への移動）は止めない。
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
  /**
   * GetYourGuide review link for this activity. From the supplier portal:
   * Performance > Reviews > Collect more reviews.
   */
  getyourguide?: string;
};

export const TOURS: ReviewTour[] = [
  {
    slug: 'gion-sake-walk',
    name: 'Kyoto Gion Night Walk',
    shortName: 'Gion Night Walk',
    tripadvisor:
      'https://www.tripadvisor.com/UserReviewEdit-g298564-d27759588-Kyoto_Gion_Night_Walk_Sake_Secret_Alleys_Geisha_District-Kyoto_Kyoto_Prefecture_Kinki.html',
    getyourguide:
      'https://www.getyourguide.com/scan-review-qr?activity_id=717960&utm_medium=offline&utm_source=supplier_review_link&utm_campaign=supplier_review_qrcode&utm_content=717960',
  },
  { slug: 'izakaya-hopping', name: 'Kyoto Izakaya Hopping', shortName: 'Izakaya Hopping tour' },
  {
    slug: 'shimogamo-manga-walk',
    name: 'Shimogamo Shrine & Manga Walk',
    shortName: 'Shimogamo & Manga Walk',
  },
  { slug: 'coffee-ceremony', name: 'Hands-On Coffee Ceremony', shortName: 'Coffee Ceremony' },
  {
    slug: 'tea-ceremony',
    name: 'Matcha Tea Ceremony',
    shortName: 'Matcha Tea Ceremony',
    tripadvisor:
      'https://www.tripadvisor.com/UserReviewEdit-g298564-d34405946-Kyoto_Matcha_Tasting_and_Making_Class_with_Urasenke_Tea_Master-Kyoto_Kyoto_Prefecture_Kinki.html',
  },
];

export function findTour(slug: string): ReviewTour | undefined {
  return TOURS.find((tour) => tour.slug === slug);
}

export function tripadvisorUrlFor(tour: ReviewTour): string {
  return tour.tripadvisor || TRIPADVISOR_URL;
}

/**
 * Where the guest booked. Each review counts most on the site they booked
 * through, so the final button follows this answer.
 */
export const BOOKING_SOURCES = [
  { key: 'tripadvisor', label: 'TripAdvisor / Viator' },
  { key: 'getyourguide', label: 'GetYourGuide' },
  { key: 'klook', label: 'Klook' },
  { key: 'other', label: 'Somewhere else' },
];

/**
 * Google "write a review" link. Google reviews belong to the business, not
 * to one tour, so this single link is offered on every page.
 * TODO: swap for the direct review-form link from Google Business Profile
 * ("Ask for reviews") once ownership moves to 8e6.co.jp. This one opens the
 * business panel, where the guest taps "Write a review".
 */
export const GOOGLE_REVIEW_URL = 'https://share.google/Qhpx7AhfBwDTN78Yx';

/**
 * Reviews shorter than this get one or two neutral sentences appended.
 * TripAdvisor rejects very short reviews (reportedly under 200 characters).
 */
export const MIN_DRAFT_LENGTH = 200;

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
 * Apps Script web app that logs answers to the owner-only spreadsheet.
 * Public by nature (it ships in the page), so it holds no secrets and the
 * script checks every field itself. Empty string turns logging off.
 */
export const REVIEW_LOG_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbyYqGSOMyNZi50HGnM2uQ-bXOsgPQcLPWoUx6cr8LqtfJeI1LNiOjBrIShKHL8Xn6nFBQ/exec';

/**
 * Sentence pieces for the draft. {g} = guide name, {t} = tour short name,
 * {w} = picked words ({W} = same, capitalized for a sentence start).
 * Each slot has variants; one is picked at random so that no two guests
 * post identical text. No dashes: they read as machine-written.
 */
export const TEMPLATES = {
  openerWithWords: [
    'Our {t} with {g} was {w}.',
    'The {t} with {g} was {w}!',
    'We joined the {t} with {g} and it was {w}.',
    'Just finished the {t} with {g}. {W} from start to finish!',
    'If I had to sum up the {t} with {g}: {w}.',
    'Honestly, the {t} with {g} was {w}.',
  ],
  openerNoWords: [
    'We had a great time on the {t} with {g}.',
    'We really enjoyed the {t} with {g}.',
    'So glad we booked the {t} with {g}.',
    'The {t} with {g} was a highlight of our Kyoto trip.',
  ],
  friendliness: {
    3: [
      '{G} was so friendly, it felt like exploring with a local friend.',
      '{G} was incredibly warm and made everyone feel at home.',
      '{G} made us feel welcome from the very first minute.',
      'By the end, {g} felt like an old friend.',
    ],
    2: [
      '{G} was really friendly and easy to talk to.',
      '{G} was kind and fun to be around.',
      '{G} was cheerful and happy to answer all our questions.',
      '{G} kept the mood relaxed and friendly the whole time.',
    ],
    1: [
      '{G} was friendly and welcoming.',
      '{G} was nice and easygoing.',
      '{G} was polite and easy to follow.',
      '{G} was approachable and kind.',
    ],
  },
  learning: {
    3: [
      'We learned so much about Kyoto that we never would have found on our own.',
      'Every stop came with a great story, and we learned a ton.',
      'I came away knowing so much more about Japanese culture.',
      'The stories and background made everything we saw come alive.',
    ],
    2: [
      'We learned a lot about local culture along the way.',
      'There were lots of interesting stories about the area.',
      'We picked up plenty of fun facts and local tips.',
      'It was a great mix of history and everyday local life.',
    ],
    1: [
      'We picked up some fun facts about Kyoto.',
      'We got some nice insights into local life.',
      'We learned a few things we did not know before.',
      'There were some interesting bits of local history.',
    ],
  },
  route: {
    3: [
      'Every stop was a gem we would never have found ourselves.',
      'The route was perfect, full of real local spots.',
      'Each place we visited felt special and away from the crowds.',
      'The places we went were the real highlight for us.',
    ],
    2: [
      'We really enjoyed the places we visited.',
      'The stops were a great mix.',
      'The route was well planned and never felt rushed.',
      'We saw a side of Kyoto we would have missed on our own.',
    ],
    1: [
      'The route was easy to follow and nicely paced.',
      'The stops were a nice mix.',
      'The places we visited were pleasant and easy to get to.',
      'The pace was comfortable the whole way.',
    ],
  },
  /** Appended (in random order, no repeats) when a draft is too short. */
  padding: [
    'It was a great way to see a different side of Kyoto.',
    'Easily one of the best things we did on our trip.',
    'Everything was well organized and easy to join.',
    'Perfect if you want something more personal than a big group tour.',
  ],
  closer: [
    'Highly recommend!',
    'Would definitely recommend.',
    "Don't miss it if you're in Kyoto!",
    'Thank you for a wonderful time!',
    'A must-do in Kyoto.',
    'We would happily book again.',
  ],
};
