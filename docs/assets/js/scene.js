// crowly and 4ever in a torch-lit cave: mining, crafting, a diamond, a creeper. Loops.
// Drawn pixel by pixel on a 256x96 canvas. Characters use real Minecraft skin layouts (front faces only).

const W = 256;
const H = 96;
const S = 2; // world pixel = 2x2 canvas pixels (blocks, creeper)
const GROUND = 80;

const STONE = ['#8b8b8b', '#7c7c7c', '#979797', '#6e6e6e'];
const CRACKS = [
  [],
  [[3, 3], [4, 4], [4, 2]],
  [[3, 3], [4, 4], [4, 2], [2, 5], [5, 5], [1, 2], [6, 3]],
  [[3, 3], [4, 4], [4, 2], [2, 5], [5, 5], [1, 2], [6, 3], [1, 6], [6, 6], [2, 1], [5, 1], [3, 6], [6, 1]],
];

const CREEPER = [
  'gGggGg', 'ggGggg', 'gkggkg', 'gkggkg', 'ggkkgG', 'gkkkkg', 'gkggkg',
  '.gGgg.', '.ggGg.', '.Gggg.', '.ggGg.',
];
const CREEPER_LEGS = [
  ['gg..gg', 'gG..Gg', 'GG..GG'],
  ['.gg.gg', '.gG.Gg', '.GG.GG'],
];
const CREEPER_PAL = { g: '#5aa83a', G: '#447f2b', k: '#111111' };

// Pickaxe in arm space (canvas pixels): origin at the shoulder, arm hanging along +y.
const PICKAXE = (() => {
  const px = [];
  for (let y = 7; y < 17; y++) for (const x of [-1, 0]) px.push([x, y, y % 3 ? '#7a5230' : '#5e3f24']);
  for (let x = -7; x <= 6; x++) px.push([x, 17, '#cfd6d8'], [x, 18, x === -7 || x === 6 ? '#cfd6d8' : '#9aa3a6']);
  for (const x of [-8, -7, 6, 7]) px.push([x, 19, '#9aa3a6']);
  return px;
})();

/* skins */

// crowly: face taken pixel-for-pixel from the Discord avatar, dark outfit to match.
const CROWLY_FACE = [
  '252525 080808 000000 080808 0f0f0f 000000 080808 252525',
  '232323 212121 ffffff ffffff ffffff ffffff 212121 232323',
  'ffffff ffffff 0c0c0c 0e0e0e 191919 0c0c0c ffffff ffffff',
  '0b0b0b 1c1c1c 0e0e0e 181818 1d1d1d 0e0e0e 1c1c1c 0b0b0b',
  '0c0c0c 161616 0c0c0c 141414 161616 0c0c0c 161616 0c0c0c',
  '0b0b0b 121212 0b0b0b efefef efefef 1a1a1a 9d9d9d 0b0b0b',
  '080808 0c0c0c 414141 efefef efefef 414141 b7b7b7 080808',
  '000000 080808 efefef efefef efefef efefef 080808 000000',
].map((r) => r.split(' ').map((h) => '#' + h));

function fill(w, h, fn) {
  return Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => fn(x, y)));
}

