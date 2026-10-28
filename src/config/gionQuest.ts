/**
 * Gion "Lost Memories" photo quest (/quest/gion).
 *
 * The guest is a traveler who woke up in Gion with no memory. Each photo
 * brings one memory back; the memory text doubles as the guide's fact for
 * that stop. Spots are listed in route order.
 *
 * - judge 'ai':   the photo is sent to /api/quest/judge and checked by Claude.
 * - judge 'self': people photos (selfie, group photo). Never sent anywhere;
 *                 the guest just confirms.
 *
 * Plan and decisions: Gion_Walking_tour/quest/構成案_記憶クエスト.md
 * ツアーのスポットを増やすときは SPOTS に1件足す（visual は判定用の英語の説明）。
 */

export type QuestJudge = 'ai' | 'self';

export interface QuestSpot {
  id: string;
  /** Small label on the card, e.g. "MEMORY 1". */
  label: string;
  /** Place name shown after the memory comes back. */
  place: string;
  icon: 'people' | 'torii' | 'pagoda' | 'lantern';
  judge: QuestJudge;
  /** What the guest is told to look for (shown before the memory returns). */
  clue: string;
  /** For 'ai' spots: what the place looks like, given to the judge model. */
  visual?: string;
  /** Lines that appear once the memory returns. */
  memory: string[];
}

export const SPOTS: QuestSpot[] = [
  {
    id: 'face',
    label: 'MEMORY 0',
    place: 'Your face',
    icon: 'people',
    judge: 'self',
    clue: 'Take a smiling selfie. Start by remembering who you are.',
    memory: ["I remember... this face. It's mine.", "That's a start."],
  },
  {
    id: 'yasui-konpiragu',
    label: 'MEMORY 1',
    place: 'Yasui Konpiragu Shrine',
    icon: 'torii',
    judge: 'ai',
    clue: 'A stone buried under white paper, with a hole through it.',
    visual:
      "The 'enkiri-enmusubi' stone at Yasui Konpiragu shrine: a large mound-shaped stone completely covered in white paper strips, with a small round hole through its base. Often lit at night. The shrine grounds with this white paper-covered stone visible also count.",
    memory: [
      'I remember... people crawling through a hole in a stone, covered in paper wishes.',
      'Front to back, to cut a bad bond. Back to front, to tie a good one.',
    ],
  },
  {
    id: 'yasaka-pagoda',
    label: 'MEMORY 2',
    place: 'Yasaka Pagoda (Hokan-ji)',
    icon: 'pagoda',
    judge: 'ai',
    clue: 'A tall tower standing at the end of a narrow street.',
    visual:
      'Yasaka Pagoda (Hokan-ji): a tall dark wooden five-story pagoda with stacked tiled roofs, usually seen at the end of a narrow sloping street lined with old wooden houses. Lit up at night.',
    memory: [
      'I remember... a five-story pagoda, about 46 meters tall,',
      'watching over this town for centuries.',
    ],
  },
  {
    id: 'lanterns',
    label: 'LAST MEMORY',
    place: 'Yasaka Shrine',
    icon: 'lantern',
    judge: 'self',
    clue: 'Under the shrine lanterns, with the people who walked with you tonight. Everyone smiles.',
    memory: [
      'I remember everything now.',
      'I was never lost. A small stone Jizo by the road was watching over me,',
      'and tonight, I walked with these people.',
    ],
  },
];

export const STORY = [
  'You wake up on a quiet street in Gion at night.',
  "You don't remember who you are, or how you got here.",
  'All you have is a camera. Find the places. Every photo brings back a memory.',
];

/** Where the ending sends the guest (vercel.json redirects /review/<slug>). */
export const REVIEW_URL = '/review/gion-sake-walk';

/** Every miss shows the judge's hint; after this many, "I'm here" unlocks the memory anyway. */
export const UNLOCK_AFTER_MISSES = 2;

/** Photos are shrunk in the browser to this long edge before judging (keeps cost and upload small). */
export const UPLOAD_MAX_EDGE = 1024;
/** Largest base64 image the judge endpoint accepts (~600 KB of JPEG). */
export const MAX_IMAGE_BASE64_LENGTH = 800_000;
