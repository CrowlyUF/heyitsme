// "See what I do": a TNT falls on the button, the fuse blinks, it blows up and the section appears.

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Sounds are synthesised on the fly; no audio files to load.
let audio = null;
function getAudio() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    return audio;
  } catch {
    return null;
  }
}

function noiseBuffer(ac, seconds) {
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * seconds), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function playFuse(seconds) {
  const ac = getAudio();
  if (!ac) return;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac, seconds);
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 3500;
  const gain = ac.createGain();
  const now = ac.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.1);
  gain.gain.setValueAtTime(0.06, now + seconds - 0.1);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  src.connect(hp).connect(gain).connect(ac.destination);
  src.start(now);
}

function playBoom() {
  const ac = getAudio();
  if (!ac) return;
  const now = ac.currentTime;
  const out = ac.createGain();
  out.gain.value = 0.7;
  const comp = ac.createDynamicsCompressor();
  out.connect(comp).connect(ac.destination);

  // Rumble: filtered noise that darkens as it fades.
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac, 2.2);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(2400, now);
  lp.frequency.exponentialRampToValueAtTime(140, now + 1.6);
  const ng = ac.createGain();
  ng.gain.setValueAtTime(1, now);
  ng.gain.exponentialRampToValueAtTime(0.001, now + 2.1);
  src.connect(lp).connect(ng).connect(out);
  src.start(now);

  // Thump: a fast pitch drop for the punch.
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(110, now);
  osc.frequency.exponentialRampToValueAtTime(32, now + 0.5);
  const og = ac.createGain();
  og.gain.setValueAtTime(1, now);
  og.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
  osc.connect(og).connect(out);
  osc.start(now);
  osc.stop(now + 0.75);
}

function explode(cx, cy) {
  const canvas = document.createElement('canvas');
  canvas.className = 'boom-canvas';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return Promise.resolve(); }
  ctx.scale(dpr, dpr);

  const unit = Math.max(6, Math.min(14, window.innerWidth / 90));
  const colors = ['#ffffff', '#ececec', '#c8c8c8', '#9a9a9a', '#6a6a6a', '#454545'];
  const parts = [];
  for (let i = 0; i < 120; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 180 + Math.random() * 900;
    parts.push({
      x: cx, y: cy,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120,
      size: unit * (0.6 + Math.random() * 1.6),
      life: 0.6 + Math.random() * 0.9, age: 0,
      c: i < 18 ? (Math.random() < 0.5 ? '#ffd451' : '#ff8a2a') : colors[Math.floor(Math.random() * colors.length)],
    });
  }
  // A few TNT shards, in the block's own colours.
  for (let i = 0; i < 16; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
    const s = 300 + Math.random() * 500;
    parts.push({
      x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      size: unit * 0.9, life: 1.2 + Math.random() * 0.4, age: 0, gravity: true,
      c: Math.random() < 0.7 ? '#d6402f' : '#ececec',
    });
  }

  return new Promise((resolve) => {
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      let alive = 0;
      for (const p of parts) {
        p.age += dt;
        if (p.age >= p.life) continue;
        alive++;
        const drag = p.gravity ? 0.985 : 0.9;
        p.vx *= drag;
        p.vy = p.vy * drag + (p.gravity ? 1400 : 160) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const k = 1 - p.age / p.life;
        ctx.globalAlpha = Math.min(1, k * 1.4);
        ctx.fillStyle = p.c;
        const s = Math.max(1, p.size * (p.gravity ? 1 : 0.4 + k * 0.6));
        ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), Math.round(s), Math.round(s));
      }
      if (alive) requestAnimationFrame(step);
      else { canvas.remove(); resolve(); }
    };
    requestAnimationFrame(step);
  });
}

export function initTnt({ reduceMotion }) {
  const btn = document.querySelector('[data-reveal-btn]');
  const target = document.querySelector('[data-reveal-target]');
  if (!btn || !target) return;
  const title = target.querySelector('#wid-title');
  let busy = false;

  const reveal = () => {
    target.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      title?.focus({ preventScroll: true });
    });
  };

  btn.addEventListener('click', async () => {
    if (busy || btn.getAttribute('aria-expanded') === 'true') return;
    busy = true;

    if (reduceMotion) {
      btn.closest('.cta').hidden = true;
      reveal();
      return;
    }

    getAudio(); // unlock audio inside the click
    const r = btn.getBoundingClientRect();
    const size = 72;
    const left = r.left + r.width / 2 - size / 2;
    const land = r.top - size + 10;

    const tnt = document.createElement('div');
    tnt.className = 'tnt-drop';
    tnt.style.left = `${left}px`;
    tnt.style.top = `${-size - 20}px`;
    tnt.innerHTML = '<svg viewBox="0 0 16 16"><use href="#i-tnt"/></svg>';
    document.body.append(tnt);

    const fallDist = land + size + 20;
    const fall = tnt.animate(
      [
        { transform: 'translateY(0) rotate(-8deg)', easing: 'cubic-bezier(.55,0,1,.45)' },
        { transform: `translateY(${fallDist}px) rotate(0deg)`, offset: 0.72, easing: 'ease-out' },
        { transform: `translateY(${fallDist - 18}px)`, offset: 0.86, easing: 'ease-in' },
        { transform: `translateY(${fallDist}px)` },
      ],
      { duration: 780, fill: 'forwards' },
    );
    await fall.finished.catch(() => {});

    // The button gets squashed by the block.
    btn.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.82)' }, { transform: 'scaleY(0.9)' }], { duration: 260, fill: 'forwards' });

    // Fuse: blink white and swell, like the real thing.
    tnt.classList.add('is-lit');
    playFuse(1.3);
    tnt.animate(
      [
        { transform: `translateY(${fallDist}px) scale(1)` },
        { transform: `translateY(${fallDist}px) scale(1.08)` },
        { transform: `translateY(${fallDist}px) scale(1)` },
        { transform: `translateY(${fallDist}px) scale(1.14)` },
        { transform: `translateY(${fallDist}px) scale(1.04)` },
        { transform: `translateY(${fallDist}px) scale(1.22)` },
      ],
      { duration: 1300, fill: 'forwards' },
    );
    await wait(1300);

    const tr = tnt.getBoundingClientRect();
    tnt.remove();
    btn.classList.add('is-gone');

    playBoom();
    const flash = document.createElement('div');
    flash.className = 'boom-flash';
    document.body.append(flash);
    setTimeout(() => flash.remove(), 500);
    document.documentElement.classList.add('is-shaking');
    setTimeout(() => document.documentElement.classList.remove('is-shaking'), 520);

    const done = explode(tr.left + tr.width / 2, tr.top + tr.height / 2);
    await wait(260);
    btn.closest('.cta').hidden = true;
    reveal();
    await done;
  });
}
