// crowly and 4ever mining, a creeper, a loop. Drawn pixel by pixel on a 256x96 canvas.
// Characters use real Minecraft skin layouts (front faces only).

const W = 256;
const H = 96;
const S = 2; // world pixel = 2x2 canvas pixels (blocks, ground, creeper)
const GROUND = 80;
const LOOP = 9.6;
const BLAST = { x: 160, y: 64 };

const STONE = ['#8b8b8b', '#7c7c7c', '#979797', '#6e6e6e'];
const DIRT = ['#866043', '#79553a', '#93694a', '#6c4c33'];
const GRASS = ['#5d9c3a', '#6cae46', '#548c34'];
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

export function startScene(canvas, { onDeath, onTags, reduceMotion, skins = {} } = {}) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const ground = Array.from({ length: W / 16 }, (_, i) => ({ dirt: texture(100 + i, DIRT), grass: texture(200 + i, GRASS) }));
  const miners = [
    { name: 'crowly', x: 40, phase: 0, skin: crowlySkin(), block: { x: 60, tex: texture(1, STONE) } },
    { name: '4ever', x: 104, phase: 0.27, skin: placeholderSkin(), block: { x: 124, tex: texture(2, STONE) } },
  ];

  // Swap in real skin files when they load (e.g. assets/img/skins/4ever.png).
  for (const m of miners) {
    const src = skins[m.name];
    if (!src) continue;
    const img = new Image();
    img.onload = () => { try { m.skin = skinFromImage(img); } catch {} };
    img.src = src;
  }

  onTags?.(miners.map((m) => ({ name: m.name, x: (m.x + 8) / W, y: (GROUND - HEIGHT - 4) / H })), true);

  let particles = [];
  let exploded = false;
  let poofed = false;

  function put(pixels, tint) {
    const seen = new Set();
    for (const [x, y, c] of pixels) {
      if (x < 0 || x >= W || y < 0 || y >= H) continue;
      const key = y * W + x;
      if (seen.has(key)) continue;
      seen.add(key);
      ctx.fillStyle = tint || c;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  function drawBlock(b, crack) {
    for (let j = 0; j < 8; j++) {
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = b.tex[j * 8 + i];
        ctx.fillRect(b.x + i * S, GROUND - 16 + j * S, S, S);
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    for (const [i, j] of CRACKS[crack]) ctx.fillRect(b.x + i * S, GROUND - 16 + j * S, S, S);
  }

  function drawGround(crater) {
    for (let x = 0; x < W; x += S) {
      const tile = ground[Math.floor(x / 16)];
      for (let y = GROUND; y < H; y += S) {
        if (crater) {
          const d = Math.hypot(x - BLAST.x, (y - GROUND) * 1.6);
          if (d < 22 - (y - GROUND) * 0.4) continue;
        }
        const k = ((y - GROUND) / S) * 8 + ((x / S) & 7);
        ctx.fillStyle = y - GROUND < 4 ? tile.grass[k] : tile.dirt[k];
        ctx.fillRect(x, y, S, S);
      }
    }
  }

  function minerPixels(m, t) {
    const top = GROUND - HEIGHT;
    const legTop = top + 8 + TORSO_ROWS.length;
    const sk = m.skin;
    const px = [];
    grid(rows(sk.armR, TORSO_ROWS), m.x, top + 8, px);
    grid(rows(sk.legR, LEG_ROWS), m.x + 4, legTop, px);
    grid(rows(sk.legL, LEG_ROWS), m.x + 8, legTop, px);
    grid(rows(sk.body, TORSO_ROWS), m.x + 4, top + 8, px);
    grid(sk.head, m.x + 4, top, px);
    // Swinging arm (the one facing the block) with the pickaxe.
    const arm = [];
    rows(sk.armL, TORSO_ROWS).forEach((row, y) => row.forEach((c, x) => c && arm.push([x - 2, y, c])));
    const angle = t < 6 ? swingAngle(t + m.phase) : -0.3;
    return px.concat(armSpace(arm.concat(PICKAXE), m.x + 14, top + 9, angle));
  }

  function spawnExplosion() {
    const r = Math.random;
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2;
      const s = 20 + r() * 90;
      particles.push({
        x: BLAST.x, y: BLAST.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20,
        life: 0.5 + r() * 0.8, age: 0, size: r() < 0.3 ? 4 : 2,
        c: ['#ffffff', '#e8e8e8', '#bdbdbd', '#8d8d8d', '#5c5c5c'][Math.floor(r() * 5)],
      });
    }
  }

  function spawnPoof(x, y) {
    for (let i = 0; i < 18; i++) {
      particles.push({
        x: x + Math.random() * 16 - 8, y: y + Math.random() * 10 - 5,
        vx: Math.random() * 16 - 8, vy: -8 - Math.random() * 16,
        life: 0.6 + Math.random() * 0.5, age: 0, size: 2,
        c: Math.random() < 0.5 ? '#f2f2f2' : '#c9c9c9',
      });
    }
  }

  function frame(t, dt) {
    ctx.clearRect(0, 0, W, H);

    if (t < 0.05 && exploded) {
      exploded = false;
      poofed = false;
      particles = [];
      onTags?.(null, true);
    }

    drawGround(t >= 6);

    const crack = t < 6 ? Math.floor((t % 2.4) / 0.6) : 0;
    for (const m of miners) {
      const close = Math.abs(m.block.x + 8 - BLAST.x) < 40;
      if (!(t >= 6 && close)) drawBlock(m.block, crack);
    }

    if (t < 7.2) {
      for (const m of miners) {
        let px = minerPixels(m, t);
        if (t >= 6) {
          const d = t - 6;
          const dist = m.x + 8 - BLAST.x;
          const push = Math.sign(dist) * Math.min(36, 1040 / Math.abs(dist));
          const dx = Math.round(push * easeOut(clamp01(d / 0.5)));
          const dy = -Math.round(10 * Math.sin(Math.PI * clamp01(d / 0.45)));
          const fall = (-Math.PI / 2) * easeOut(clamp01(d / 0.5));
          px = transform(px, m.x + 8, GROUND, fall, 1, dx, dy);
          put(px);
          if (d < 1) put(px, 'rgba(255,30,30,0.5)');
          continue;
        }
        put(px);
      }
    } else if (!poofed) {
      poofed = true;
      for (const m of miners) spawnPoof(m.x - 8, GROUND - 6);
    }

    if (t >= 2 && t < 6) {
      const walk = clamp01((t - 2) / 2.6);
      const stop = BLAST.x - 6;
      const cx = Math.round((W + 8 - (W + 8 - stop) * walk) / S) * S;
      const legs = CREEPER_LEGS[walk < 1 ? Math.floor(t * 6) % 2 : 0];
      const rows = CREEPER.concat(legs);
      let px = spriteScaled(rows, CREEPER_PAL, cx, GROUND - rows.length * S);
      const hiss = t >= 4.6;
      if (hiss) px = transform(px, cx + 6, GROUND, 0, 1 + 0.18 * clamp01((t - 4.6) / 1.4));
      put(px);
      if (hiss && Math.floor(t / 0.13) % 2 === 0) put(px, 'rgba(255,255,255,0.8)');
    }

    if (t >= 6 && !exploded) {
      exploded = true;
      spawnExplosion();
      onTags?.(null, false);
      onDeath?.(miners.map((m) => m.name));
    }

    if (t >= 6 && t < 6.15) {
      const r = 12 + (t - 6) * 180;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let y = Math.floor(BLAST.y - r); y <= BLAST.y + r; y++) {
        const half = Math.floor(Math.sqrt(Math.max(0, r * r - (y - BLAST.y) ** 2)));
        ctx.fillRect(BLAST.x - half, y, half * 2, 1);
      }
    }

    particles = particles.filter((p) => (p.age += dt) < p.life);
    for (const p of particles) {
      p.vx *= 0.94;
      p.vy = p.vy * 0.94 + 36 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.globalAlpha = 1 - p.age / p.life;
      ctx.fillStyle = p.c;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  if (reduceMotion) {
    const draw = () => frame(1.1, 0);
    draw();
    setTimeout(draw, 800); // redraw once a real skin file has had time to load
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
