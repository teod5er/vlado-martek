import './style.css';
import { Gallery, escapeHtml, steppedCss } from './gallery.js';
import { sound, unlock, isEnabled, setEnabled } from './sound.js';

const $ = (id) => document.getElementById(id);
const body = document.body;

let data;
let currentCat = 'all';
let openWork = null;
let visibleWorks = [];

// ---------- language: HR (Croatian, default) / EN (English) ----------
let lang = 'hr';
try { if (localStorage.getItem('vm-lang') === 'en') lang = 'en'; } catch { /* storage unavailable */ }
const L = (key) => (lang === 'en' ? data.labels?.en?.[key] : data.labels?.[key]) || { all: lang === 'en' ? 'Home' : 'Početna', close: lang === 'en' ? 'Close' : 'Zatvori', photo: lang === 'en' ? 'Photo' : 'Fotografija' }[key];
function applyLang() {
  document.documentElement.lang = lang;
  for (const w of data.works) {
    w.hr ||= { title: w.title, medium: w.medium, description: w.description };
    Object.assign(w, (lang === 'en' && w.en) ? { ...w.hr, ...w.en } : w.hr);
    // a full stop after every title and every year (unless the title ends in its own ? or !)
    if (w.title && !/[.?!…]$/.test(w.title)) w.title += '.';
    if (w.year) w.year = String(w.year).replace(/(\d+)(?![\d.])/g, '$1.');
  }
  for (const c of data.categories) {
    c.label_hr ||= c.label;
    c.label = lang === 'en' ? c.label_en || c.label_hr : c.label_hr;
  }
  buildLangMenu();
  $('dHome').textContent = L('all');
  $('detailClose').setAttribute('aria-label', lang === 'en' ? 'Close the work' : 'Zatvori rad');
  fillBack();
  $('detailPrev').setAttribute('aria-label', lang === 'en' ? 'Previous work' : 'Prethodni rad');
  $('detailNext').setAttribute('aria-label', lang === 'en' ? 'Next work' : 'Sljedeći rad');
  $('detailLinksTitle').textContent = lang === 'en' ? 'Read more' : 'Pročitaj više';
  $('iHome').textContent = L('all');
  $('iHere').textContent = lang === 'en' ? 'About' : 'O autoru';
  $('iClose').setAttribute('aria-label', lang === 'en' ? 'Close' : 'Zatvori');
  $('menuHome').textContent = L('all');
  $('menuClear').setAttribute('aria-label', lang === 'en' ? 'Clear the medium' : 'Ukloni kategoriju');
  updateViewLabel();
  $('menu').setAttribute('aria-label', lang === 'en' ? 'Categories' : 'Kategorije');
  $('gallery').setAttribute('aria-label', lang === 'en' ? 'Selected works' : 'Odabrani radovi');
  $('info').setAttribute('aria-label', lang === 'en' ? 'About the artist' : 'O umjetniku');
  buildMenu();
  updateMenu();
  buildInfo();
  buildEvents();
  if (app.gallery) { buildIndex(); buildList(); }
  if (openWork) fillDetail(openWork);
  setDocTitle();
}
// top-right: the current exhibition, the language and the sound
const EX_ARROW = '<svg class="icon ex-arrow" viewBox="0 0 12 12" aria-hidden="true"><path class="s" d="M6 2.25L9.75 6 6 9.75M9.75 6H1"/></svg>';
function buildLangMenu() {
  const en = lang === 'en';
  // the current exhibition, small, in a red frame; it opens its page (url) or the events page
  const ev = data.events?.[0];
  $('eventsLink').hidden = !ev;
  if (ev) {
    const text = `Exhibition: ${ev.title}`;
    $('eventsLink').innerHTML = `<span class="ex-t">${escapeHtml(text)}</span>${EX_ARROW}`;
  }
  // a phone: the word Menu bottom right (Close while the menu is open)
  updateBurger();
  fitTopRight();
  // the globe switches to the other language, the speaker turns sound on / off (struck through when off)
  $('langToggle').setAttribute('aria-label', en ? 'Language: English (switch to Hrvatski)' : 'Jezik: hrvatski (prebaci na English)');
  $('langCode').textContent = en ? 'EN' : 'HR'; // the language on show
  $('langToggle').title = en ? 'Hrvatski' : 'English'; // (what a click switches to)
  $('aboutLink').setAttribute('aria-label', en ? 'About' : 'O autoru');
  const t = $('soundToggle');
  t.setAttribute('aria-label', en ? 'Sound' : 'Zvuk');
  t.title = en ? 'Sound' : 'Zvuk';
  t.classList.toggle('is-off', !isEnabled());
  t.setAttribute('aria-pressed', String(isEnabled()));
  // (the stroke cuts a gap in the speaker, so the two stay apart)
  if (isEnabled()) t.querySelector('.spk').removeAttribute('mask'); else t.querySelector('.spk').setAttribute('mask', 'url(#soundCut)');
}
// the media row stops short of the exhibition and the icons at the top right (and wraps if it must)
// the media row stops short of the toolbar at the top right (and wraps if it must); the title at the
// bottom stops short of the exhibition at the bottom right
function fitTopRight() {
  const root = document.documentElement;
  root.style.setProperty('--prefs-w', `${$('prefBox').getBoundingClientRect().width.toFixed(1)}px`); // the view icons and the counter stand left of it
  root.style.setProperty('--right-w', `${Math.ceil(innerWidth - $('views').getBoundingClientRect().left + 16)}px`);
  root.style.setProperty('--burger-w', `${$('burger').getBoundingClientRect().width.toFixed(1)}px`); // a phone: the view icons stand left of Menu
  root.style.setProperty('--ex-w', `${Math.ceil(innerWidth - $('langBox').getBoundingClientRect().left + 24)}px`);
}
addEventListener('resize', () => { if (data) fitTopRight(); });
function toggleLang() {
  lang = lang === 'en' ? 'hr' : 'en';
  try { localStorage.setItem('vm-lang', lang); } catch { /* ignore */ }
  applyLang();
}
function initLangMenu() {
  // they may sit over the about page, which closes on any other click
  for (const el of [$('langBox'), $('prefBox')]) el.addEventListener('click', (e) => e.stopPropagation());
  $('langToggle').addEventListener('click', () => { sound.click(); toggleLang(); });
  $('soundToggle').addEventListener('click', () => {
    setEnabled(!isEnabled());
    sound.click(); // only heard when it was just switched on
    buildLangMenu();
  });
  // the exhibition, bottom right: its own page (KGZ) in a new tab when it has one, otherwise the events
  $('eventsLink').addEventListener('click', () => {
    const url = data.events?.[0]?.url;
    if (url) { window.open(url, '_blank', 'noopener'); return; }
    if ($('events').hidden) openEvents(); else closeEvents();
  });
}

