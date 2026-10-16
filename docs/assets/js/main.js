import { pt, meta, runtime } from './i18n.js?v=10';
import { startScene } from './scene.js?v=10';
import { initTnt } from './tnt.js?v=10';

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const LANG_KEY = 'crowlyac.lang';
const SKINS = {
  // '4ever': 'assets/img/skins/4ever.png',
};
const state = { lang: 'en', live: {} };

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch {} },
};

function safely(name, fn) {
  try { fn(); } catch (err) { console.warn(`[crowlyac] ${name} failed`, err); }
}

// i18n
const dict = { en: {}, pt };
const attrNodes = [];

function captureEnglish() {
  for (const el of $$('[data-i18n]')) {
    const key = el.dataset.i18n;
    if (!(key in dict.en)) dict.en[key] = el.innerHTML.trim();
  }
  for (const el of $$('[data-i18n-attr]')) {
    for (const pair of el.dataset.i18nAttr.split(';')) {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      if (!(key in dict.en)) dict.en[key] = el.getAttribute(attr) ?? '';
      attrNodes.push({ el, attr, key });
    }
  }
}

function applyStrings(lang) {
  const table = dict[lang];
  for (const el of $$('[data-i18n]')) {
    const value = table[el.dataset.i18n] ?? dict.en[el.dataset.i18n];
    if (value != null && el.innerHTML !== value) el.innerHTML = value;
  }
  for (const { el, attr, key } of attrNodes) {
    const value = table[key] ?? dict.en[key];
    if (value != null) el.setAttribute(attr, value);
  }
  root.lang = lang === 'pt' ? 'pt-BR' : 'en';
  document.title = meta[lang].title;
  $('meta[name="description"]')?.setAttribute('content', meta[lang].description);
  const group = $('.lang');
  if (group) group.dataset.active = lang;
  for (const btn of $$('[data-lang]')) btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang));
  for (const el of $$('[data-date]')) {
    const d = new Date(`${el.dataset.date}T12:00:00Z`);
    el.textContent = d.toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  renderLive();
}

let switching = false;
async function setLang(lang) {
  if (!dict[lang] || lang === state.lang || switching) return;
  state.lang = lang;
  storage.set(LANG_KEY, lang);
  if (reduceMotion) return applyStrings(lang);
  switching = true;
  root.classList.add('is-switching');
  await wait(200);
  applyStrings(lang);
  requestAnimationFrame(() => { root.classList.remove('is-switching'); switching = false; });
}

function initI18n() {
  captureEnglish();
  const q = new URLSearchParams(location.search).get('lang');
  state.lang = [q, storage.get(LANG_KEY)].find((l) => l && dict[l]) || 'en';
  if (state.lang !== 'en') applyStrings(state.lang);
  else $('.lang')?.setAttribute('data-active', 'en');
  for (const btn of $$('[data-lang]')) btn.addEventListener('click', () => setLang(btn.dataset.lang));
}

// scene
function initScene() {
  const canvas = $('[data-scene]');
  const chat = $('[data-scene-chat]');
  const tags = $('[data-scene-tags]');
  if (!canvas) return;
  startScene(canvas, {
    reduceMotion,
    // Drop a standard Minecraft skin PNG here to replace a placeholder look.
    skins: SKINS,
    onTags(list, visible) {
      if (!tags) return;
      if (list) {
        if (tags.children.length !== list.length) {
          tags.replaceChildren(...list.map((t) => {
            const tag = document.createElement('span');
            tag.textContent = t.name;
            return tag;
          }));
        }
        list.forEach((t, i) => {
          const tag = tags.children[i];
          const left = `${(t.x * 100).toFixed(2)}%`;
          const top = `${(t.y * 100).toFixed(2)}%`;
          if (tag.style.left !== left) tag.style.left = left;
          if (tag.style.top !== top) tag.style.top = top;
        });
      }
      tags.classList.toggle('is-hidden', !visible);
    },
    onDeath(names) {
      if (!chat) return;
      chat.replaceChildren(...names.map((name) => {
        const line = document.createElement('span');
        line.textContent = runtime[state.lang].death(name);
        return line;
      }));
    },
  });
}

// live counters (optional; hidden if they fail)
const CACHE_KEY = 'crowlyac.live';

async function fetchJSON(url) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(id);
  }
}

function renderLive() {
  const fmt = new Intl.NumberFormat(state.lang === 'pt' ? 'pt-BR' : 'en-US');
  const t = runtime[state.lang];
  for (const [key, value] of Object.entries(state.live)) {
    const wrap = $(`[data-live-wrap="${key}"]`);
    const slot = $(`[data-live="${key}"]`);
    if (!wrap || !slot || value == null) continue;
    slot.textContent = typeof value === 'number' ? t.stars(value) : t.members(fmt.format(value.members), fmt.format(value.online));
    wrap.hidden = false;
  }
}

async function initLive() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    const cached = raw && JSON.parse(raw);
    if (cached && Date.now() - cached.t < 600000) {
      state.live = cached.v;
      return renderLive();
    }
  } catch {}

  const invite = (code) => fetchJSON(`https://discord.com/api/v10/invites/${code}?with_counts=true`)
    .then((d) => ({ members: d.approximate_member_count, online: d.approximate_presence_count }));
  const jobs = {
    crackcrew: invite('crackcrew'),
    revolt: invite('Fgu4vP3vQz'),
    'crewx-stars': fetchJSON('https://api.github.com/repos/4everdies/CrewX').then((d) => d.stargazers_count),
  };
  const keys = Object.keys(jobs);
  const results = await Promise.allSettled(Object.values(jobs));
  results.forEach((r, i) => {
    if (r.status !== 'fulfilled') return;
    const v = r.value;
    const ok = typeof v === 'number' ? Number.isFinite(v) : v && Number.isFinite(v.members) && Number.isFinite(v.online);
    if (ok) state.live[keys[i]] = v;
  });
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), v: state.live })); } catch {}
  renderLive();
}

// copy username
async function copyText(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) return navigator.clipboard.writeText(text);
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
  document.body.append(ta);
  ta.select();
  const ok = document.execCommand('copy');
  ta.remove();
  if (!ok) throw new Error('copy failed');
}

function initCopy() {
  const btn = $('[data-copy]');
  const label = $('[data-copy-label]');
  const status = $('[data-copy-status]');
  if (!btn) return;
  let reset = 0;
  btn.addEventListener('click', async () => {
    const t = runtime[state.lang];
    try {
      await copyText(btn.dataset.copy);
      if (label) label.textContent = t.copyDone;
      if (status) status.textContent = t.copied;
    } catch {
      if (status) status.textContent = t.copyFailed;
    }
    clearTimeout(reset);
    reset = setTimeout(() => {
      if (label) label.innerHTML = dict[state.lang][label.dataset.i18n] ?? dict.en[label.dataset.i18n];
      if (status) status.textContent = '';
    }, 2400);
  });
}

safely('i18n', initI18n);
safely('scene', initScene);
safely('tnt', () => initTnt({ reduceMotion }));
safely('copy', initCopy);
safely('year', () => { const y = $('[data-year]'); if (y) y.textContent = String(new Date().getFullYear()); });

window.__crowlyReady = true;
requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));

const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 600));
idle(() => { initLive().catch(() => {}); });