function noise(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function crowlySkin() {
  const r = noise(7);
  const dark = () => ['#141414', '#191919', '#101010', '#1d1d1d'][Math.floor(r() * 4)];
  return {
    head: CROWLY_FACE,
    body: fill(8, 12, (x, y) => (y === 0 ? '#262626' : dark())),
    armR: fill(4, 12, (x, y) => (y > 9 ? '#0b0b0b' : dark())),
    armL: fill(4, 12, (x, y) => (y > 9 ? '#0b0b0b' : dark())),
    legR: fill(4, 12, (x, y) => (y > 9 ? '#2a2a2a' : '#0e0e0e')),
    legL: fill(4, 12, (x, y) => (y > 9 ? '#2a2a2a' : '#0e0e0e')),
  };
}

// Used for 4ever until the real skin file loads.
function placeholderSkin() {
  const r = noise(11);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const face = fill(8, 8, (x, y) => {
    if (y < 2 || (y === 2 && (x === 0 || x === 7))) return pick(['#3b2a1a', '#33241a']);
    if (y === 4 && (x === 1 || x === 6)) return '#ffffff';
    if (y === 4 && (x === 2 || x === 5)) return '#4f3a8f';
    if (y === 6 && x > 1 && x < 6) return '#8a5a44';
    return pick(['#c8946a', '#bd8b62']);
  });
  return {
    head: face,
    body: fill(8, 12, () => pick(['#6b3fa0', '#5f378f', '#7546ad'])),
    armR: fill(4, 12, (x, y) => (y < 4 ? '#6b3fa0' : '#c8946a')),
    armL: fill(4, 12, (x, y) => (y < 4 ? '#6b3fa0' : '#c8946a')),
    legR: fill(4, 12, (x, y) => (y > 9 ? '#3a3a3a' : '#2b2f5a')),
    legL: fill(4, 12, (x, y) => (y > 9 ? '#3a3a3a' : '#2b2f5a')),
  };
}

// Read the front faces out of a standard 64x64 (or legacy 64x32) skin PNG.
function skinFromImage(img) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const scale = c.width / 64;
  const data = g.getImageData(0, 0, c.width, c.height).data;
  const at = (x, y) => {
    const i = ((y * scale) * c.width + x * scale) * 4;
    return data[i + 3] > 20 ? `rgb(${data[i]},${data[i + 1]},${data[i + 2]})` : null;
  };
  const legacy = c.height / scale < 64;
  const face = (x0, y0, w, h, ox, oy, mirror = false) =>
    fill(w, h, (x, y) => {
      const sx = mirror ? x0 + w - 1 - x : x0 + x;
      const over = ox != null && !legacy ? at((mirror ? ox + w - 1 - x : ox + x), oy + y) : null;
      return over || at(sx, y0 + y) || '#000000';
    });
  const hat = fill(8, 8, (x, y) => at(40 + x, 8 + y));
  const head = face(8, 8, 8, 8).map((row, y) => row.map((c, x) => hat[y][x] || c));
  return {
    head,
    body: face(20, 20, 8, 12, 20, 36),
    armR: face(44, 20, 4, 12, 44, 36),
    armL: legacy ? face(44, 20, 4, 12, null, null, true) : face(36, 52, 4, 12, 52, 52),
    legR: face(4, 20, 4, 12, 4, 36),
    legL: legacy ? face(4, 20, 4, 12, null, null, true) : face(20, 52, 4, 12, 4, 52),
  };
}

/* drawing helpers */

// Squashed proportions: keep the 8x8 head, drop rows from the body, arms and legs.
const TORSO_ROWS = [0, 1, 3, 4, 6, 7, 9, 11];
const LEG_ROWS = [0, 2, 4, 7, 9, 11];
const HEIGHT = 8 + TORSO_ROWS.length + LEG_ROWS.length;
const rows = (tex, pick) => pick.map((i) => tex[i]);

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t) => Math.max(0, Math.min(1, t));

function texture(seed, colors) {
  const r = noise(seed);
  return Array.from({ length: 64 }, () => colors[Math.floor(r() * colors.length)]);
}

function grid(rows, x, y, out = []) {
  rows.forEach((row, j) => row.forEach((c, i) => c && out.push([x + i, y + j, c])));
  return out;
}

function spriteScaled(rows, pal, x, y) {
  const out = [];
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = pal[row[i]];
      if (!c) continue;
      for (let a = 0; a < S; a++) for (let b = 0; b < S; b++) out.push([x + i * S + a, y + j * S + b, c]);
    }
  });
  return out;
}

function transform(pixels, px, py, angle = 0, scale = 1, dx = 0, dy = 0) {
  if (!angle && scale === 1) return pixels.map(([x, y, c]) => [x + dx, y + dy, c]);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const out = [];
  for (const [x, y, c] of pixels) {
    for (const ox of [0.25, 0.75]) {
      for (const oy of [0.25, 0.75]) {
        const lx = (x + ox - px) * scale;
        const ly = (y + oy - py) * scale;
        out.push([Math.floor(px + lx * cos - ly * sin + dx), Math.floor(py + lx * sin + ly * cos + dy), c]);
      }
    }
  }
  return out;
}

function armSpace(pixels, sx, sy, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const out = [];
  for (const [ax, ay, c] of pixels) {
    for (const ox of [0.25, 0.75]) {
      for (const oy of [0.25, 0.75]) {
        const lx = ax + ox;
        const ly = ay + oy;
        out.push([Math.floor(sx + lx * cos - ly * sin), Math.floor(sy + lx * sin + ly * cos), c]);
      }
    }
  }
  return out;
}

