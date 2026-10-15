// Two miners, a creeper, a loop. Everything is drawn pixel by pixel on a 128x48 canvas.

const W = 128;
const H = 48;
const GROUND = 40;
const LOOP = 9.6;

const MINER = [
  'hhhhhh',
  'hhhhhh',
  'hssssh',
  'sbssbs',
  'ssssss',
  'sshhss',
  'cccccc',
  'cccccc',
  'cccccc',
  'cccccc',
  'pppppp',
  'pppppp',
  'pp..pp',
  'oo..oo',
];
const MINER_PAL = { h: '#3b2a1a', s: '#c8946a', b: '#3a4fb5', c: '#2fa3b0', p: '#3b3f99', o: '#4a4a4a' };

const CREEPER = [
  'gGggGg',
  'ggGggg',
  'gkggkg',
  'gkggkg',
  'ggkkgG',
  'gkkkkg',
  'gkggkg',
  '.gGgg.',
  '.ggGg.',
  '.Gggg.',
  '.ggGg.',
];
const CREEPER_LEGS = [
  ['gg..gg', 'gG..Gg', 'GG..GG'],
  ['.gg.gg', '.gG.Gg', '.GG.GG'],
];
const CREEPER_PAL = { g: '#5aa83a', G: '#447f2b', k: '#111111' };

// Arm + pickaxe, in "arm space": origin at the shoulder, arm hanging along +y.
const ARM = [
  [0, 0, '#2fa3b0'], [0, 1, '#2fa3b0'], [0, 2, '#c8946a'], [0, 3, '#c8946a'],
  [0, 4, '#7a5230'], [0, 5, '#7a5230'], [0, 6, '#7a5230'], [0, 7, '#7a5230'],
  [-2, 8, '#cfd6d8'], [-1, 8, '#cfd6d8'], [0, 8, '#9aa3a6'], [1, 8, '#cfd6d8'], [2, 8, '#cfd6d8'],
  [-3, 9, '#9aa3a6'], [3, 9, '#9aa3a6'],
];

const STONE = ['#8b8b8b', '#7c7c7c', '#979797', '#6e6e6e'];
const DIRT = ['#866043', '#79553a', '#93694a', '#6c4c33'];
const GRASS = ['#5d9c3a', '#6cae46', '#548c34'];
const CRACKS = [
  [],
  [[3, 3], [4, 4], [4, 2]],
  [[3, 3], [4, 4], [4, 2], [2, 5], [5, 5], [1, 2], [6, 3]],
  [[3, 3], [4, 4], [4, 2], [2, 5], [5, 5], [1, 2], [6, 3], [1, 6], [6, 6], [2, 1], [5, 1], [3, 6], [6, 1]],
];

function rng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function texture(seed, colors) {
  const r = rng(seed);
  return Array.from({ length: 64 }, () => colors[Math.floor(r() * colors.length)]);
}

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t) => Math.max(0, Math.min(1, t));

// Turn a sprite into a list of world pixels.
function spritePixels(rows, pal, x, y) {
  const out = [];
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = pal[row[i]];
      if (c) out.push([x + i, y + j, c]);
    }
  });
  return out;
}