// custom pointers from `cursors` in works.json: a random one on every page load,
// and a different one after every click
let cursorStyle = null, cursorIdx = -1;
const CLICKABLE = 'button, a, .work, .index-item, .list-row';
function setCursor() {
  const list = data.cursors || [];
  if (!list.length || !matchMedia('(pointer: fine)').matches) return;
  let i = Math.floor(Math.random() * list.length);
  if (list.length > 1 && i === cursorIdx) i = (i + 1) % list.length;
  cursorIdx = i;
  const c = typeof list[i] === 'string' ? { src: list[i] } : list[i];
  const [x, y] = c.hotspot || [0, 0];
  const img = c.src2x ? `image-set(url("${c.src}") 1x, url("${c.src2x}") 2x)` : `url("${c.src}")`;
  if (!cursorStyle) { cursorStyle = document.createElement('style'); document.head.append(cursorStyle); }
  // over anything clickable the ordinary pointer (the hand) takes over
  cursorStyle.textContent = `html, html * { cursor: url("${c.src}") ${x} ${y}, auto !important; cursor: ${img} ${x} ${y}, auto !important; }
    :is(${CLICKABLE}), :is(${CLICKABLE}) * { cursor: pointer !important; }`;
}
function initCursors() {
  const list = data.cursors || [];
  for (const c of list) { const im = new Image(); im.src = typeof c === 'string' ? c : c.src; } // preload so a swap is instant
  setCursor();
  addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') setCursor(); }, true);
}

const PORTRAIT_EVERY = 10000; // ms between Martek's photos at the bottom left
async function boot() {
  body.classList.add('intro'); // hidden behind the splash until the intro plays
  const deepStart = /^#\/(work|info|events)/.test(location.hash);
  if (!deepStart) typeNames(); // VLADO MARTEK types out over the splash, centred left and right
  // the splash stays for the full 4 s of its animation, counted from when the animated mark shows
  const mark = document.querySelector('.loader-mark');
  const markReady = !mark || mark.complete ? Promise.resolve() : new Promise((r) => { mark.onload = mark.onerror = r; });
  const minTime = markReady.then(() => new Promise((r) => setTimeout(r, 4000)));
  // the offline (single-file) build embeds the data; the normal build fetches it
  data = window.__VM_DATA__ || await fetch('data/works.json').then((r) => r.json());
  const cats = new Map(data.categories.map((c) => [c.id, c]));
  initCursors();
  // Martek's portrait, small, at the bottom left: his photos take turns every 10 s (a hard cut)
  const portraits = data.artist.photos?.length ? data.artist.photos : data.artist.photo ? [data.artist.photo] : [];
  for (const u of portraits) { const im = new Image(); im.src = u; } // loaded ahead, so the cut is instant
  let pi = 0;
  const showPortrait = () => { if (portraits.length) $('aboutThumb').style.backgroundImage = `url("${portraits[pi % portraits.length]}")`; };
  showPortrait();
  if (portraits.length > 1) setInterval(() => { pi++; showPortrait(); }, PORTRAIT_EVERY);

  // behind the splash only the first works of the gallery are waited for (at most 3 s on a slow
  // line); the other thumbnails load afterwards, in the background
  const load = (u) => new Promise((res) => { const img = new Image(); img.onload = img.onerror = () => res(); img.src = u; });
  const h0 = parseHash(), first = worksFor(h0.cat && data.categories.some((c) => c.id === h0.cat) ? h0.cat : 'all');
  const urls = [...new Set(first.map((w) => w.thumb || w.image))];
  await Promise.all([minTime, Promise.race([Promise.all(urls.slice(0, 8).map(load)), new Promise((r) => setTimeout(r, 3000))])]);
  setTimeout(() => { for (const w of data.works) load(w.thumb || w.image); }, 400);

  initMenu();
  initMobileNav();
  applyLang();
  fitLabels();

  const gallery = new Gallery($('gallery'), $('track'), {
    onOpen: (w) => openDetail(w),
    onHover: (work) => { if (work) sound.click(); updateTitle(); },
    onFeature: () => updateTitle(),
  });
  window.__gallery = gallery;
  app.gallery = gallery;

  const fromHash = parseHash();
  if (fromHash.cat && cats.has(fromHash.cat)) currentCat = fromHash.cat;
  visibleWorks = worksFor(currentCat);
  body.classList.toggle('cat-americas', currentCat === 'americas');
  updateBurger();
  updateMenu();

  gallery.setWorks(visibleWorks);
  buildIndex();
  buildList();
  const deepLink = !!(fromHash.work || fromHash.info || fromHash.events);
  if (deepLink) body.classList.remove('intro');
  body.classList.add('loaded');
  body.classList.remove('is-loading');
  if (!deepLink) playIntro();
  else body.classList.remove('names-up');
  if (fromHash.work) {
    const w = data.works.find((x) => x.id === fromHash.work);
    if (w) { gallery.show(w, { animate: false }); openDetail(w, { push: false }); }
  } else if (fromHash.info) openInfo({ push: false });
  else if (fromHash.events) openEvents({ push: false });
}

const app = {};

// ---------- intro: VLADO MARTEK stands large in the top-left corner over the splash;
// once the page is loaded the names shrink into place, then menu + language, then the gallery
let namesTyped = Promise.resolve();
function typeNames() {
  const a = $('labelFirst'), b = $('labelLast');
  fitLabels();
  // during the splash the names stand in their own corner, top left, a size larger; once the page
  // is in they shrink into place (the scale is kept small enough to stay on the screen)
  const w = Math.max(a.offsetWidth, b.offsetWidth);
  document.documentElement.style.setProperty('--splash-k', Math.min(1.6, (innerWidth * 0.9) / w).toFixed(3));
  body.classList.add('intro-names', 'names-up'); // written at once, no typing
  namesTyped = new Promise((done) => setTimeout(done, 600));
}
async function playIntro() {
  await namesTyped;
  body.classList.remove('names-up'); // the names shrink to their own size in the corner
  setTimeout(() => body.classList.add('intro-ui'), 700);
  setTimeout(() => { body.classList.add('intro-gallery'); app.gallery.enter(); }, 1300);
  setTimeout(() => body.classList.remove('intro', 'intro-names', 'intro-ui', 'intro-gallery'), 1900);
}

// ---------- views: Surf (the moving line), Index (every work in a grid) and List (one row each) ----------
let view = 'surf';
function setView(v) {
  if (v === view) return;
  const g = app.gallery, prev = view;
  // between the gallery and the overview the works on screen fly to their new places
  const from = prev === 'surf' && v === 'index' ? g.rects() : prev === 'index' && v === 'surf' ? indexRects() : null;
  view = v;
  body.classList.toggle('view-index', v === 'index');
  body.classList.toggle('view-list', v === 'list');
  $('index').hidden = v !== 'index';
  $('list').hidden = v !== 'list';
  g.setHover(null);
  setIndexHover(null);
  setListHover(null);
  if (v === 'surf') {
    g.hidden = false;
    if (from) {
      g.holdAll = true; // nothing shows until the flight is set up on the next frame
      requestAnimationFrame(() => requestAnimationFrame(() => flyToGallery(from)));
    } else g.enter();
  } else {
    g.hidden = true;
    $(v).scrollTop = 0;
    if (v === 'index') { if (from) flyToIndex(from); else revealIndex(); }
    else revealList();
  }
  updateTitle();
  updateViewLabel();
}