function swingAngle(t) {
  const p = (t % 0.55) / 0.55;
  const up = -2.75;
  const hit = -0.95;
  return p < 0.65 ? hit + (up - hit) * easeOut(p / 0.65) : up + (hit - up) * ((p - 0.65) / 0.35) ** 2;
}

/* scene */

// The story, in seconds:
//  0.0  crowly mines the stone wall, 4ever crafts at the table
//  2.4  stone breaks, diamond ore behind it
//  4.4  diamond ore breaks, crowly picks the diamond up
//  4.9  walks back to 4ever
//  7.1  shows him the diamond, then both jump around
//  8.6  a creeper fades in out of the dark behind them
// 11.0  boom
const LOOP = 13.8;
const T = { stoneBreak: 2.4, oreBreak: 4.4, pickup: 4.9, walkEnd: 7.1, jump: 7.7, creeperIn: 8.6, creeperStop: 9.8, hiss: 9.8, boom: 11.0, poof: 12.2 };
const BLAST = { x: 116, y: 64 };

const DEEP = ['#3b3a39', '#343332', '#413f3e', '#2e2d2c'];
const ORE = { pal: STONE, specks: [[1, 1], [2, 1], [5, 2], [6, 3], [2, 4], [3, 5], [5, 6], [6, 6], [1, 6]] };
const TABLE = {
  rows: ['tTtTtTtT', 'pppppppp', 'pkkpppbp', 'pkppppbp', 'pppppbbp', 'pppppppp', 'dpdpdpdp', 'dddddddd'],
  pal: { t: '#c09a5b', T: '#9c7840', p: '#9a6b3f', k: '#5a5a5a', b: '#6e4a2a', d: '#6b4a2b' },
};
const DIAMOND = {
  rows: ['...cc...', '..cCCc..', '.cCwCCc.', 'cCwCCCCc', '.cCCCCc.', '..cCCc..', '...cc...'],
  pal: { c: '#1fa6a8', C: '#5fe8ea', w: '#e8ffff' },
};
const ICONS = [
  { rows: ['......ww', '.....wCw', '....wCw.', '.w.wCw..', '..wCw...', '..bw....', '.b..w...', 'b.......'], pal: { w: '#e6e6e6', C: '#a8a8a8', b: '#7a5230' } },
  { rows: ['.cccc...', 'c...bc..', '....b.c.', '...b..c.', '..b.....', '.b......', 'b.......'], pal: { c: '#b9c0c2', b: '#7a5230' } },
];
const TORCHES = [{ x: 22, y: 34 }, { x: 160, y: 30 }];

const CRAFTER = { x: 40 };
const TABLE_X = 60;
const MINE_X = 190;
const HOME_X = 82;
const TARGET = { x: 208, y: 64 };

// Diamond in arm space: held at the hand.
const HELD_DIAMOND = (() => {
  const px = [];
  DIAMOND.rows.forEach((row, y) => [...row].forEach((ch, x) => DIAMOND.pal[ch] && px.push([x - 4, y + 6, DIAMOND.pal[ch]])));
  return px;
})();

function smallSprite(rows, pal, x, y) {
  const out = [];
  rows.forEach((row, j) => [...row].forEach((ch, i) => pal[ch] && out.push([x + i, y + j, pal[ch]])));
  return out;
}