// Rotate/scale a set of pixels around a pivot, keeping hard pixel edges.
function transform(pixels, px, py, angle = 0, scale = 1, dx = 0, dy = 0) {
  if (!angle && scale === 1) return pixels.map(([x, y, c]) => [x + dx, y + dy, c]);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const out = [];
  for (const [x, y, c] of pixels) {
    // Sub-sample each pixel so rotation leaves no holes.
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

function armPixels(sx, sy, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const out = [];
  for (const [ax, ay, c] of ARM) {
    for (const o of [0.25, 0.75]) {
      const lx = ax + 0.5 - 0.5;
      const ly = ay + o;
      out.push([Math.floor(sx + 0.5 + lx * cos - ly * sin), Math.floor(sy + lx * sin + ly * cos), c]);
    }
  }
  return out;
}

// Swing: slow wind-up, fast strike. Angles in radians (0 = arm hanging down).
function swingAngle(t) {
  const p = t % 0.55 / 0.55;
  const up = -2.75;
  const hit = -0.95;
  return p < 0.65 ? hit + (up - hit) * easeOut(p / 0.65) : up + (hit - up) * ((p - 0.65) / 0.35) ** 2;
}

export function startScene(canvas, { onDeath, reduceMotion } = {}) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const ground = Array.from({ length: W / 8 }, (_, i) => ({ dirt: texture(100 + i, DIRT), grass: texture(200 + i, GRASS) }));
  const miners = [
    { x: 22, phase: 0, block: { x: 30, tex: texture(1, STONE) } },
    { x: 52, phase: 0.27, block: { x: 60, tex: texture(2, STONE) } },
  ];
  const boom = { x: 77, y: 33 };
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
        ctx.fillRect(b.x + i, GROUND - 8 + j, 1, 1);
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    for (const [i, j] of CRACKS[crack]) ctx.fillRect(b.x + i, GROUND - 8 + j, 1, 1);
  }

  function drawGround(crater) {
    for (let x = 0; x < W; x++) {
      const tile = ground[x >> 3];
      for (let y = GROUND; y < H; y++) {
        if (crater) {
          const d = Math.hypot(x - boom.x, (y - GROUND) * 1.6);
          if (d < 11 - (y - GROUND) * 0.4) continue;
        }
        const k = (y - GROUND) * 8 + (x & 7);
        ctx.fillStyle = y - GROUND < 2 ? tile.grass[k] : tile.dirt[k];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  function spawnExplosion() {
    const r = Math.random;
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2;
      const s = 10 + r() * 45;
      particles.push({
        x: boom.x, y: boom.y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 10,
        life: 0.5 + r() * 0.8, age: 0,
        size: r() < 0.3 ? 2 : 1,
        c: ['#ffffff', '#e8e8e8', '#bdbdbd', '#8d8d8d', '#5c5c5c'][Math.floor(r() * 5)],
      });
    }
  }

  function spawnPoof(x, y) {
    for (let i = 0; i < 14; i++) {
      particles.push({
        x: x + Math.random() * 8 - 4, y: y + Math.random() * 6 - 3,
        vx: Math.random() * 8 - 4, vy: -4 - Math.random() * 8,
        life: 0.6 + Math.random() * 0.5, age: 0, size: 1,
        c: Math.random() < 0.5 ? '#f2f2f2' : '#c9c9c9',
      });
    }
  }

  function minerPixels(m, t) {
    const top = GROUND - MINER.length;
    const body = spritePixels(MINER, MINER_PAL, m.x, top);
    const angle = t < 6 ? swingAngle(t + m.phase) : -0.3;
    return body.concat(armPixels(m.x + 6, top + 6, angle));
  }

  function frame(t, dt) {
    ctx.clearRect(0, 0, W, H);

    // Reset at the start of every loop.
    if (t < 0.05 && exploded) {
      exploded = false;
      poofed = false;
      particles = [];
    }

    drawGround(t >= 6);

    const crack = t < 6 ? Math.floor((t % 2.4) / 0.6) : 0;
    for (const m of miners) {
      const close = Math.abs(m.block.x + 4 - boom.x) < 20;
      if (!(t >= 6 && close)) drawBlock(m.block, crack);
    }

    // Miners.
    if (t < 7.2) {
      for (const m of miners) {
        let px = minerPixels(m, t);
        let tint = null;
        if (t >= 6) {
          const d = t - 6;
          const dist = m.x + 3 - boom.x;
          const push = Math.sign(dist) * Math.min(18, 260 / Math.abs(dist));
          const dx = Math.round(push * easeOut(clamp01(d / 0.5)));
          const dy = -Math.round(5 * Math.sin(Math.PI * clamp01(d / 0.45)));
          const fall = -Math.PI / 2 * easeOut(clamp01(d / 0.5));
          px = transform(px, m.x + 3, GROUND, fall, 1, dx, dy);
          tint = d < 1 ? 'rgba(255,30,30,0.5)' : null;
          put(px);
          if (tint) put(px, tint);
          continue;
        }
        put(px);
      }
    } else if (!poofed) {
      poofed = true;
      for (const m of miners) spawnPoof(m.x - 6, GROUND - 3);
    }

    // Creeper: walk in, hiss, explode.
    if (t >= 2 && t < 6) {
      const walk = clamp01((t - 2) / 2.6);
      const cx = Math.round(134 - (134 - (boom.x - 3)) * walk);
      const moving = walk < 1;
      const legs = CREEPER_LEGS[moving ? Math.floor(t * 6) % 2 : 0];
      const rows = CREEPER.concat(legs);
      let px = spritePixels(rows, CREEPER_PAL, cx, GROUND - rows.length);
      const hiss = t >= 4.6;
      if (hiss) {
        const s = 1 + 0.18 * clamp01((t - 4.6) / 1.4);
        px = transform(px, cx + 3, GROUND, 0, s);
      }
      put(px);
      if (hiss && Math.floor(t / 0.13) % 2 === 0) put(px, 'rgba(255,255,255,0.8)');
    }

    if (t >= 6 && !exploded) {
      exploded = true;
      spawnExplosion();
      onDeath?.();
    }

    // Flash on the frame of the blast.
    if (t >= 6 && t < 6.15) {
      const r = 6 + (t - 6) * 90;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let y = Math.floor(boom.y - r); y <= boom.y + r; y++) {
        const half = Math.floor(Math.sqrt(Math.max(0, r * r - (y - boom.y) ** 2)));
        ctx.fillRect(boom.x - half, y, half * 2, 1);
      }
    }

    particles = particles.filter((p) => (p.age += dt) < p.life);
    for (const p of particles) {
      p.vx *= 0.94;
      p.vy = p.vy * 0.94 + 18 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.globalAlpha = 1 - p.age / p.life;
      ctx.fillStyle = p.c;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  if (reduceMotion) {
    frame(1.1, 0);
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