// ---------- flights between the gallery and the overview: each work moves to its new place ----------
// motion: pictures move smoothly over a second; everything else cuts or steps (never fades)
const FLY_MS = 1000, FLY_EASE = steppedCss(.6, 0, .15, 1, FLY_MS), FLY_STAGGER = 35; // a little jerky, like the names
// clones of the pictures move from where they were to where they will be; each pair may have a
// delay and a callback for when it lands
function fly(pairs) {
  if (!pairs.length) return Promise.resolve();
  const layer = document.createElement('div');
  layer.className = 'fly-layer';
  document.body.append(layer);
  const done = pairs.map(({ src, from, to, delay = 0, land, z = 0 }) => {
    const el = document.createElement('div');
    el.className = 'fly';
    el.style.cssText = `left:${to.x}px;top:${to.y}px;width:${to.w}px;height:${to.h}px;z-index:${z};background-image:url("${src}")`;
    layer.append(el);
    const a = el.animate([
      { transform: `translate(${from.x - to.x}px, ${from.y - to.y}px) scale(${from.w / to.w}, ${from.h / to.h})` },
      { transform: 'none' },
    ], { duration: FLY_MS, delay, easing: FLY_EASE, fill: 'both' });
    return a.finished.catch(() => {}).then(() => { land?.(); el.remove(); });
  });
  return Promise.all(done).then(() => layer.remove());
}
// off the screen to the right (coming in) or to the left (going out), at the same height
const offRight = (r, i) => ({ x: innerWidth + 40 + i * 30, y: r.y, w: r.w, h: r.h });
const offLeft = (r) => ({ x: -r.w - 60, y: r.y, w: r.w, h: r.h });
// the picture's own box inside an overview cell (contained, on the left)
function indexRects() {
  const vh = innerHeight;
  return [...$('indexGrid').querySelectorAll('.index-item')].map((b) => {
    const work = visibleWorks.find((w) => w.id === b.dataset.id);
    const r = b.getBoundingClientRect(), a = work?.aspect ?? 1;
    const rect = a >= r.width / r.height
      ? { x: r.left, y: r.top + (r.height - r.width / a) / 2, w: r.width, h: r.width / a }
      : { x: r.left, y: r.top, w: r.height * a, h: r.height };
    return { el: b, work, rect };
  }).filter((x) => x.work && x.rect.y < vh && x.rect.y + x.rect.h > 0);
}
// pair each work with its nearest copy in the gallery (works repeat there)
function pairUp(cells, slots) {
  const used = new Set(), pairs = [];
  for (const c of cells) {
    const s = slots.filter((x) => x.work === c.work && !used.has(x.k)).sort((a, b) => Math.abs(a.d) - Math.abs(b.d))[0];
    if (!s) continue;
    used.add(s.k);
    pairs.push({ cell: c, slot: s });
  }
  return pairs;
}
// gallery → overview: the works on screen fly to their cells, the other cells come in from the
// right one after another, and works without a cell on screen leave to the left
function flyToIndex(slots) {
  const grid = $('indexGrid');
  for (const li of grid.children) li.style.visibility = '';
  const cells = indexRects();
  const pairs = pairUp(cells, slots);
  const paired = new Set(pairs.map((p) => p.cell.el)), usedK = new Set(pairs.map((p) => p.slot.k));
  const src = (w) => w.thumb || w.image;
  const flights = [];
  for (const c of cells) c.el.style.visibility = 'hidden';
  for (const { cell, slot } of pairs) flights.push({ src: src(cell.work), from: slot.rect, to: cell.rect, z: slot.z, land: () => { cell.el.style.visibility = ''; } });
  let i = 0;
  for (const c of cells) if (!paired.has(c.el)) {
    const n = i++;
    flights.push({ src: src(c.work), from: offRight(c.rect, n), to: c.rect, delay: 80 + n * FLY_STAGGER, land: () => { c.el.style.visibility = ''; } });
  }
  for (const s of slots) if (!usedK.has(s.k)) flights.push({ src: src(s.work), from: s.rect, to: offLeft(s.rect), z: s.z });
  fly(flights);
}
// overview → gallery: the same the other way round
function flyToGallery(cells) {
  const g = app.gallery;
  const slots = g.rects();
  const pairs = pairUp(cells, slots);
  const paired = new Set(pairs.map((p) => p.cell.el)), usedK = new Set(pairs.map((p) => p.slot.k));
  const src = (w) => w.thumb || w.image;
  g.flying = new Set(slots.map((s) => s.k));
  g.holdAll = false;
  const land = (k) => () => g.flying.delete(k);
  const flights = pairs.map(({ cell, slot }) => ({ src: src(cell.work), from: cell.rect, to: slot.rect, z: slot.z, land: land(slot.k) }));
  const rest = slots.filter((s) => !usedK.has(s.k)).sort((a, b) => a.rect.x - b.rect.x);
  rest.forEach((s, n) => flights.push({ src: src(s.work), from: offRight(s.rect, n), to: s.rect, delay: 80 + n * FLY_STAGGER, z: s.z, land: land(s.k) }));
  for (const c of cells) if (!paired.has(c.el)) flights.push({ src: src(c.work), from: c.rect, to: offLeft(c.rect) });
  fly(flights).then(() => { g.flying = new Set(); });
}

// View: Gallery / Overview / List as icons, the current one in black
function markSwitch(sel, on) {
  for (const b of document.querySelectorAll(sel)) {
    const is = b.dataset.view === on;
    b.classList.toggle('is-on', is);
    b.setAttribute('aria-pressed', String(is));
  }
}
function updateViewLabel() {
  $('viewSurf').setAttribute('aria-label', lang === 'en' ? 'Gallery' : 'Galerija');
  $('viewIndex').setAttribute('aria-label', lang === 'en' ? 'Overview' : 'Pregled');
  $('viewList').setAttribute('aria-label', lang === 'en' ? 'List' : 'Popis');
  markSwitch('#views .switch-opt', view);
}
for (const b of document.querySelectorAll('#views .switch-opt')) b.addEventListener('click', () => {
  if (openWork) closeDetail(); // from inside a work: the work closes on the way
  if (b.dataset.view !== view) setView(b.dataset.view);
});

