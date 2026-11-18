/**
 * Landmark pixel art for the Kyoto map, kept as text so no image files are needed.
 * '.' is transparent; every other character is a colour in PALETTE.
 * Sprites are anchored at their bottom-centre on the ground.
 */
export const PALETTE: Record<string, string> = {
  k: '#1c1c22', // outline / dark
  s: '#4a4a56', // slate roof
  S: '#6b6b7a', // slate highlight
  r: '#e8452c', // vermilion
  R: '#a52a1c', // dark vermilion
  w: '#f4efe2', // white wall
  W: '#cfc8b4', // wall shade
  b: '#7a5230', // wood
  B: '#56381f', // dark wood
  y: '#ffd23f', // gold / light
  g: '#c2921c', // dark gold
  G: '#2f8a3c', // bamboo green
  l: '#7fd35a', // light green
  t: '#9a9a9a', // stone
  T: '#6e6e6e', // dark stone
  o: '#ff8a1e', // orange
  c: '#3d8fe0', // blue
  p: '#f6a5c0', // pink
};
/** Characters that stay bright at night (windows, lanterns, gold). */
export const LIT = new Set(['y', 'o']);

export const SPRITES = {
  pagoda: [
    '.....y.....',
    '.....y.....',
    '....sss....',
    '...sSSSs...',
    '....bRb....',
    '..sssssss..',
    '....bRb....',
    '.sssssssss.',
    '....bRb....',
    '.sssssssss.',
    '....bRb....',
    'sssssssssss',
    '....bkb....',
  ],
  torii: [
    'rrrrrrrrrrr',
    '.RRRRRRRRR.',
    '..r.....r..',
    '.rrrrrrrrr.',
    '..r.....r..',
    '..r.....r..',
    '..r.....r..',
    '..k.....k..',
  ],
  toriis: [
    '....rrrrrrrrrrr',
    '..rrRRRRRRRRRr.',
    'rrrRRr.....r.r.',
    '.RRrrrrrrrrr.r.',
    '..r.r.r....r.r.',
    '..r.r.r....r.k.',
    '..r.r.r....r...',
    '..k.k.r....r...',
    '......k....k...',
  ],
  shrine: [
    '....sssss....',
    '..sssSSSsss..',
    'sssssssssssss',
    '..rwwwwwwwr..',
    '..rwrrkrrwr..',
    '.rrrrrkrrrrr.',
    '.r.r.....r.r.',
    '.k.k.....k.k.',
  ],
  kinkaku: [
    '......y......',
    '.....ggg.....',
    '....ggggg....',
    '.....yyy.....',
    '..ggggggggg..',
    '...yyyyyyy...',
    '...ykykyky...',
    '.BBBBBBBBBBB.',
    '...wwwwwww...',
    '...wkwkwkw...',
    'ccccccccccccc',
  ],
  kiyomizu: [
    '.....sssss.....',
    '...sssSSSsss...',
    '.sssssssssssss.',
    '...bwwbwwbwwb..',
    '.BBBBBBBBBBBBB.',
    '.b.b.b.b.b.b.b.',
    '.bbbbbbbbbbbbb.',
    '.b.b.b.b.b.b.b.',
    '.b.b.b.b.b.b.b.',
  ],
  castle: [
    '.....sss.....',
    '...sssSsss...',
    '....wwwww....',
    '..sssssssss..',
    '...wwkwkww...',
    '.sssssssssss.',
    '..wwwwwwwww..',
    '.ttttttttttt.',
    'tTtTtTtTtTtTt',
  ],
  palace: [
    '...BBBBBBBBBBB...',
    '.BBBbbbbbbbbbBBB.',
    'BBBBBBBBBBBBBBBBB',
    '..wrwwrwwwrwwrw..',
    '..wrwwrwkwrwwrw..',
    '.ttttttttttttttt.',
  ],
  temple: [
    '....sssss....',
    '..sssSSSsss..',
    'sssssssssssss',
    '..bwwbwbwwb..',
    '..bwwbkbwwb..',
    '.ttttttttttt.',
  ],
  hall: [
    '.sssssssssssssss.',
    'sssSSSSSSSSSSSsss',
    '.bwbwbwbwbwbwbwb.',
    '.bwbwbwbkbwbwbwb.',
    '.ttttttttttttttt.',
  ],
  bamboo: [
    '.l..l.l..l.',
    'lGl.GlG.lGl',
    '.G.lG.G..G.',
    '.Gl.G.Gl.G.',
    '.G..Gl.G.G.',
    'lG..G..G.Gl',
    '.G..G..G.G.',
    '.G..G..G.G.',
    '.G..G..G.G.',
  ],
  bridge: [
    '.b...b...b...b...b.',
    'bbbbbbbbbbbbbbbbbbb',
    'BBBBBBBBBBBBBBBBBBB',
    '.B...B...B...B...B.',
  ],
  tower: [
    '...y...',
    '...w...',
    '...w...',
    '..ooo..',
    '.ooooo.',
    '.wkwkw.',
    '..ooo..',
    '...w...',
    '...w...',
    '...w...',
    '...w...',
    '..www..',
    '.ttttt.',
    '.tktkt.',
    '.ttttt.',
  ],
  market: [
    '.rryyGGrryyGG.',
    'rryyGGrryyGGrr',
    '.wwwwwwwwwwww.',
    '.wowkwpwkwlww.',
    '.bbbbbbbbbbbb.',
  ],
  lantern: [
    '..k..',
    '.rrr.',
    'rryrr',
    'ryyyr',
    'rryrr',
    '.rrr.',
    '..k..',
  ],
  machiya: [
    '..sssssssss..',
    '.sssSSSSSsss.',
    'sssssssssssss',
    '.bBbBbBbBbBb.',
    '.bBbkkBoBbBb.',
    '.bBbkkBbBbBb.',
  ],
} as const;

export type SpriteId = keyof typeof SPRITES;
