/**
 * Settings for the private guide-feedback page (/guest/guide-feedback).
 *
 * This page is shown to guests at the END of a tour so they can rate their
 * guide honestly. The guide never sees the answers — they go straight to the
 * owner's spreadsheet and inbox.
 *
 * 運用メモ（日本語）:
 * - ガイド名はお客さんが手入力する（短答）。名簿を持たないので、ガイドが増えても
 *   設定の変更は不要。?g=Shumpei を付けたリンクを渡すと名前を入れた状態で開ける。
 * - ツアーが増えたら TOURS に1行足すだけ。専用ページ /feedback/<slug> が自動でできる。
 * - レビュー投稿先はツアーごとに違うので、各ツアーの reviews に書く。
 *   Googleだけは店舗単位なので config/site.ts の GOOGLE_REVIEW_URL に1つだけ置く。
 * - 送信先URL（GASのWebアプリ）は環境変数 PUBLIC_FEEDBACK_ENDPOINT で設定する。
 */

import { GOOGLE_REVIEW_URL } from './site';

/**
 * "Write a review" links for one tour. Each platform lists our tours as
 * separate products, so these URLs differ per tour. Omit a field until the
 * link exists — the button is simply not shown.
 */
export type TourReviewLinks = {
  /** TripAdvisor UserReviewEdit link for this specific tour product. */
  tripadvisor?: string;
  /** GetYourGuide review link (scan-review-qr) for this activity. */
  getyourguide?: string;
};

export type TourOption = { slug: string; name: string; reviews?: TourReviewLinks };
export type RatingAxis = { key: string; label: string };
export type ReviewLink = { key: string; label: string; url: string };

/** Cap on the typed guide name. */
export const MAX_GUIDE_NAME_LENGTH = 80;

/**
 * Tours that can be reviewed. Mirrors src/pages/tours/index.astro.
 * Each tour also gets its own feedback page at /feedback/<slug>, which skips
 * the "which tour?" question and shows only that tour's review links.
 */
export const TOURS: TourOption[] = [
  {
    slug: 'gion-sake-walk',
    name: 'Kyoto Gion Night Walk',
    reviews: {
      tripadvisor:
        'https://www.tripadvisor.com/UserReviewEdit-g298564-d27759588-Kyoto_Gion_Night_Walk_Sake_Secret_Alleys_Geisha_District-Kyoto_Kyoto_Prefecture_Kinki.html',
      getyourguide:
        'https://www.getyourguide.com/scan-review-qr?activity_id=717960&utm_medium=offline&utm_source=supplier_review_link&utm_campaign=supplier_review_qrcode&utm_content=717960',
    },
  },
  { slug: 'izakaya-hopping', name: 'Kyoto Izakaya Hopping' },
  { slug: 'shimogamo-manga-walk', name: 'Shimogamo Shrine & Manga Walk' },
];

export const OTHER_TOUR_SLUG = 'other';

export function findTour(slug: string): TourOption | undefined {
  return TOURS.find((tour) => tour.slug === slug);
}

/**
 * Review buttons to offer after a guest submits, for the tour they joined.
 * TripAdvisor and GetYourGuide are per-tour; Google is company-wide, so it
 * appears for every tour (including "Another tour").
 */
export function reviewLinksFor(tourSlug: string): ReviewLink[] {
  const reviews = findTour(tourSlug)?.reviews ?? {};
  return [
    { key: 'tripadvisor', label: 'Review us on TripAdvisor', url: reviews.tripadvisor ?? '' },
    { key: 'google', label: 'Review us on Google', url: GOOGLE_REVIEW_URL },
    { key: 'getyourguide', label: 'Review us on GetYourGuide', url: reviews.getyourguide ?? '' },
  ].filter((link) => link.url);
}

/** Every tour's review links, keyed by slug, for the tour-picker page. */
export function reviewLinksByTour(): Record<string, ReviewLink[]> {
  const map: Record<string, ReviewLink[]> = {};
  for (const tour of TOURS) map[tour.slug] = reviewLinksFor(tour.slug);
  map[OTHER_TOUR_SLUG] = reviewLinksFor(OTHER_TOUR_SLUG);
  return map;
}

/**
 * The 1-5 sub-ratings. All optional for the guest — the overall score is the
 * only required rating. Order here is the order shown on the page.
 *
 * Kept to three on purpose: a long grid of scores gets abandoned or answered
 * carelessly. Pace and local knowledge were dropped because the free-text
 * answers surface those anyway. Swapping one back in means editing this list
 * and FEEDBACK.AXIS_KEYS / AXIS_LABELS in the Apps Script to match.
 */
export const RATING_AXES: RatingAxis[] = [
  { key: 'clarity', label: 'Clear and easy to understand' },
  { key: 'friendliness', label: 'Friendly and attentive' },
  { key: 'energy', label: 'Fun energy' },
];

/**
 * Google Apps Script web app URL that receives submissions.
 * Set PUBLIC_FEEDBACK_ENDPOINT in Vercel (and in a local .env for dev).
 * Public by design — it is visible in the browser, so it holds no secrets and
 * the script validates every field on its side.
 */
export const FEEDBACK_ENDPOINT: string =
  import.meta.env.PUBLIC_FEEDBACK_ENDPOINT ?? '';

/** Reject submissions faster than this — a human cannot fill the form that fast. */
export const MIN_FILL_SECONDS = 3;

/** Character caps for the free-text answers (mirrored in the Apps Script). */
export const MAX_TEXT_LENGTH = 2000;