// Overview: every work in one grid, five in a row; same width, own height, top-aligned
function buildIndex({ reveal = false } = {}) {
  $('indexGrid').innerHTML = visibleWorks.map((w, i) => `<li style="--i:${i}">
      <button type="button" class="index-item" data-id="${escapeHtml(w.id)}" aria-label="${escapeHtml(`${w.title} ${w.year || ''}`)}">
        <img src="${escapeHtml(w.thumb || w.image)}" alt="" loading="lazy" decoding="async">
      </button></li>`).join('');
  if (reveal) revealIndex();
}
// the works come in one after another, in reading order
// (each item is hidden, then shown on its own timer; a CSS visibility animation did the same, but
// Chrome sometimes left an item hidden after it had finished)
let revealToken = 0;
function revealSeq(box, step) {
  const token = ++revealToken, items = [...box.children];
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const li of items) li.style.visibility = 'hidden';
  items.forEach((li, i) => setTimeout(() => { li.style.visibility = ''; }, Math.min(i, 40) * step));
  return token;
}
function revealIndex() { revealSeq($('indexGrid'), 55); }
let indexHover = null, indexWork = null;
function setIndexHover(el) {
  if (el === indexHover) return;
  indexHover?.classList.remove('is-hover');
  indexHover = el;
  el?.classList.add('is-hover');
  indexWork = el ? data.works.find((w) => w.id === el.dataset.id) : null;
  if (indexWork) sound.click();
  updateTitle();
}
let indexHoverTimer = 0;
$('indexGrid').addEventListener('pointerover', (e) => {
  if (e.pointerType !== 'mouse') return;
  const el = e.target.closest('.index-item');
  clearTimeout(indexHoverTimer);
  indexHoverTimer = setTimeout(() => setIndexHover(el), 0);
});
$('indexGrid').addEventListener('pointerleave', () => { clearTimeout(indexHoverTimer); setIndexHover(null); });
$('index').addEventListener('scroll', () => { clearTimeout(indexHoverTimer); setIndexHover(null); }, { passive: true });
$('indexGrid').addEventListener('click', (e) => {
  const el = e.target.closest('.index-item');
  if (!el) return;
  const w = data.works.find((x) => x.id === el.dataset.id);
  if (w) openDetail(w);
  setIndexHover(null);
});

// List: one row per work: a small picture, title, year, medium
function buildList({ reveal = false } = {}) {
  const cats = new Map(data.categories.map((c) => [c.id, c.label]));
  $('listRows').innerHTML = visibleWorks.map((w, i) => `<li style="--i:${i}">
      <button type="button" class="list-row" data-id="${escapeHtml(w.id)}">
        <span class="list-thumb"><img src="${escapeHtml(w.thumb || w.image)}" alt="" loading="lazy" decoding="async"></span><span class="list-title">${escapeHtml(w.title || '')}</span><span class="list-year">${escapeHtml(w.year || '')}</span><span class="list-cat">${escapeHtml(catsOf(w).map((c) => cats.get(c)).filter(Boolean).join(', '))}</span>
      </button></li>`).join('');
  if (reveal) revealList();
}
function revealList() { revealSeq($('listRows'), 30); }
let listHover = null;
function setListHover(el) {
  if (el === listHover) return;
  listHover?.classList.remove('is-hover');
  listHover = el;
  el?.classList.add('is-hover');
  if (el) sound.click();
}
$('listRows').addEventListener('pointerover', (e) => { if (e.pointerType === 'mouse') setListHover(e.target.closest('.list-row')); });
$('listRows').addEventListener('pointerleave', () => setListHover(null));
$('list').addEventListener('scroll', () => setListHover(null), { passive: true });
$('listRows').addEventListener('click', (e) => {
  const el = e.target.closest('.list-row');
  const w = el && data.works.find((x) => x.id === el.dataset.id);
  if (w) openDetail(w);
  setListHover(null);
});

// a work may belong to several categories; the first is its home (the folder its files live in)
const catsOf = (w) => w.categories || (w.category ? [w.category] : []);
// the category a work is shown under: the one being browsed if it belongs to it, else its home
const catOf = (w) => (catsOf(w).includes(currentCat) ? currentCat : catsOf(w)[0]);
function worksFor(cat) {
  return cat === 'all' ? data.works : data.works.filter((w) => catsOf(w).includes(cat));
}

// ---------- titles: written at once (no letter animation) ----------
// the year follows the title on the same line, in red
function typeInto(el, work, ms, yearEl = null) {
  el.textContent = '';
  if (yearEl) yearEl.textContent = '';
  if (!work) return 0;
  const t = document.createElement('span'); t.className = 't';
  const y = yearEl || document.createElement('span');
  if (yearEl) el.append(t); else { y.className = 'y'; el.append(t, ' ', y); }
  const title = work.title || '', year = work.year ? String(work.year) : '';
  t.textContent = title; y.textContent = year; // all at once (no typing anywhere)
  return 0;
}
// the title at the bottom (column of the grid): the featured work in the gallery, the work under
// the pointer in the overview
let typeTimer = 0, titleWork;
function updateTitle() {
  const g = app.gallery;
  let w = null;
  // the gallery shows the featured work's title at once (hovering changes nothing); the overview
  // types out the title of the work under the pointer
  if (!openWork) w = view === 'index' ? indexWork : view === 'list' ? null : g?.featured || null;
  if (w === titleWork) return;
  titleWork = w;
  clearInterval(typeTimer);
  typeTimer = typeInto($('hoverTitle'), w, view === 'surf' ? 0 : 18);
}