export function startScene(canvas, { onDeath, onTags, reduceMotion, skins = {} } = {}) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const crowly = { name: 'crowly', skin: crowlySkin() };
  const forever = { name: '4ever', skin: placeholderSkin() };
  const people = [crowly, forever];

  for (const p of people) {
    const src = skins[p.name];
    if (!src) continue;
    const img = new Image();
    img.onload = () => { try { p.skin = skinFromImage(img); } catch {} };
    img.src = src;
  }

  // Static cave, drawn once.
  const bg = document.createElement('canvas');
  bg.width = W;
  bg.height = H;
  const b = bg.getContext('2d');
  const tile = (x, y, tex, dim = 0) => {
    for (let j = 0; j < 8; j++) {
      for (let i = 0; i < 8; i++) {
        b.fillStyle = tex[j * 8 + i];
        b.fillRect(x + i * S, y + j * S, S, S);
      }
    }
    if (dim) {
      b.fillStyle = `rgba(0,0,0,${dim})`;
      b.fillRect(x, y, 16, 16);
    }
  };
  let seed = 300;
  for (let y = 0; y < H; y += 16) for (let x = 0; x < W; x += 16) tile(x, y, texture(seed++, DEEP), 0.15);
  const CEILING = [1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1];
  for (let x = 0; x < W; x += 16) {
    tile(x, 0, texture(seed++, STONE), 0.25);
    if (CEILING[x / 16]) tile(x, 16, texture(seed++, STONE), 0.3);
  }
  for (let x = 0; x < W; x += 16) tile(x, GROUND, texture(seed++, STONE), 0.1);
  b.fillStyle = 'rgba(255,255,255,0.1)';
  b.fillRect(0, GROUND, 208, 1);
  for (let y = 16; y < GROUND; y += 16) for (let x = 224; x < W; x += 16) tile(x, y, texture(seed++, STONE), 0.1);
  for (let y = 16; y < 64; y += 16) tile(208, y, texture(seed++, STONE), 0.1);
  for (let j = 0; j < 8; j++) {
    for (let i = 0; i < 8; i++) {
      b.fillStyle = TABLE.pal[TABLE.rows[j][i]];
      b.fillRect(TABLE_X + i * S, GROUND - 16 + j * S, S, S);
    }
  }
  for (const t of TORCHES) {
    b.fillStyle = '#6b4a2b';
    b.fillRect(t.x, t.y + 4, 2, 9);
    b.fillStyle = '#4d351f';
    b.fillRect(t.x + 1, t.y + 4, 1, 9);
  }

  const stoneTex = texture(1, STONE);
  const oreTex = texture(1, ORE.pal).slice();
  const speck = ['#5decf5', '#2bc7c9', '#d5ffff'];
  ORE.specks.forEach(([i, j], k) => { oreTex[j * 8 + i] = speck[k % 3]; });

  const dark = document.createElement('canvas');
  dark.width = W;
  dark.height = H;
  const d = dark.getContext('2d');

  let particles = [];
  let fired = {};

  function put(pixels, tint, alpha = 1) {
    const seen = new Set();
    ctx.globalAlpha = alpha;
    for (const [x, y, c] of pixels) {
      if (x < 0 || x >= W || y < 0 || y >= H) continue;
      const key = y * W + x;
      if (seen.has(key)) continue;
      seen.add(key);
      ctx.fillStyle = tint || c;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawTarget(tex, crack) {
    for (let j = 0; j < 8; j++) {
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = tex[j * 8 + i];
        ctx.fillRect(TARGET.x + i * S, TARGET.y + j * S, S, S);
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    for (const [i, j] of CRACKS[crack]) ctx.fillRect(TARGET.x + i * S, TARGET.y + j * S, S, S);
  }

  function burst(x, y, colors, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random());
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.4, life: 0.5 + Math.random() * 0.7, age: 0, size: Math.random() < 0.3 ? 3 : 2, c: colors[Math.floor(Math.random() * colors.length)], g: 60 });
    }
  }

  // A character's pixels at position x, jump height jy, arm angle and held item.
  function personPixels(p, x, jy, angle, held, walking, t) {
    const top = GROUND - HEIGHT - jy;
    const legTop = top + 8 + TORSO_ROWS.length;
    const sk = p.skin;
    const step = walking ? Math.floor(t * 8) % 2 : -1;
    const px = [];
    grid(rows(sk.armR, TORSO_ROWS), x, top + 8, px);
    grid(rows(sk.legR, LEG_ROWS), x + 4, legTop - (step === 0 ? 1 : 0), px);
    grid(rows(sk.legL, LEG_ROWS), x + 8, legTop - (step === 1 ? 1 : 0), px);
    grid(rows(sk.body, TORSO_ROWS), x + 4, top + 8, px);
    grid(sk.head, x + 4, top, px);
    const arm = [];
    rows(sk.armL, TORSO_ROWS).forEach((row, y) => row.forEach((c, i) => c && arm.push([i - 2, y, c])));
    return px.concat(armSpace(held ? arm.concat(held) : arm, x + 14, top + 9, angle));
  }

  function hop(t, start) {
    if (t < start) return 0;
    return Math.round(Math.abs(Math.sin(((t - start) / 0.45) * Math.PI)) * 7);
  }

  function frame(t, dt) {
    if (t < (fired.t ?? 0)) { fired = {}; particles = []; }
    fired.t = t;
    const once = (key) => (fired[key] ? false : (fired[key] = true));

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(bg, 0, 0);

    // Wall block: stone, then diamond ore, then a hole.
    if (t < T.stoneBreak) drawTarget(stoneTex, Math.min(3, Math.floor(t / 0.6)));
    else if (t < T.oreBreak) drawTarget(oreTex, Math.min(3, Math.floor((t - T.stoneBreak) / 0.5)));
    if (t >= T.stoneBreak && once('stone')) burst(TARGET.x + 8, TARGET.y + 8, STONE, 18, 40);
    if (t >= T.oreBreak && once('ore')) burst(TARGET.x + 8, TARGET.y + 8, ['#5decf5', '#8b8b8b', '#7c7c7c', '#d5ffff'], 20, 40);

    const dead = t >= T.boom;

    // crowly: position, arm and what's in hand.
    let cx = MINE_X;
    let cAngle = swingAngle(t);
    let cHeld = PICKAXE;
    let walking = false;
    if (t >= T.oreBreak) {
      cAngle = -0.4;
      cHeld = t >= T.pickup ? HELD_DIAMOND : null;
    }
    if (t >= T.pickup && t < T.walkEnd) {
      const k = (t - T.pickup) / (T.walkEnd - T.pickup);
      cx = Math.round(MINE_X + (HOME_X - MINE_X) * k);
      cAngle = -0.35 + Math.sin(t * 12) * 0.35;
      walking = true;
    } else if (t >= T.walkEnd) {
      cx = HOME_X;
      cAngle = -2.6 + Math.sin(t * 9) * 0.15;
    }
    const cJump = dead ? 0 : hop(t, T.jump);

    // 4ever: crafting until crowly is back, then celebrating.
    let fAngle = -1.25 + Math.sin(t * 18) * 0.35;
    if (t >= T.walkEnd) fAngle = t >= T.jump ? -2.4 + Math.sin(t * 14) * 0.4 : -0.5;
    const fJump = dead ? 0 : hop(t, T.jump + 0.2);

    // Crafted tools popping out of the table.
    if (t < T.walkEnd) {
      const k = (t % 1.6) / 1.1;
      if (k < 1) {
        const icon = ICONS[Math.floor(t / 1.6) % ICONS.length];
        put(smallSprite(icon.rows, icon.pal, TABLE_X + 4, GROUND - 22 - Math.round(k * 12)), null, 1 - k);
      }
    }

    // Diamond item: pops out, bobs, then flies to crowly.
    if (t >= T.oreBreak && t < T.pickup) {
      const k = (t - T.oreBreak) / (T.pickup - T.oreBreak);
      const ix = Math.round(TARGET.x + 4 + (MINE_X + 14 - TARGET.x - 4) * easeOut(k));
      const iy = Math.round(TARGET.y + 6 - Math.sin(k * Math.PI) * 10);
      put(smallSprite(DIAMOND.rows, DIAMOND.pal, ix, iy));
    }

    // Creeper fades in from the dark behind them.
    if (t >= T.creeperIn && t < T.boom) {
      const walk = clamp01((t - T.creeperIn) / (T.creeperStop - T.creeperIn));
      const x = Math.round((BLAST.x + 10 - 10 * walk - 6) / S) * S;
      const legs = CREEPER_LEGS[walk < 1 ? Math.floor(t * 6) % 2 : 0];
      const body = CREEPER.concat(legs);
      let px = spriteScaled(body, CREEPER_PAL, x, GROUND - body.length * S);
      const hiss = t >= T.hiss;
      if (hiss) px = transform(px, x + 6, GROUND, 0, 1 + 0.18 * clamp01((t - T.hiss) / (T.boom - T.hiss)));
      put(px, null, clamp01((t - T.creeperIn) / 0.9));
      if (hiss && Math.floor(t / 0.13) % 2 === 0) put(px, 'rgba(255,255,255,0.8)');
    }

    // The two of them.
    if (t < T.poof) {
      const actors = [
        { p: forever, px: personPixels(forever, CRAFTER.x, fJump, fAngle, null, false, t), x: CRAFTER.x },
        { p: crowly, px: personPixels(crowly, cx, cJump, cAngle, cHeld, walking, t), x: cx },
      ];
      for (const a of actors) {
        if (!dead) { put(a.px); continue; }
        const k = t - T.boom;
        const dist = a.x + 8 - BLAST.x;
        const push = Math.sign(dist || -1) * Math.min(30, 900 / Math.max(10, Math.abs(dist)));
        const px = transform(a.px, a.x + 8, GROUND, (-Math.PI / 2) * easeOut(clamp01(k / 0.5)), 1,
          Math.round(push * easeOut(clamp01(k / 0.5))), -Math.round(10 * Math.sin(Math.PI * clamp01(k / 0.45))));
        put(px);
        if (k < 1) put(px, 'rgba(255,30,30,0.5)');
      }
      onTags?.(dead ? null : [
        { name: forever.name, x: (CRAFTER.x + 8) / W, y: (GROUND - HEIGHT - fJump - 3) / H },
        { name: crowly.name, x: (cx + 8) / W, y: (GROUND - HEIGHT - cJump - 3) / H },
      ], !dead);
    } else if (once('poof')) {
      for (const x of [CRAFTER.x - 8, HOME_X - 12]) burst(x + 8, GROUND - 6, ['#f2f2f2', '#c9c9c9'], 16, 14);
    }

    if (dead && once('boom')) {
      burst(BLAST.x, BLAST.y, ['#ffffff', '#e8e8e8', '#bdbdbd', '#8d8d8d', '#5c5c5c'], 90, 70);
      onDeath?.(people.map((p) => p.name));
    }

    // Crater in the cave floor.
    if (dead) {
      ctx.fillStyle = '#161412';
      for (let y = GROUND; y < GROUND + 10; y += S) {
        const half = Math.floor(Math.sqrt(Math.max(0, 20 * 20 - ((y - GROUND) * 2.2) ** 2)));
        ctx.fillRect(Math.round((BLAST.x - half) / S) * S, y, Math.round((half * 2) / S) * S, S);
      }
    }

    particles = particles.filter((p) => (p.age += dt) < p.life);
    for (const p of particles) {
      p.vx *= 0.94;
      p.vy = p.vy * 0.94 + p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.globalAlpha = 1 - p.age / p.life;
      ctx.fillStyle = p.c;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // Lighting: darkness everywhere except around the torches (and the blast).
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, W, H);
    d.fillStyle = 'rgba(8,6,12,0.52)';
    d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = 'destination-out';
    const lights = TORCHES.map((tc, i) => ({ x: tc.x + 1, y: tc.y + 2, r: 68 + Math.sin(t * 7 + i * 2) * 3 + Math.sin(t * 13 + i) * 2 }));
    if (t >= T.boom && t < T.boom + 0.5) lights.push({ x: BLAST.x, y: BLAST.y, r: 120 * (1 - (t - T.boom) / 0.5) });
    for (const l of lights) {
      const g = d.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.55, 'rgba(0,0,0,0.6)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g;
      d.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
    ctx.drawImage(dark, 0, 0);

    // Warm torch glow and flames on top.
    ctx.globalCompositeOperation = 'lighter';
    for (const l of lights.slice(0, TORCHES.length)) {
      const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.7);
      g.addColorStop(0, 'rgba(255,160,60,0.26)');
      g.addColorStop(1, 'rgba(255,160,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    TORCHES.forEach((tc, i) => {
      const f = Math.floor(t * 10 + i * 3) % 3;
      ctx.fillStyle = '#ffdd55';
      ctx.fillRect(tc.x, tc.y + 1, 2, 3);
      ctx.fillStyle = f === 0 ? '#ff9a2e' : '#ffbe3d';
      ctx.fillRect(tc.x + (f === 2 ? 1 : 0), tc.y - 1 + (f === 1 ? 1 : 0), 1, 2);
    });

    if (t >= T.boom && t < T.boom + 0.15) {
      const r = 12 + (t - T.boom) * 180;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let y = Math.floor(BLAST.y - r); y <= BLAST.y + r; y++) {
        const half = Math.floor(Math.sqrt(Math.max(0, r * r - (y - BLAST.y) ** 2)));
        ctx.fillRect(BLAST.x - half, y, half * 2, 1);
      }
    }
  }

  if (reduceMotion) {
    const draw = () => frame(1.1, 0);
    draw();
    setTimeout(draw, 800);
    return () => {};
  }

  let raf = 0;
  let last = 0;
  let clock = 0;
  let visible = true;

  const tick = (now) => {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000 || 0));
    last = now;
    clock = (clock + dt) % LOOP;
    frame(clock, dt);
    raf = requestAnimationFrame(tick);
  };
  const start = () => {
    if (raf || !visible || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const onVis = () => (document.hidden ? stop() : start());

  let io;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      visible ? start() : stop();
    });
    io.observe(canvas);
  }
  document.addEventListener('visibilitychange', onVis);
  start();

  return () => {
    stop();
    io?.disconnect();
    document.removeEventListener('visibilitychange', onVis);
  };
}