// ---------- menu ----------
// a category's name with how many works it holds, raised like an exponent: Knjige¹¹
const catLabel = (id, label) => `${escapeHtml(label)}<sup class="cat-n">${worksFor(id).length}</sup>`;
function buildMenu() {
  const items = [{ id: 'all', label: L('all') }, ...data.categories.filter((c) => worksFor(c.id).length)]; // a category with no works yet stays out
  $('menuList').innerHTML = items.map((c) => `<li><button type="button" data-cat="${c.id}">${catLabel(c.id, c.label)}</button></li>`).join('');
}
// ---------- a phone: the hamburger menu ----------
// the word Menu top right (the view icons left of it); it opens a page with the media
// (large) and language and sound under them, down at his portrait in the bottom-left corner. Each item works through the same controls as on a computer.
const mobileNav = () => !$('mnav').hidden;
// the word top right says what is on show, like a drop-down: Show all, or the chosen medium;
// Close while the menu is open
function updateBurger() {
  const en = lang === 'en';
  const c = currentCat !== 'all' && data?.categories.find((x) => x.id === currentCat);
  $('burgerText').textContent = mobileNav() ? (en ? 'Close' : 'Zatvori') : c ? c.label : (en ? 'Show all' : 'Prikaži sve');
  if (data) fitTopRight(); // the view icons stand left of the word, whatever its length
}
function buildMobileNav() {
  const en = lang === 'en';
  const items = [{ id: 'all', label: en ? 'Show all' : 'Prikaži sve' }, ...data.categories.filter((c) => worksFor(c.id).length)];
  $('mnavCats').innerHTML = items.map((c) => `<li><button type="button" data-cat="${c.id}"${c.id === currentCat ? ' class="is-on" aria-current="page"' : ''}>${catLabel(c.id, c.label)}</button></li>`).join('');
  // language and sound: the same two as on a computer, the language on show (a tap switches) and the speaker
  const on = isEnabled();
  $('mnavPrefs').innerHTML = `<button type="button" data-go="lang" aria-label="${en ? 'Language: English (switch to Hrvatski)' : 'Jezik: hrvatski (prebaci na English)'}"><span class="lang-code">${en ? 'EN' : 'HR'}</span></button>`
    + `<button type="button" data-go="sound" aria-pressed="${on}" aria-label="${en ? 'Sound' : 'Zvuk'}"${on ? '' : ' class="is-off"'}><svg class="icon" viewBox="0 0 12 12" aria-hidden="true"><mask id="soundCutM"><rect width="12" height="12" fill="#fff"/><path d="M1.5 1.5l9 9" stroke="#000" stroke-width="4"/></mask><path class="spk" d="M1.5 4h3.25l4.5-3.25v10.5L4.75 8H1.5z"${on ? '' : ' mask="url(#soundCutM)"'}/>${on ? '' : '<path class="s" d="M1.5 1.5l9 9"/>'}</svg></button>`;
  $('mnav').setAttribute('aria-label', en ? 'Menu' : 'Izbornik');
}
function setMobileNav(v) {
  if (v === mobileNav()) return;
  if (v) buildMobileNav();
  $('mnav').hidden = !v;
  body.classList.toggle('mnav-open', v);
  updateBurger();
  fitTopRight(); // Close is longer than Menu: the view icons move along
  $('burger').setAttribute('aria-expanded', String(v));
}
function initMobileNav() {
  $('burger').addEventListener('click', (e) => { e.stopPropagation(); sound.click(); setMobileNav(!mobileNav()); });
  $('mnav').addEventListener('click', (e) => {
    e.stopPropagation();
    const b = e.target.closest('button');
    if (!b) { setMobileNav(false); return; } // a tap on the blurred page closes it
    sound.click();
    const closePages = () => { if (!$('info').hidden) closeInfo(); if (!$('events').hidden) closeEvents(); if (openWork) closeDetail(); };
    if (b.dataset.cat) { setMobileNav(false); closePages(); setCategory(b.dataset.cat); return; }
    const go = b.dataset.go;
    if (go === 'lang') { toggleLang(); buildMobileNav(); }
    else if (go === 'sound') { $('soundToggle').click(); buildMobileNav(); }
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && mobileNav()) setMobileNav(false); });
  // the view icons beside the button and his portrait in the corner stay on show over the menu: they close it
  $('views').addEventListener('click', () => setMobileNav(false));
  $('aboutLink').addEventListener('click', () => setMobileNav(false));
  // back on a computer-sized screen: the menu goes
  matchMedia('(max-width: 700px), (orientation: portrait) and (max-width: 900px)').addEventListener('change', (m) => { if (!m.matches) setMobileNav(false); });
}
function initMenu() {
  const list = $('menuList');
  const menu = $('menu');
  const label = $('menuLabel');
  const open = (v) => {
    if (v === body.classList.contains('focus-menu')) return;
    body.classList.toggle('focus-menu', v);
    label.setAttribute('aria-expanded', String(v));
  };
  // the category list opens only on click/tap
  label.addEventListener('click', () => { sound.click(); open(!body.classList.contains('focus-menu')); });
  menu.addEventListener('focusout', (e) => { if (!menu.contains(e.relatedTarget)) open(false); });
  list.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-cat]');
    if (!b) return;
    sound.click();
    setCategory(b.dataset.cat);
    open(false);
  });
  // tapping anywhere else closes the menu on touch screens
  addEventListener('pointerdown', (e) => {
    if (body.classList.contains('focus-menu') && !menu.contains(e.target)) open(false);
  });
}

$('menuHome').addEventListener('click', () => { sound.click(); setCategory('all'); });
$('menuClear').addEventListener('click', () => { sound.click(); setCategory('all'); }); // the X beside the medium clears it
function updateMenu() {
  // a medium chosen: only that one shows, with a back arrow to all works
  const chosen = data.categories.find((c) => c.id === currentCat);
  body.classList.toggle('has-cat', !!chosen);
  $('menuBackText').innerHTML = chosen ? catLabel(chosen.id, chosen.label) : '';
  // with a work open, the medium shown is that work's own
  const cat = data.categories.find((c) => c.id === (openWork ? catOf(openWork) : currentCat));
  const text = cat ? cat.label : L('all');
  // the medium changes in place on opening a work: a short fade instead of a jump
  $('menuText').innerHTML = catLabel(cat ? cat.id : 'all', text);
  const active = openWork ? catOf(openWork) : currentCat;
  for (const b of $('menuList').querySelectorAll('button')) b.classList.toggle('is-active', b.dataset.cat === active);
}

// choosing a medium (or going back to all), kept simple: the menu changes at once, and the new
// works come in the way they do on every change of view (the gallery slides them in from the
// right, the overview and the list show them one after another); no fading
let catToken = 0;
function setCategory(cat, { push = true } = {}) {
  if (cat === currentCat) return;
  if (openWork) closeDetail({ fromPop: true }); // a new medium from inside a work: back to the gallery
  catToken++;
  currentCat = cat;
  body.classList.toggle('cat-americas', cat === 'americas'); // Amerike: the whole page in black
  updateBurger();
  if (push) setHash(cat === 'all' ? '' : `#/${cat}`);
  visibleWorks = worksFor(cat);
  updateMenu();
  app.gallery.setWorks(visibleWorks);
  if (view === 'surf') app.gallery.enter();
  buildIndex({ reveal: view === 'index' });
  buildList({ reveal: view === 'list' });
  updateTitle();
}

// ---------- events: a page of their own (dates, title, place), like the list ----------
function buildEvents() {
  const en = lang === 'en';
  $('eventsTitle').textContent = en ? 'Events' : 'Događanja';
  $('eHome').textContent = L('all');
  $('eHere').textContent = en ? 'Events' : 'Događanja';
  $('eClose').setAttribute('aria-label', en ? 'Close' : 'Zatvori');
  $('eventsRows').innerHTML = (data.events || []).map((x) => {
    const t = (en && x.en) ? { ...x, ...x.en } : x;
    return `<li class="events-row"><span class="events-dates">${escapeHtml(t.dates || '')}</span><span class="events-name">${escapeHtml(t.title || '')}</span><span class="events-place">${escapeHtml(t.place || '')}</span></li>`;
  }).join('');
}
function openEvents({ push = true } = {}) {
  if (openWork) closeDetail({ fromPop: true });
  if (!$('info').hidden) closeInfo({ fromPop: true });
  sound.click();
  buildEvents();
  showOverlay($('events'));
  body.classList.add('events-open');
  $('events').querySelector('.events-scroll').scrollTop = 0;
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    $('eventsRows').animate([{ transform: 'translateY(24px)' }, { transform: 'none' }], { duration: 240, easing: 'steps(4, end)' });
  }
  if (push) setHash('#/events', true);
}
function closeEvents({ fromPop = false } = {}) {
  if ($('events').hidden) return;
  sound.click();
  const done = () => { hideOverlay($('events')); body.classList.remove('events-open'); for (const a of $('events').getAnimations()) a.cancel(); };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) done();
  else done(); // a hard cut
  if (!fromPop) restoreHash();
}
$('eClose').addEventListener('click', () => closeEvents());

// ---------- info overlay (MARTEK) ----------
// the about text types itself out like the titles; the not-yet-typed rest stays invisible in
// place, so the layout (and the photo below) does not jump while it types
let infoRaf = 0;
function revealInfoText() {
  // the whole text at once (no typing); the photo and the address show with it
  for (const p of $('infoBody').querySelectorAll('p')) { p.firstChild.textContent = p.dataset.text || ''; p.lastChild.textContent = ''; }
  $('info').classList.add('is-typed');
}
function buildInfo() {
  const a = data.artist;
  const para = (p, cls = '') => `<p${cls ? ` class="${cls}"` : ''} data-text="${escapeHtml(p)}"><span>${escapeHtml(p)}</span><span class="rest"></span></p>`;
  // a line about him, small and white, above everything
  $('infoLead').textContent = a.lead?.[lang] || a.lead?.hr || '';
  $('infoLead').hidden = !$('infoLead').textContent;
  // the text, then the karmas (FAMILY KARMA / father butcher …), each in a frame of its own
  $('infoBody').innerHTML = (a.bio?.[lang] || a.bio?.hr || []).map((p) => para(p)).join('')
    + (a.karma || []).map(([k, v]) => `<div class="karma">${para(k, 'karma-k')}${para(v, 'karma-v')}</div>`).join('');
  // contact at the bottom
  $('infoMail').hidden = !a.email;
  if (a.email) { $('infoMail').href = `mailto:${a.email}`; $('infoMail').textContent = a.email; }
}

function showOverlay(el) {
  el.hidden = false;
  el.classList.add('is-open');
  app.gallery.paused = true;
  app.gallery.setHover(null);
  body.classList.remove('focus-menu');
  lastFocus = document.activeElement;
  setTimeout(() => el.focus({ preventScroll: true, focusVisible: false }), 50);
}
function hideOverlay(el) {
  el.classList.remove('is-open');
  el.hidden = true;
  app.gallery.paused = false;
  lastFocus?.focus?.({ preventScroll: true, focusVisible: false });
}
let lastFocus = null;

function openInfo({ push = true } = {}) {
  sound.click();
  showOverlay($('info'));
  body.classList.add('focus-info');
  revealInfoText();
  if (push) setHash('#/info', true);
}
function closeInfo({ fromPop = false } = {}) {
  if ($('info').hidden) return;
  sound.click();
  hideOverlay($('info'));
  body.classList.remove('focus-info');
  if (!fromPop) restoreHash();
}

// ---------- detail: the work at the top, its details below (scroll, or Read more) ----------
let detailTimer = 0, stripPhotos = [];
function factsFor(work) {
  const en = lang === 'en';
  const size = work.size_label || (work.width && work.height ? `${work.width}×${work.height}` : '');
  // every medium the work belongs to (one work may stand in several), comma-separated
  const cats = catsOf(work).map((id) => data.categories.find((c) => c.id === id)?.label).filter(Boolean).join(', ');
  return [
    [en ? (catsOf(work).length > 1 ? 'Categories' : 'Category') : (catsOf(work).length > 1 ? 'Kategorije' : 'Kategorija'), cats],
    [en ? 'Size' : 'Dimenzije', size],
    [en ? 'Year' : 'Godina', work.year],
  ].filter(([, v]) => v);
}
function fillDetail(work) {
  clearInterval(detailTimer);
  detailTimer = typeInto($('detailTitle'), work, 30, $('detailYear'));
  $('detailDesc').textContent = work.description || '';
  $('detailNavTitle').textContent = work.title || '';
  $('detailFacts').innerHTML = factsFor(work).map(([k, v]) => `<tr><th scope="row">${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('');
  // photos of the work: its own extra photos when it has them, otherwise the work itself, once
  stripPhotos = work.photos?.length ? work.photos : [work.image];
  // the photos side by side, each on a grey ground with the picture in its middle
  $('detailStrip').innerHTML = stripPhotos.map((u) => `<figure class="strip-item"><img src="${escapeHtml(u)}" alt="" loading="lazy" decoding="async"></figure>`).join('');
  $('detailStrip').hidden = !stripPhotos.length;
  // at the end, after a grey rule: the other works of its medium, in the overview's grid
  const cat = catOf(work), more = cat ? worksFor(cat).filter((w) => w !== work) : [];
  $('detailMore').hidden = !more.length;
  $('detailMoreGrid').innerHTML = more.map((w) => `<li><button type="button" class="index-item" data-id="${escapeHtml(w.id)}" aria-label="${escapeHtml(`${w.title} ${w.year || ''}`)}"><img src="${escapeHtml(w.thumb || w.image)}" alt="" loading="lazy" decoding="async"></button></li>`).join('');
  const links = work.links || [];
  $('detailLinksBox').hidden = true; // Read more is off for now; the links stay in the data
  $('detailLinks').innerHTML = links.map((l) => {
    const href = typeof l === 'string' ? l : l.url;
    const label = typeof l === 'string' ? l.replace(/^https?:\/\//, '') : l.label || l.url;
    return `<li><a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(label)}<span class="arrow" aria-hidden="true">↗</span></a></li>`;
  }).join('');
}
// the photo strip: the current photo large on the grid column, the one before it small on the
// left, the next ones to the right (cut by the screen edge)
// The work's own page: the same whichever view it is opened from. The picture flies from where it
// was clicked (the carousel, the grid or the list) to its place on the page, and back on closing.
const DETAIL_MS = 1000, DETAIL_EASE = steppedCss(.6, 0, .15, 1, DETAIL_MS); // the picture's flight, in hard steps like the names
const detailList = () => (openWork && visibleWorks.includes(openWork) ? visibleWorks : data.works);
// a picture's own box inside a frame, contained (on the left, or centred on a phone)
function containIn(r, a, centre = false) {
  const w = a >= r.width / r.height ? r.width : r.height * a, h = w / a;
  return { x: r.left + (centre ? (r.width - w) / 2 : 0), y: r.top + (r.height - h) / 2, w, h };
}
// where the work stands in the view it was opened from (scrolled into sight in the grid / list)
function sourceRect(work) {
  const a = work.aspect ?? 1;
  if (view === 'surf') return app.gallery.rects().filter((x) => x.work === work).sort((p, q) => Math.abs(p.d) - Math.abs(q.d))[0]?.rect || null;
  const sel = view === 'index' ? `.index-item[data-id="${CSS.escape(work.id)}"]` : `.list-row[data-id="${CSS.escape(work.id)}"] .list-thumb`;
  const el = $(view).querySelector(sel);
  if (!el) return null;
  let r = el.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) { el.scrollIntoView({ block: 'center' }); r = el.getBoundingClientRect(); }
  return containIn(r, a);
}
// the picture on the page: as large as the frame allows
function layoutFigure(work) {
  const fig = $('detailFigure'), img = $('detailImg');
  // the frame ends three margins above the title, however many lines the title takes
  const head = fig.parentElement.querySelector('.detail-head');
  const pad = app.gallery?.m.phone ? 10 : Math.min(22, Math.max(10, innerWidth * 0.011)); // --pad
  fig.style.bottom = `${fig.parentElement.clientHeight - head.offsetTop + pad * 3}px`;
  const f = fig.getBoundingClientRect();
  const c = containIn(f, work.aspect ?? 1, app.gallery?.m.phone);
  Object.assign(img.style, { left: `${c.x - f.left}px`, top: `${c.y - f.top}px`, width: `${c.w}px`, height: `${c.h}px` });
  return c;
}
addEventListener('resize', () => { if (openWork) layoutFigure(openWork); });
// one picture flying between two places, above everything
function flyPicture(src, from, to) {
  const el = document.createElement('div');
  el.className = 'fly fly-top';
  el.style.cssText = `left:${to.x}px;top:${to.y}px;width:${to.w}px;height:${to.h}px;background-image:url("${src}")`;
  document.body.append(el);
  const a = el.animate([
    { transform: `translate(${from.x - to.x}px, ${from.y - to.y}px) scale(${from.w / to.w}, ${from.h / to.h})` },
    { transform: 'none' },
  ], { duration: DETAIL_MS, easing: DETAIL_EASE, fill: 'both' });
  return a.finished.catch(() => {}).then(() => el);
}
// a work's top bar, like the menu's path: Home / its medium ×, and / its title once scrolled
function fillBack() {
  if (!data || !openWork) return;
  const c = data.categories.find((x) => x.id === catOf(openWork));
  $('dCat').textContent = c ? c.label : '';
}
function fillCount() {
  const list = detailList(), i = list.indexOf(openWork);
  const pad2 = (n) => String(n).padStart(2, '0');
  $('countNow').textContent = pad2(i + 1);
  $('countAll').textContent = `/ ${pad2(list.length)}`;
}
// the browser tab: the open work's title, otherwise his name
function setDocTitle() { document.title = openWork ? `${openWork.title} — Vlado Martek` : 'Vlado Martek'; }
function openDetail(work, { push = true, dir = 0 } = {}) {
  if (!data) return;
  const swap = !!openWork;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const from = !swap && !reduced ? sourceRect(work) : null;
  openWork = work;
  sound.click();
  fillDetail(work);
  fillCount();
  fillBack();
  setDocTitle();
  const img = $('detailImg');
  img.src = work.image;
  if (push) setHash(`#/work/${work.id}`, !swap);
  if (swap) {
    // moving on to the next / previous work: the picture slides out and the next one slides in
    $('detailScroll').scrollTop = 0;
    layoutFigure(work);
    if (!reduced) img.animate([{ transform: `translateX(${dir * 60}px)` }, { transform: 'none' }], { duration: 1000, easing: DETAIL_EASE });
    return;
  }
  app.gallery.setHover(null);
  body.classList.add('detail-open');
  showOverlay($('detail'));
  $('detailScroll').scrollTop = 0;
  $('detail').classList.remove('title-on');
  body.classList.remove('detail-title-on');
  $('detailTitle').parentElement.style.visibility = '';
  openedAt = performance.now();
  updateMenu();
  updateTitle();
  const to = layoutFigure(work);
  if (reduced) return;
  // the page comes up, the picture flies in from where it was clicked, the title rises
  $('detailTitle').parentElement.animate([{ transform: 'translateY(40px)' }, { transform: 'none' }], { duration: 300, delay: 120, easing: 'steps(5, end)', fill: 'backwards' });
  if (from) {
    img.style.visibility = 'hidden';
    flyPicture(work.thumb || work.image, from, to).then((el) => { img.style.visibility = ''; requestAnimationFrame(() => el.remove()); });
  } else img.animate([{ transform: 'translateY(40px)' }, { transform: 'none' }], { duration: 1000, easing: DETAIL_EASE });
}

function closeDetail({ fromPop = false } = {}) {
  body.classList.remove('detail-title-on'); // the names come back
  if (!openWork) return;
  const work = openWork;
  sound.click();
  openWork = null;
  setDocTitle();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // the view behind takes up the work the page ended on
  if (view === 'surf' && app.gallery.featuredWork() !== work) app.gallery.show(work, { animate: false });
  const imgRect = $('detailImg').getBoundingClientRect();
  const back = view === 'surf' ? app.gallery.featuredRect() : sourceRect(work);
  const done = () => {
    hideOverlay($('detail'));
    for (const a of $('detail').getAnimations()) a.cancel();
    body.classList.remove('detail-open');
    updateMenu();
    updateTitle();
  };
  if (!fromPop) restoreHash();
  if (reduced || !back || imgRect.bottom < 0) {
    done(); // a hard cut
    return;
  }
  // the picture flies back to its place in the view, while the page fades away
  $('detailImg').style.visibility = 'hidden';
  flyPicture(work.thumb || work.image, { x: imgRect.left, y: imgRect.top, w: imgRect.width, h: imgRect.height }, back)
    .then((el) => { $('detailImg').style.visibility = ''; requestAnimationFrame(() => el.remove()); });
  done(); // the page is cut away at once; the picture finishes its flight over the view
}

function stepWork(dir) {
  if (!openWork) return;
  const list = detailList();
  const i = list.indexOf(openWork);
  openDetail(list[(i + dir + list.length) % list.length], { push: true, dir });
}
// the grid at the end of a work: a work opens in its place
$('detailMoreGrid').addEventListener('click', (e) => {
  const el = e.target.closest('.index-item');
  const w = el && data.works.find((x) => x.id === el.dataset.id);
  if (w) openDetail(w, { dir: 1 });
});
$('detailPrev').addEventListener('click', () => stepWork(-1));
$('detailNext').addEventListener('click', () => stepWork(1));

// ---------- hash routing (#/work/id, #/info, #/category) ----------
function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  if (h.startsWith('work/')) return { work: h.slice(5) };
  if (h === 'info') return { info: true };
  if (h === 'events') return { events: true };
  if (h) return { cat: h };
  return {};
}
let pushedOverlay = false;
function setHash(h, overlayPush = false) {
  const url = h || location.pathname + location.search;
  try {
    if (overlayPush && !pushedOverlay) { history.pushState(null, '', url); pushedOverlay = true; }
    else history.replaceState(null, '', url);
  } catch { /* sandboxed frames may refuse history changes */ }
}
// our own step back (closing a page) must not route: a medium chosen in the same click (Home in a
// work's path) would be undone by the old address coming back
let ownBack = false;
function restoreHash() {
  const base = () => (currentCat === 'all' ? location.pathname + location.search : `#/${currentCat}`);
  try {
    if (pushedOverlay) { pushedOverlay = false; ownBack = true; history.back(); setTimeout(() => { ownBack = false; history.replaceState(null, '', base()); }, 120); }
    else history.replaceState(null, '', base());
  } catch { /* ignore */ }
}
function route() {
  if (!data || !app.gallery) return;
  const h = parseHash();
  if (!h.work && openWork) closeDetail({ fromPop: true });
  if (!h.info && !$('info').hidden) closeInfo({ fromPop: true });
  if (!h.events && !$('events').hidden) closeEvents({ fromPop: true });
  if (h.events && $('events').hidden) openEvents({ push: false });
  if (h.work && h.work !== openWork?.id) {
    const w = data.works.find((x) => x.id === h.work);
    if (w) openDetail(w, { push: false });
  }
  if (h.info && $('info').hidden) openInfo({ push: false });
  if (h.cat && data.categories.some((c) => c.id === h.cat)) setCategory(h.cat, { push: false });
}
addEventListener('popstate', () => { pushedOverlay = false; if (!ownBack) route(); });
addEventListener('hashchange', () => { if (!ownBack) route(); }); // (the step back fires both)

// ---------- labels: fit both names on one line on any screen ----------
// on the splash both names must fit across the screen; in the corner (in two lines) the longer
// one must fit before the media
function fitLabels() {
  const a = $('labelFirst'), b = $('labelLast');
  const root = document.documentElement;
  root.style.removeProperty('--name');
  const fs = parseFloat(getComputedStyle(a).fontSize);
  const phone = matchMedia('(max-width: 700px), (orientation: portrait) and (max-width: 900px)').matches;
  const pad = parseFloat(getComputedStyle(a).paddingTop);
  const k = Math.min(1,
    (innerWidth - pad * 2 - 24) / (a.offsetWidth + b.offsetWidth),
    // before the media (on a phone the hamburger replaces them: before column 3 of its 6)
    ((phone ? pad + ((innerWidth - pad * 7) / 6 + pad) * 2 : $('menu').getBoundingClientRect().left) - pad * (phone ? 2 : 3)) / Math.max(a.offsetWidth, b.offsetWidth));
  if (k < 1) root.style.setProperty('--name', `${Math.floor(fs * k)}px`);
}
addEventListener('resize', () => fitLabels());

// ---------- wiring ----------
// About (bottom left, with his portrait) opens the text about him; a second click closes it
$('aboutLink').addEventListener('click', (e) => { e.stopPropagation(); if (!$('info').hidden) { closeInfo(); return; } if (openWork) closeDetail(); if (!$('events').hidden) closeEvents(); openInfo(); });
initLangMenu();
// (pages are closed without stepping back in the history, which would land after the change and undo it)
const goHome = () => {
  sound.click();
  if (!$('info').hidden) closeInfo({ fromPop: true });
  if (!$('events').hidden) closeEvents({ fromPop: true });
  if (openWork) closeDetail({ fromPop: true });
  pushedOverlay = false;
  if (currentCat === 'all') setHash(''); else setCategory('all');
};
$('labelLast').addEventListener('click', goHome);
$('labelFirst').addEventListener('click', goHome);
$('eHome').addEventListener('click', goHome); // Vlado Martek: home, from any page
// About: its own path, Home / About ×, like the events (a click anywhere else closes it too)
$('iHome').addEventListener('click', (e) => { e.stopPropagation(); goHome(); });
$('iClose').addEventListener('click', (e) => { e.stopPropagation(); closeInfo(); });
// the about page closes with a click or tap anywhere (or Escape)
$('info').addEventListener('click', () => closeInfo());
$('infoMail').addEventListener('click', (e) => e.stopPropagation()); // the address opens mail, the page stays
$('detailScroll').addEventListener('scroll', () => {
  // once the title has scrolled up under the top bar, the work's name takes the media's place there
  // (the big title fades out on its way up, so it never runs into the top bar)
  const headEl = $('detailTitle').parentElement, head = headEl.getBoundingClientRect();
  const barBottom = $('detailBar').getBoundingClientRect().bottom + 8;
  headEl.style.visibility = head.top < barBottom + 4 ? 'hidden' : ''; // cut away before it reaches the bar
  const titleOn = head.top < barBottom + head.height * 0.25; // as the big title fades out, its name joins the path
  $('detail').classList.toggle('title-on', titleOn);
  body.classList.toggle('detail-title-on', titleOn); // the names in the corner go with it
}, { passive: true });
// the path: Home → all works, the medium → that medium, × closes the work
$('detailClose').addEventListener('click', () => closeDetail());
$('dHome').addEventListener('click', () => { closeDetail(); setCategory('all'); });
$('dCat').addEventListener('click', () => { const c = openWork && catOf(openWork); closeDetail(); if (c) setCategory(c); });


// moving between works inside a work: the arrows, the arrow keys, a sideways swipe or a sideways
// wheel (trackpad) move one work on
let sideWheel = 0, sideAt = 0;
$('detailScroll').addEventListener('wheel', (e) => {
  if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.5) return;
  const now = performance.now();
  if (now - sideAt < 700) return;
  sideWheel += e.deltaX;
  if (Math.abs(sideWheel) > 80) { stepWork(Math.sign(sideWheel)); sideWheel = 0; sideAt = now; }
}, { passive: true });
// scrolling up past the top of a work goes back to where it was opened from
let upWheel = 0, upAt = 0, openedAt = 0;
$('detailScroll').addEventListener('wheel', (e) => {
  const s = $('detailScroll');
  if (e.deltaY >= 0 || s.scrollTop > 0 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) { upWheel = 0; return; }
  const now = performance.now();
  if (now - openedAt < 600) return;
  if (now - upAt > 300) upWheel = 0;
  upAt = now;
  upWheel -= e.deltaY;
  if (upWheel > 140) { upWheel = 0; closeDetail(); }
}, { passive: true });
let swipe = null;
$('detailScroll').addEventListener('touchstart', (e) => { const t = e.touches[0]; swipe = e.touches.length === 1 && !e.target.closest('.detail-strip') ? { x: t.clientX, y: t.clientY } : null; }, { passive: true });
$('detailScroll').addEventListener('touchend', (e) => {
  if (!swipe) return;
  const t = e.changedTouches[0], dx = t.clientX - swipe.x, dy = t.clientY - swipe.y;
  swipe = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) stepWork(dx < 0 ? 1 : -1);
  else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.5 && $('detailScroll').scrollTop <= 0) closeDetail(); // pulled down at the top
}, { passive: true });

addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (openWork) closeDetail(); else if (!$('events').hidden) closeEvents(); else if (!$('info').hidden) closeInfo(); else body.classList.remove('focus-menu'); }
  if (openWork && e.key === 'ArrowRight') stepWork(1);
  if (openWork && e.key === 'ArrowLeft') stepWork(-1);
  if (!openWork && $('info').hidden && view === 'surf' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) app.gallery.step(e.key === 'ArrowRight' ? 1 : -1);
});

// sounds: unlock audio on the first gesture, tick on hovering buttons
for (const ev of ['pointerdown', 'touchstart', 'touchend', 'click']) addEventListener(ev, unlock, { capture: true, passive: true });
addEventListener('keydown', unlock, { capture: true });
// try as early as the browser allows: scrolling or moving the mouse also tries to start the sound
// (browsers that require a click first simply start it on that click)
for (const ev of ['wheel', 'pointermove', 'mouseover', 'scroll']) addEventListener(ev, unlock, { capture: true, passive: true });
document.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b && !b.closest('.menu-list, .lang, .detail-strip') && !b.classList.contains('index-item') && !b.classList.contains('list-row') && !b.dataset.close && !['labelLast', 'labelFirst', 'menuLabel'].includes(b.id)) sound.click();
});

boot();
