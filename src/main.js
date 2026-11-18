import './style.css';
import { Gallery, escapeHtml, roughCss } from './gallery.js';
import { sound, unlock, isEnabled, setEnabled } from './sound.js';
import { pageView } from './analytics.js';

const $ = (id) => document.getElementById(id);
// the text shows only once the typeface is in (at most 3 s), so it never flashes in another one
const fontsIn = new Promise((done) => {
  const on = () => { document.documentElement.classList.add('fonts'); done(); };
  setTimeout(on, 3000);
  if (document.fonts?.load) document.fonts.load('500 1em Malamocco').then(on, on); else on();
});
const body = document.body;

// ---------- motion: smooth, on soft curves; text and pages come in softly (a short fade, a small rise) ----------
// things arriving: quick, then a long gentle landing, in fine steps (a slight hitch, gallery.js)
const SOFT = [.22, 1, .36, 1];
const softFor = new Map();
const EASE_OUT_FOR = (ms) => { if (!softFor.has(ms)) softFor.set(ms, roughCss(...SOFT, ms)); return softFor.get(ms); };
const EASE_OUT = EASE_OUT_FOR(700);
// the CSS transitions (colours, the portrait, the list's rows, the reveals under a work) the same way
document.documentElement.style.setProperty('--soft', EASE_OUT_FOR(900));
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// an element comes in: from transparent and a little lower, to its place
function rise(el, { delay = 0, dist = 14, dur = 650 } = {}) {
  if (!el || reducedMotion()) return null;
  return el.animate([{ opacity: 0, transform: `translateY(${dist}px)` }, { opacity: 1, transform: 'none' }], { duration: dur, delay, easing: EASE_OUT_FOR(dur), fill: 'backwards' });
}
// a page (a work, About, the events) fading in, or out before it is hidden
function fadeIn(el, dur = 280) {
  if (reducedMotion()) return;
  el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur, easing: 'ease-out' });
}
// a page is closed (or on its way out)
const shut = (id) => $(id).hidden || $(id).classList.contains('is-closing');
function fadeOut(el, done, dur = 260) {
  if (reducedMotion()) { done(); return; }
  const token = el._fade = (el._fade || 0) + 1;
  el.classList.add('is-closing');
  syncCover(); // the view under it shows through as it goes
  el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, easing: 'ease-in', fill: 'forwards' }).finished
    .catch(() => {}).then(() => { if (el._fade !== token) return; el.classList.remove('is-closing'); done(); for (const a of el.getAnimations()) a.cancel(); });
}

let data;
let currentCat = 'all';
let openWork = null;
let visibleWorks = [];

// ---------- language: HR (Croatian, default) / EN (English) ----------
let lang = 'hr';
try { if (localStorage.getItem('vm-lang') === 'en') lang = 'en'; } catch { /* storage unavailable */ }
const L = (key) => (lang === 'en' ? data.labels?.en?.[key] : data.labels?.[key]) || { all: lang === 'en' ? 'All works' : 'Svi radovi', close: lang === 'en' ? 'Close' : 'Zatvori', photo: lang === 'en' ? 'Photo' : 'Fotografija' }[key];
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
  if (data.categories.some((c) => c.intro)) buildAmer();
  if (app.gallery) { buildIndex(); buildList(); }
  if (openWork) fillDetail(openWork);
  setDocTitle();
  tip.refresh();
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
  // the globe switches to the other language, the word Sound turns sound on / off (struck through when off)
  $('langToggle').setAttribute('aria-label', en ? 'Language: English (switch to Hrvatski)' : 'Jezik: hrvatski (prebaci na English)');
  $('langCode').textContent = en ? 'EN' : 'HR'; // the language on show
  $('langToggle').dataset.tip = en ? 'Hrvatski' : 'English'; // the tag at the pointer: what a click switches to
  $('aboutLink').setAttribute('aria-label', en ? 'About' : 'O autoru');
  const t = $('soundToggle');
  t.dataset.tip = isEnabled() ? (en ? 'Sound off' : 'Isključi zvuk') : (en ? 'Sound on' : 'Uključi zvuk'); // what a click does
  t.classList.toggle('is-off', !isEnabled());
  t.setAttribute('aria-pressed', String(isEnabled()));
}
// the media row stops short of the exhibition and the icons at the top right (and wraps if it must)
// the media row stops short of the view icons at the top right (and wraps if it must); the title at
// the bottom stops short of language and sound at the bottom right
function fitTopRight() {
  const root = document.documentElement;
  root.style.setProperty('--right-w', `${Math.ceil(innerWidth - $('views').getBoundingClientRect().left + 16)}px`);
  root.style.setProperty('--burger-w', `${$('burger').getBoundingClientRect().width.toFixed(1)}px`); // a phone: the view icons stand left of Menu
  const ex = $('prefBox').getBoundingClientRect(); // language and sound, bottom right (a phone has them in its menu)
  root.style.setProperty('--ex-w', ex.width ? `${Math.ceil(innerWidth - ex.left + 24)}px` : 'var(--pad)');
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
    if (shut('events')) openEvents(); else closeEvents();
  });
}

// ---------- the tag at the pointer: what an icon without words does ----------
// one small red label for the whole page; over a button that is only an icon (the views, language,
// sound, the arrows, the close crosses) it says what a click does: its data-tip, else its aria-label.
// Mouse only; it follows the pointer smoothly and comes in with a short fade.
const tip = (() => {
  const el = document.createElement('div');
  el.className = 'ctag'; el.hidden = true; el.setAttribute('aria-hidden', 'true');
  document.body.append(el);
  const mouse = matchMedia('(hover: hover) and (pointer: fine)');
  let btn = null, text = '', mx = -1, my = -1, raf = 0;
  const place = () => {
    raf = 0;
    if (!text || mx < 0) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    // right of the pictogram that stands beside the pointer, level with it
    const off = follower ? CF_GAP + CF_SIZE + 6 : 18;
    let x = mx + off, y = follower ? my - CF_UP + CF_SIZE / 2 - h / 2 : my + 22; // (level with the pictogram's middle)
    if (x + w > innerWidth - 8) x = mx - w - off; // at the right or bottom edge: the other side of the pointer
    if (y + h > innerHeight - 8) y = my - h - 12;
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  };
  const show = () => {
    const visible = btn?.isConnected && btn.getClientRects().length && getComputedStyle(btn).visibility !== 'hidden';
    const t = visible ? btn.dataset.tip || btn.getAttribute('aria-label') || '' : '';
    const was = !el.hidden;
    if (t !== text) { text = t; el.textContent = t; }
    el.hidden = !text || mx < 0;
    if (text) place();
    if (!el.hidden && !was && !reducedMotion()) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
  };
  addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse' || !mouse.matches) return;
    const b = e.target.closest?.('button');
    btn = b && !b.matches('.index-item, .about-btn') && (b.dataset.tip || !b.textContent.trim()) ? b : null;
    mx = e.clientX; my = e.clientY;
    show();
  }, { passive: true });
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mx = e.clientX; my = e.clientY;
    if (text && !raf) raf = requestAnimationFrame(place); // follows the pointer smoothly, once a frame
  }, { passive: true });
  document.addEventListener('mouseleave', () => { mx = -1; el.hidden = true; });
  // after a click the button may say something else (sound on / off) or be gone (a closed page)
  addEventListener('click', () => setTimeout(show, 0), true);
  return { refresh: show };
})();

// the pointer is a small red square; one of the drawn pictograms from `cursors` in works.json
// stands just right of it (a random one on every page load, a different one after every click).
// Mouse only. Over anything that can be clicked the square turns black. On the red About page it is
// black already, and on black Amerike black would not show: there it turns white instead.
const SQUARE = (c) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'><rect width='8' height='8' fill='${c}'/></svg>`)}") 4 4`;
const CLICKABLE = ':is(a, button:not(.is-on, .is-active), .work, .list-row, [id=detailImg])', CLICKABLE_IN = (s) => `${s} ${CLICKABLE}, ${s} ${CLICKABLE} *`;
let cursorIdx = -1, follower = null;
const CF_SIZE = 44, CF_GAP = 8, CF_UP = 8; // the pictogram: its size, its distance from the square, how far its top stands above the square (px)
function setCursor() {
  const list = data.cursors || [];
  if (!list.length || !follower) return;
  let i = Math.floor(Math.random() * list.length);
  if (list.length > 1 && i === cursorIdx) i = (i + 1) % list.length;
  cursorIdx = i;
  const c = typeof list[i] === 'string' ? { src: list[i] } : list[i];
  follower.set(c);
}
function initCursors() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const list = data.cursors || [];
  for (const c of list) for (const u of typeof c === 'string' ? [c] : [c.src, c.src2x, c.inv, c.inv2x]) if (u) { const im = new Image(); im.src = u; } // preload so a swap is instant
  const style = document.createElement('style');
  style.textContent = `html, html * { cursor: ${SQUARE('#E63323')}, auto !important; }
    ${CLICKABLE_IN('html')} { cursor: ${SQUARE('#111111')}, auto !important; }
    body.focus-info, body.focus-info * { cursor: ${SQUARE('#111111')}, auto !important; }
    ${CLICKABLE_IN('body.focus-info')}, ${CLICKABLE_IN('body.cat-americas')} { cursor: ${SQUARE('#FFFFFF')}, auto !important; }`;
  document.head.append(style);
  const el = document.createElement('img');
  el.className = 'cfollow'; el.alt = ''; el.hidden = true; el.setAttribute('aria-hidden', 'true');
  document.body.append(el);
  let c = null, mx = -1, my = -1, raf = 0;
  const dark = () => body.classList.contains('cat-americas') && !body.classList.contains('focus-info');
  const src = () => {
    if (!c) return;
    const inv = dark() && c.inv;
    el.src = inv ? c.inv : c.src;
    el.srcset = (inv ? c.inv2x : c.src2x) ? `${inv ? c.inv2x : c.src2x} 2x` : '';
  };
  // just right of the square, hanging down from it (at the right edge of the screen: left of it)
  const place = () => {
    raf = 0;
    if (mx < 0) return;
    const x = mx + CF_GAP + CF_SIZE > innerWidth ? mx - CF_GAP - CF_SIZE : mx + CF_GAP;
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(my - CF_UP)}px)`;
  };
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mx = e.clientX; my = e.clientY;
    el.hidden = body.classList.contains('amer-open'); // over Amerike, America itself is the pointer
    if (!raf) raf = requestAnimationFrame(place);
  }, { passive: true });
  document.addEventListener('mouseleave', () => { mx = -1; el.hidden = true; });
  // the page turns black (Amerike) or back: the pictogram turns white or back
  new MutationObserver(src).observe(body, { attributes: true, attributeFilter: ['class'] });
  follower = { set(n) { c = n; src(); } };
  setCursor();
  addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') setCursor(); }, true);
}

// ---------- pictures: loading ----------
// one picture, resolved when it is in (or has failed)
const load = (u) => new Promise((res) => { const img = new Image(); img.onload = img.onerror = () => res(); img.src = u; });
// the thumbnails, a few at a time and in the order given (the works on show first), so they never
// all crowd the line at once ahead of the picture someone has just opened
function preloadThumbs(works) {
  const urls = [...new Set(works.map((w) => w.thumb || w.image))];
  let i = 0;
  const next = () => { if (i < urls.length) load(urls[i++]).then(next); };
  for (let n = 0; n < 3; n++) next();
}
// the pictures of the overview and the list load as they come near the screen (watched inside their
// own scrolling box: iOS Safari's own loading="lazy" misses pictures inside such a box)
const lazyWatch = new Map();
function lazyImages(box, root) {
  const imgs = box.querySelectorAll('img[data-src]');
  const show = (i) => { i.src = i.dataset.src; i.removeAttribute('data-src'); };
  if (!('IntersectionObserver' in window)) { imgs.forEach(show); return; }
  let io = lazyWatch.get(root);
  if (!io) {
    io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { io.unobserve(e.target); show(e.target); } }, { root, rootMargin: '800px 0px' });
    lazyWatch.set(root, io);
  }
  imgs.forEach((i) => io.observe(i));
}
function unwatchImages(box, root) { const io = lazyWatch.get(root); if (io) box.querySelectorAll('img[data-src]').forEach((i) => io.unobserve(i)); }
// a picture that failed (a dropped connection on a phone) is tried once more
addEventListener('error', (e) => {
  const i = e.target;
  if (!(i instanceof HTMLImageElement) || i.dataset.retried || !i.getAttribute('src')) return;
  i.dataset.retried = '1';
  const u = i.getAttribute('src');
  setTimeout(() => { i.src = `${u}${u.includes('?') ? '&' : '?'}r=1`; }, 1000);
}, true);

const PORTRAIT_EVERY = 10000; // ms between Martek's photos at the bottom left
async function boot() {
  body.classList.add('intro'); // hidden behind the splash until the intro plays
  const deepStart = /^#\/(work|info|events)/.test(location.hash);
  await fontsIn; // the names are measured in their own typeface
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
  // line); the other thumbnails load afterwards, in the background, once the intro has played
  const h0 = parseHash(), first = worksFor(h0.cat && data.categories.some((c) => c.id === h0.cat) ? h0.cat : 'all');
  const urls = [...new Set(first.map((w) => w.thumb || w.image))];
  await Promise.all([minTime, Promise.race([Promise.all(urls.slice(0, 8).map(load)), new Promise((r) => setTimeout(r, 3000))])]);
  setTimeout(() => preloadThumbs([...first, ...data.works]), /^#\/(work|info|events)/.test(location.hash) ? 400 : INTRO_DELAY + 2200);

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
  if (fromHash.work) {
    const w = data.works.find((x) => x.id === fromHash.work);
    if (w) { gallery.show(w, { animate: false }); openDetail(w, { push: false }); }
  } else if (fromHash.info) openInfo({ push: false });
  else if (currentCat === 'americas') setTimeout(() => openAmer({ auto: true }), deepLink ? 0 : INTRO_DELAY + 1200); // (after the intro's names)
  else if (fromHash.events) openEvents({ push: false });
}

const app = {};

// ---------- intro: VLADO MARTEK stands large in the top-left corner over the splash;
// once the page is loaded the names shrink into place, then menu + language, then the gallery
let namesTyped = Promise.resolve();
function typeNames() {
  fitLabels();
  // the splash shows only the 10% artist mark; the names wait, split into letters, and rise into
  // their corner as the splash lifts (playIntro)
  for (const el of nameLines()) el.innerHTML = [...el.textContent].map((c) => `<span class="ch">${escapeHtml(c)}</span>`).join('');
  namesTyped = Promise.resolve();
}
// the top bar comes in item by item: the categories from the left, then the view icons (on a phone:
// the view icons and the word)
function revealBar({ delay = 0 } = {}) {
  if (reducedMotion() || openWork) return; // (a work open: the bar stays compact)
  const items = [...$('menuList').children, ...$('views').children, $('burger')]
    .filter((el) => el.getClientRects().length);
  items.forEach((el, i) => rise(el, { delay: delay + i * 55, dist: 12, dur: 700 }));
}
const nameLines = () => [$('labelFirst'), $('labelLastText')];
const nameLetters = () => nameLines().flatMap((el) => [...el.querySelectorAll('.ch')]);
// the names' letters rise from below their baseline (each line hides what is below it, style.css)
function riseNames(delay, dur, gap) {
  if (reducedMotion()) return;
  nameLetters().forEach((ch, i) => ch.animate([{ transform: 'translateY(105%)' }, { transform: 'none' }], { duration: dur, delay: delay + i * gap, easing: EASE_OUT_FOR(dur), fill: 'backwards' }));
}
const INTRO_DELAY = 500; // ms: the home page's animations wait this long, so the splash lifts undisturbed
async function playIntro() {
  await namesTyped;
  // the splash rises off the top, so it uncovers the page from the bottom up: first the works come
  // in, then, as its edge reaches the top row, the names (letter by letter, Vlado, then Martek) and the bar
  body.classList.add('intro-names');
  riseNames(INTRO_DELAY + 550, 900, 40);
  setTimeout(() => { body.classList.add('intro-gallery'); app.gallery.enter(); }, INTRO_DELAY + 350);
  setTimeout(() => { body.classList.add('intro-ui'); revealBar(); }, INTRO_DELAY + 700); // the categories and the tools, one after another
  setTimeout(() => body.classList.remove('intro', 'intro-names', 'intro-ui', 'intro-gallery'), INTRO_DELAY + 2400);
}

// ---------- views: Surf (the moving line), Index (every work in a grid) and List (one row each) ----------
let view = 'surf';
function setView(v) {
  if (v === view) return;
  const g = app.gallery, prev = view;
  // between the gallery and the overview the works on screen fly to their new places
  const from = prev === 'surf' && v === 'index' ? g.rects() : prev === 'index' && v === 'surf' ? indexRects() : null;
  view = v;
  barFull();
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
const FLY_MS = 950, FLY_EASE = roughCss(.65, 0, .15, 1, FLY_MS), FLY_STAGGER = 30; // a slow start, a long soft landing, in fine steps
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
      ? { x: r.left, y: r.bottom - r.width / a, w: r.width, h: r.width / a } // (bottom-left in its cell, over its caption)
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
  // the whole cell (the picture and its caption) waits until its picture has landed
  const li = (c) => c.el.parentElement;
  for (const c of cells) li(c).style.visibility = 'hidden';
  const landed = (c) => () => { li(c).style.visibility = ''; riseCap(li(c), 60); }; // the picture lands, then its caption rises
  for (const { cell, slot } of pairs) flights.push({ src: src(cell.work), from: slot.rect, to: cell.rect, z: slot.z, land: landed(cell) });
  let i = 0;
  for (const c of cells) if (!paired.has(c.el)) {
    const n = i++;
    flights.push({ src: src(c.work), from: offRight(c.rect, n), to: c.rect, delay: 80 + n * FLY_STAGGER, land: landed(c) });
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
  closeAmer(); // over Amerike's text: on to its works
  if (b.dataset.view !== view) setView(b.dataset.view);
});

// Overview: every work in one grid, five in a row; same width, own height, top-aligned
// under each work in a grid: its title and year (both already end in their full stop)
const capOf = (w) => `<p class="index-cap">${escapeHtml(w.title || '')} <span class="y">${escapeHtml(w.year || '')}</span></p>`;
function buildIndex({ reveal = false } = {}) {
  unwatchImages($('indexGrid'), $('index'));
  $('indexGrid').innerHTML = byYear(visibleWorks).map((w, i) => `<li style="--i:${i}">
      <button type="button" class="index-item" data-id="${escapeHtml(w.id)}" aria-label="${escapeHtml(`${w.title} ${w.year || ''}`)}">
        <img data-src="${escapeHtml(w.thumb || w.image)}" alt="" decoding="async">
      </button>${capOf(w)}</li>`).join('');
  lazyImages($('indexGrid'), $('index'));
  if (reveal) revealIndex();
}
// the works come in one after another, in reading order
// (each item is hidden, then shown on its own timer; a CSS visibility animation did the same, but
// Chrome sometimes left an item hidden after it had finished)
let revealToken = 0;
// the caption under a work in a grid comes in softly, a moment after its picture
function riseCap(li, delay = 0) { const c = li.querySelector?.('.index-cap'); if (c) rise(c, { delay, dist: 8, dur: 650 }); }
function revealSeq(box, step) {
  const token = ++revealToken, items = [...box.children];
  if (reducedMotion()) return token;
  // only those near the screen take part; the rest are simply there when scrolled to
  const top = box.getBoundingClientRect().top;
  let n = 0;
  for (const li of items) {
    for (const a of li.getAnimations()) a.cancel();
    li.style.visibility = '';
    if (top + li.offsetTop < innerHeight * 1.5) {
      const d = n++ * step;
      rise(li, { delay: d, dist: 18, dur: 700 });
      riseCap(li, d + 220); // its title and year follow the picture a moment later
    }
  }
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
  unwatchImages($('listRows'), $('list'));
  $('listRows').innerHTML = byYear(visibleWorks).map((w, i) => `<li style="--i:${i}">
      <button type="button" class="list-row" data-id="${escapeHtml(w.id)}">
        <span class="list-thumb"><img data-src="${escapeHtml(w.thumb || w.image)}" alt="" decoding="async"></span><span class="list-title">${escapeHtml(w.title || '')}</span><span class="list-cat">${escapeHtml(catsOf(w).map((c) => cats.get(c)).filter(Boolean).join(', '))}</span><span class="list-year">${escapeHtml(w.year || '')}</span>
      </button></li>`).join('');
  lazyImages($('listRows'), $('list'));
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
// the grid and the list: always by year, the oldest first (a work made over several years stands at
// its first; one with no year comes last); works of one year keep the order they have in works.json
const yearOf = (w) => +(String(w.year || '').match(/\d{4}/)?.[0] ?? Infinity);
const byYear = (list) => [...list].sort((a, b) => yearOf(a) - yearOf(b));
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
  t.textContent = title; y.textContent = year;
  // the title comes in softly, the year a moment after it
  rise(t, { dist: 10, dur: 600 });
  rise(y, { delay: 70, dist: 10, dur: 600 });
  return 0;
}
// the title at the bottom (column of the grid): the featured work in the gallery, the work under
// the pointer in the overview
let typeTimer = 0, titleWork;
function updateTitle() {
  const g = app.gallery;
  let w = null;
  // only the gallery shows a title at the bottom: the featured work's (the overview has its
  // captions under the works, the list its rows)
  if (!openWork && view === 'surf') w = g?.featured || null;
  if (w === titleWork) return;
  titleWork = w;
  clearInterval(typeTimer);
  typeTimer = typeInto($('hoverTitle'), w, view === 'surf' ? 0 : 18);
}

// ---------- menu ----------
// a category's name with how many works it holds, raised like an exponent: Knjige¹¹
const catLabel = (id, label) => escapeHtml(label); // (no count beside the name)
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
  // language and sound: the same two as on a computer, the language on show (a tap switches) and the word Sound
  const on = isEnabled();
  $('mnavPrefs').innerHTML = `<button type="button" data-go="lang" aria-label="${en ? 'Language: English (switch to Hrvatski)' : 'Jezik: hrvatski (prebaci na English)'}"><span class="lang-code">${en ? 'EN' : 'HR'}</span></button>`
    + `<button type="button" data-go="sound" aria-pressed="${on}"${on ? '' : ' class="is-off"'}><span class="sound-word">Sound</span></button>`;
  $('mnav').setAttribute('aria-label', en ? 'Menu' : 'Izbornik');
}
function setMobileNav(v) {
  if (v === mobileNav()) return;
  if (v) { buildMobileNav(); barFull(); }
  $('mnav').hidden = !v;
  if (v) {
    fadeIn($('mnav'), 220);
    [...$('mnavCats').children, $('mnavPrefs')].forEach((li, i) => rise(li, { delay: 40 + i * 35, dist: 10, dur: 500 }));
  }
  body.classList.toggle('mnav-open', v);
  syncCover();
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
    const closePages = () => { if (!shut('info')) closeInfo(); if (!shut('events')) closeEvents(); if (openWork) closeDetail(); };
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
  if (cat === currentCat) { if (cat === 'americas') openAmer(); return; } // a click on Amerike while on it: its text, always
  if (cat !== 'americas') closeAmer();
  if (openWork) closeDetail({ fromPop: true }); // a new medium from inside a work: back to the gallery
  catToken++;
  barFull();
  currentCat = cat;
  body.classList.toggle('cat-americas', cat === 'americas'); // Amerike: the whole page black, the text red
  updateBurger();
  if (push) setHash(cat === 'all' ? '' : `#/${cat}`);
  visibleWorks = worksFor(cat);
  updateMenu();
  app.gallery.setWorks(visibleWorks);
  if (view === 'surf') app.gallery.enter();
  buildIndex({ reveal: view === 'index' });
  buildList({ reveal: view === 'list' });
  updateTitle();
  if (cat === 'americas') openAmer({ auto: true });
}

// ---------- Amerike: the exhibition's text, an overlay over everything ----------
// the title, how long the exhibition runs, and the curator's text with what matters most in white;
// the × top right (or Escape) closes it. It opens each time Amerike is chosen (and again on a click
// on Amerike when it is already chosen).
const hl = (t) => escapeHtml(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/_(.+?)_/g, '<em>$1</em>'); // **highlight**, _italics_
const amerData = () => { const c = data.categories.find((x) => x.id === 'americas')?.intro; return c && (c[lang] || c.hr); };
function buildAmer() {
  const t = amerData();
  if (!t) return;
  $('amerTitle').textContent = t.title || '';
  $('amerSub').textContent = t.subtitle || '';
  $('amerSub').hidden = !t.subtitle; // (one title, in the page's language: no second line under it)
  // how long it runs, and where: one line (on a phone the place may wrap under the dates)
  $('amerDates').innerHTML = [t.dates, t.place].filter(Boolean).map((x) => `<span>${escapeHtml(x)}</span>`).join('<span class="amer-dot" aria-hidden="true"> · </span>');
  $('amerLead').innerHTML = hl(t.lead || '');
  $('amerBody').innerHTML = (t.body || []).map((p) => `<p>${hl(p)}</p>`).join('');
  $('amerSign').textContent = t.sign ? `— ${t.sign}` : '';
  $('amerGo').innerHTML = `${escapeHtml(t.go || (lang === 'en' ? 'See exhibition' : 'Otvori izložbu'))}${EX_ARROW}`;
  $('amerClose').setAttribute('aria-label', lang === 'en' ? 'Close' : 'Zatvori');
  $('amerLogos').querySelector('svg').setAttribute('aria-label', lang === 'en' ? 'Exhibition logos' : 'Logotipi izložbe');
}
// it opens by itself only the first time Amerike is chosen (remembered in this browser); after that
// a click on Amerike while it is chosen opens it
const AMER_SEEN = 'vm-amer-seen';
const amerSeen = () => { try { return localStorage.getItem(AMER_SEEN) === '1'; } catch { return false; } };
function openAmer({ auto = false } = {}) {
  if (!amerData() || !shut('amer')) return;
  if (auto && amerSeen()) return;
  try { localStorage.setItem(AMER_SEEN, '1'); } catch { /* storage unavailable: it shows each time */ }
  buildAmer();
  showOverlay($('amer'));
  body.classList.add('amer-open');
  $('amerScroll').scrollTop = 0;
  // it comes in part by part
  [$('amerTitle'), $('amerSub'), $('amerDates'), $('amerLead'), ...$('amerBody').children, $('amerSign'), $('amerGo'), $('amerLogos')]
    .forEach((el, i) => rise(el, { delay: 150 + Math.min(i, 6) * 90, dist: 18, dur: 800 }));
  rise($('amerClose'), { delay: 300, dist: 10, dur: 500 });
  amerMap.start();
}
// the pointer over Amerike's text: America, filled black. Mouse only; over the × the ordinary
// hand takes over.
const amerMap = (() => {
  let raf = 0, mx = -1, my = -1;
  const el = () => $('amerMap');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const place = () => { raf = 0; el().style.translate = `${mx}px ${my}px`; };
  $('amer').addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mx = e.clientX; my = e.clientY;
    el().classList.toggle('on', !e.target.closest('.amer-x, .amer-go'));
    if (!raf) raf = requestAnimationFrame(place);
  }, { passive: true });
  $('amer').addEventListener('pointerleave', () => el().classList.remove('on'));
  return {
    start() { $('amer').classList.toggle('own-cursor', fine.matches); },
    stop() { el().classList.remove('on'); },
  };
})();
function closeAmer({ toWorks = false } = {}) {
  if (shut('amer')) return;
  amerMap.stop();
  fadeOut($('amer'), () => { hideOverlay($('amer')); body.classList.remove('amer-open'); });
  if (toWorks && view === 'surf') app.gallery.enter(); // the works slide in as the text goes
}
$('amerClose').addEventListener('click', (e) => { e.stopPropagation(); closeAmer({ toWorks: true }); });
$('amerGo').addEventListener('click', (e) => { e.stopPropagation(); closeAmer({ toWorks: true }); }); // on to the works

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
  if (!shut('info')) closeInfo({ fromPop: true });
  sound.click();
  buildEvents();
  showOverlay($('events'));
  body.classList.add('events-open');
  $('events').querySelector('.events-scroll').scrollTop = 0;
  rise($('eventsTitle'), { delay: 80, dist: 16 });
  [...$('eventsRows').children].forEach((r, i) => rise(r, { delay: 180 + i * 70, dist: 16 }));
  if (push) setHash('#/events', true);
}
function closeEvents({ fromPop = false } = {}) {
  if (shut('events')) return;
  sound.click();
  const done = () => { hideOverlay($('events')); body.classList.remove('events-open'); revealBar(); };
  fadeOut($('events'), done);
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
  $('infoContact').hidden = !a.email;
  if (a.email) { $('infoMail').href = `mailto:${a.email}`; $('infoMail').textContent = a.email; }
}

function showOverlay(el) {
  barFull();
  el._fade = (el._fade || 0) + 1; // a fade-out still running is called off
  el.classList.remove('is-closing');
  for (const a of el.getAnimations()) a.cancel();
  el.hidden = false;
  fadeIn(el);
  el.classList.add('is-open');
  app.gallery.paused = true;
  app.gallery.setHover(null);
  body.classList.remove('focus-menu');
  lastFocus = document.activeElement;
  syncCover();
  setTimeout(() => el.focus({ preventScroll: true, focusVisible: false }), 50);
}
// the gallery draws nothing while a page or the phone's menu lies over it
function syncCover() { if (app.gallery) app.gallery.covered = !shut('detail') || !shut('info') || !shut('events') || !shut('amer') || mobileNav(); }
function hideOverlay(el) {
  barFull();
  el.classList.remove('is-open');
  el.hidden = true;
  app.gallery.paused = false;
  syncCover();
  lastFocus?.focus?.({ preventScroll: true, focusVisible: false });
}
let lastFocus = null;

function openInfo({ push = true } = {}) {
  sound.click();
  showOverlay($('info'));
  body.classList.add('focus-info');
  revealInfoText();
  // the text comes in, part by part
  [...$('infoBody').children, $('infoCredits')].forEach((p, i) => rise(p, { delay: 120 + Math.min(i, 8) * 60, dist: 16, dur: 750 }));
  if (push) setHash('#/info', true);
}
function closeInfo({ fromPop = false } = {}) {
  if (shut('info')) return;
  sound.click();
  fadeOut($('info'), () => { hideOverlay($('info')); body.classList.remove('focus-info'); });
  if (!fromPop) restoreHash();
}

// ---------- detail: the work at the top, its details below (scroll, or Read more) ----------
let detailTimer = 0, stripPhotos = [];
// a work's page: what lies under the work rises softly into view as it is scrolled to
let rvWatch = null;
function revealOnScroll(els) {
  if (reducedMotion() || !('IntersectionObserver' in window)) return;
  rvWatch ||= new IntersectionObserver((es) => {
    // those coming in together follow one another a little
    let n = 0;
    for (const e of es) if (e.isIntersecting) { rvWatch.unobserve(e.target); const d = `${n++ * 70}ms`; e.target.style.transitionDelay = d; e.target.style.setProperty('--rvd', d); e.target.classList.add('in'); }
  }, { root: $('detailScroll'), threshold: 0.12 });
  for (const el of els) { el.classList.add('rv'); rvWatch.observe(el); }
}
function fillDetail(work) {
  clearInterval(detailTimer);
  detailTimer = typeInto($('detailTitle'), work, 30, $('detailYear'));
  $('detailDesc').textContent = work.description || '';
  $('detailNavTitle').textContent = work.title || '';
  // under the work: its own extra photos when it has them, otherwise the details cut from it (three, or two)
  // (`details`, square crops of where most is going on), otherwise the work itself, once
  const crops = !work.photos?.length && work.details?.length;
  stripPhotos = work.photos?.length ? work.photos : crops ? work.details : [work.image];
  $('detailStrip').classList.toggle('is-details', !!crops);
  $('detailStrip').classList.toggle('is-two', !!crops && work.details.length === 2); // two details: a wide one and a close one, side by side
  $('detailStrip').innerHTML = stripPhotos.map((u) => `<figure class="strip-item"><img src="${escapeHtml(u)}" alt="" decoding="async"></figure>`).join('');
  $('detailStrip').hidden = !stripPhotos.length;
  // at the end, after a grey rule: the other works of its medium, in the overview's grid
  const cat = catOf(work), more = cat ? worksFor(cat).filter((w) => w !== work) : [];
  $('detailMore').hidden = !more.length;
  $('detailMoreGrid').innerHTML = more.map((w) => `<li><button type="button" class="index-item" data-id="${escapeHtml(w.id)}" aria-label="${escapeHtml(`${w.title} ${w.year || ''}`)}"><img src="${escapeHtml(w.thumb || w.image)}" alt="" decoding="async"></button>${capOf(w)}</li>`).join('');
  revealOnScroll([...$('detailStrip').children, ...$('detailMoreGrid').children]);
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
const DETAIL_MS = 950, DETAIL_EASE = roughCss(.65, 0, .15, 1, DETAIL_MS); // the picture's flight: a slow start, a long soft landing, in fine steps
document.documentElement.style.setProperty('--fly-ms', `${DETAIL_MS}ms`); // the names move on the same time and curve
document.documentElement.style.setProperty('--fly-ease', DETAIL_EASE);
const detailList = () => {
  const list = openWork && visibleWorks.includes(openWork) ? visibleWorks : data.works;
  return view === 'surf' ? list : byYear(list); // from the grid or the list: on through the works in their order there
};
// a picture's own box inside a frame, contained (on the left, or centred on a phone)
function containIn(r, a, centre = false, bottom = false) {
  const w = a >= r.width / r.height ? r.width : r.height * a, h = w / a;
  return { x: r.left + (centre ? (r.width - w) / 2 : 0), y: bottom ? r.bottom - h : r.top + (r.height - h) / 2, w, h };
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
  return containIn(r, a, false, view === 'index'); // the overview's pictures stand bottom-left in their cells
}
// the picture on the page: as large as the frame allows
function layoutFigure(work) {
  const fig = $('detailFigure'), img = $('detailImg');
  // the frame ends three margins above the title, however many lines the title takes
  const head = fig.parentElement.querySelector('.detail-head');
  const pad = app.gallery?.m.pad ?? 16; // --pad
  fig.style.bottom = `${fig.parentElement.clientHeight - head.offsetTop + pad * 3}px`;
  const moved = fig.style.transform;
  fig.style.transform = ''; // measure the frame on its place, without the drift
  const f = fig.getBoundingClientRect();
  fig.style.transform = moved;
  const c = containIn(f, work.aspect ?? 1, app.gallery?.m.phone);
  Object.assign(img.style, { left: `${c.x - f.left}px`, top: `${c.y - f.top}px`, width: `${c.w}px`, height: `${c.h}px` });
  return c;
}
addEventListener('resize', () => { if (openWork) layoutFigure(openWork); });

// ---------- the open work drifts the other way from the mouse; on a phone, the other way from the phone's lean ----------
// flat on the page, only moved. Smooth, not stepped: like the gallery under the hand, it follows the body
const drift = (() => {
  const MAX = 24, MAX_PHONE = 14; // px, either way
  const LEAN = 20; // degrees the phone leans for the whole of that distance
  const fine = matchMedia('(pointer: fine)');
  let x = 0, y = 0, tx = 0, ty = 0, raf = 0, on = false;
  let held = false; // while the picture flies in it stays on its place, so that it lands exactly there
  let b0 = null, g0 = null; // the phone's resting angle when the work opened
  let asked = false; // iOS: the gyroscope is granted
  const clamp = (v) => Math.max(-1, Math.min(1, v));
  const fig = () => $('detailFigure');
  function frame() {
    const k = fine.matches ? 0.12 : 0.2;
    const ax = held ? 0 : tx, ay = held ? 0 : ty;
    x += (ax - x) * k; y += (ay - y) * k;
    const m = fine.matches ? MAX : MAX_PHONE;
    fig().style.transform = `translate3d(${(x * m).toFixed(2)}px, ${(y * m).toFixed(2)}px, 0)`;
    // the loop runs only while the picture is still moving (a new mouse or gyroscope reading starts it again)
    raf = Math.abs(ax - x) + Math.abs(ay - y) > 0.001 ? requestAnimationFrame(frame) : 0;
  }
  const run = () => { if (on && !raf) raf = requestAnimationFrame(frame); };
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    // measured from the middle of the screen: the mouse there leaves the picture on its place
    tx = clamp(-(e.clientX / innerWidth - 0.5) * 2);
    ty = clamp(-(e.clientY / innerHeight - 0.5) * 2);
    run();
  }, { passive: true });
  document.addEventListener('mouseleave', () => { tx = ty = 0; run(); });
  addEventListener('deviceorientation', (e) => {
    if (!on || fine.matches || e.beta == null) return;
    // the screen may be turned: map the device's axes onto the screen's
    const a = ((typeof window.orientation === 'number' ? window.orientation : screen.orientation?.angle) || 0) % 360; // iOS: window.orientation is the reliable one
    let lr = e.gamma, fb = e.beta;
    if (a === 90) [lr, fb] = [e.beta, -e.gamma];
    else if (a === 270 || a === -90) [lr, fb] = [-e.beta, e.gamma];
    else if (a === 180) [lr, fb] = [-e.gamma, -e.beta];
    if (g0 == null) { g0 = lr; b0 = fb; }
    // the resting angle follows the hand very slowly, so however the phone comes to be held, it settles
    g0 += (lr - g0) * 0.004; b0 += (fb - b0) * 0.004;
    tx = clamp(-(lr - g0) / LEAN);
    ty = clamp(-(fb - b0) / LEAN);
    run();
  });
  return {
    // called from the tap that opens a work: iOS asks for the gyroscope only inside a user gesture
    start() {
      if (on || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      on = true; held = true; g0 = b0 = null;
      const D = window.DeviceOrientationEvent;
      if (fine.matches || !D || typeof D.requestPermission !== 'function' || asked) return;
      const ask = () => D.requestPermission().then((r) => { asked = r === 'granted'; }).catch(() => {});
      ask();
      // opened from a link, not a tap: iOS refuses, so ask again at the next touch
      addEventListener('touchend', () => { if (on && !asked) ask(); }, { once: true });
    },
    // the picture has landed: from here on it moves
    release() { held = false; run(); },
    // back on its place at once: the picture flies back from where it lay
    stop() { on = false; x = y = 0; cancelAnimationFrame(raf); raf = 0; fig().style.transform = ''; },
  };
})();
// the work's picture: its thumbnail at once (already in: it was on show where the work was clicked),
// then the large picture as soon as it is in and decoded, so the frame is never empty; then the
// works either side load ahead, for the arrows
let detailImgToken = 0;
function setDetailImage(work) {
  const img = $('detailImg'), token = ++detailImgToken;
  const thumb = work.thumb || work.image;
  img.src = thumb;
  if (!work.image || work.image === thumb) return;
  const full = new Image();
  full.decoding = 'async';
  full.src = work.image;
  const ready = full.decode ? full.decode() : new Promise((ok, fail) => { full.onload = ok; full.onerror = fail; });
  ready.then(() => { if (token === detailImgToken) img.src = work.image; }, () => {})
    .then(() => {
      if (token !== detailImgToken) return;
      const list = detailList(), i = list.indexOf(work);
      if (i >= 0) for (const d of [1, -1]) { const w = list[(i + d + list.length) % list.length]; if (w?.image) load(w.image); }
    });
}
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
function setDocTitle() { document.title = openWork ? `Vlado Martek. ${openWork.title}` : 'Vlado Martek. 10% Artist.'; } // the title already ends in its full stop (or ? !)
function openDetail(work, { push = true, dir = 0 } = {}) {
  if (!data) return;
  const swap = !!openWork;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const from = !swap && !reduced ? sourceRect(work) : null;
  openWork = work;
  drift.start();
  sound.click();
  fillDetail(work);
  fillCount();
  fillBack();
  setDocTitle();
  const img = $('detailImg');
  setDetailImage(work);
  if (push) setHash(`#/work/${work.id}`, !swap);
  if (swap) {
    // moving on to the next / previous work: the picture slides out and the next one slides in
    $('detailScroll').scrollTop = 0;
    layoutFigure(work);
    sheetFades();
    if (!reduced) img.animate([{ opacity: 0, transform: `translateX(${dir * 40}px)` }, { opacity: 1, transform: 'none' }], { duration: 700, easing: EASE_OUT });
    return;
  }
  app.gallery.setHover(null);
  body.classList.add('detail-open');
  body.classList.remove('names-back');
  showOverlay($('detail'));
  setCompact(true, { now: true }); // the names shrink and language and sound go as soon as a work opens
  $('detailScroll').scrollTop = 0;
  $('detail').classList.remove('title-on');
  body.classList.remove('detail-title-on');
  $('detailTitle').parentElement.style.visibility = '';
  openedAt = performance.now();
  updateMenu();
  updateTitle();
  const to = layoutFigure(work);
  sheetFades();
  if (reduced) return;
  if (!from) drift.release();
  // the page comes up, the picture flies in from where it was clicked, the title rises
  rise($('detailTitle'), { delay: 280, dist: 24, dur: 800 });
  rise($('detailYear'), { delay: 360, dist: 24, dur: 800 });
  if (from) {
    img.style.visibility = 'hidden';
    flyPicture(work.thumb || work.image, from, to).then((el) => { img.style.visibility = ''; drift.release(); requestAnimationFrame(() => el.remove()); });
  } else rise(img, { dist: 30, dur: 900 });
}

// hides the work at its place in the view behind; returns what shows it again
function holdPlace(work) {
  if (view === 'surf') {
    const g = app.gallery, k = Math.round(g.target);
    g.flying.add(k);
    return () => g.flying.delete(k);
  }
  const sel = view === 'index' ? `.index-item[data-id="${CSS.escape(work.id)}"] img` : `.list-row[data-id="${CSS.escape(work.id)}"] .list-thumb img`;
  const img = $(view).querySelector(sel);
  if (img) img.style.visibility = 'hidden';
  return () => { if (img) img.style.visibility = ''; };
}

function closeDetail({ fromPop = false } = {}) {
  zoomOff?.();
  body.classList.remove('detail-title-on'); // the names come back
  if (!openWork) return;
  const work = openWork;
  sound.click();
  openWork = null;
  setDocTitle();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // the view behind takes up the work the page ended on
  if (view === 'surf' && app.gallery.featuredWork() !== work) app.gallery.show(work, { animate: false });
  body.classList.add('names-back'); // the names grow back as the picture flies back
  const imgRect = $('detailImg').getBoundingClientRect(); // (where it stands now, drift included: the flight starts there)
  drift.stop();
  const back = view === 'surf' ? app.gallery.featuredRect() : sourceRect(work);
  const done = () => {
    hideOverlay($('detail'));
    for (const a of $('detail').getAnimations()) a.cancel();
    body.classList.remove('detail-open', 'detail-sheet-bottom', 'names-back');
    revealBar();
    updateMenu();
    updateTitle();
  };
  if (!fromPop) restoreHash();
  if (reduced || !back || imgRect.bottom < 0) {
    fadeOut($('detail'), done);
    return;
  }
  // the picture flies back to its place in the view, while the page fades away
  $('detailImg').style.visibility = 'hidden';
  const showAgain = holdPlace(work); // its place in the view stays empty until it lands there: never two of the same work
  flyPicture(work.thumb || work.image, { x: imgRect.left, y: imgRect.top, w: imgRect.width, h: imgRect.height }, back)
    .then((el) => { $('detailImg').style.visibility = ''; showAgain(); requestAnimationFrame(() => el.remove()); });
  fadeOut($('detail'), done, 320); // the page fades away; the picture finishes its flight over the view
}

function stepWork(dir) {
  if (!openWork) return;
  const list = detailList();
  const i = list.indexOf(openWork);
  openDetail(list[(i + dir + list.length) % list.length], { push: true, dir });
}
// ---------- a work's picture, enlarged ----------
// a click (or tap) on the picture opens it over everything, close up: it grows out of its place on
// the page, the part on show follows the cursor (a finger drags it), and the × top right (or Escape) closes it
const ZOOM = 1.5; // how many times larger than the whole work fitted to the screen
let zoomOff = null;
const zoomOpen = () => !!zoomOff;
function openZoom(e) {
  if (!openWork || zoomOff) return;
  const work = openWork, aspect = work.aspect ?? 1, page = $('detailImg');
  const r = page.getBoundingClientRect();
  const label = lang === 'en' ? 'Close enlargement' : 'Zatvori povećanje';
  const el = document.createElement('div');
  el.className = 'zoom';
  el.innerHTML = `<img alt="" decoding="async" draggable="false"><button type="button" class="zoom-x" aria-label="${label}"><svg class="icon" viewBox="0 0 12 12" aria-hidden="true"><path class="s" d="M1.75 1.75l8.5 8.5M10.25 1.75l-8.5 8.5"/></svg></button>`;
  const img = el.firstChild, x0 = el.lastChild;
  img.src = page.currentSrc || work.thumb || work.image; // what is on the page now, at once
  if (work.image && !img.src.endsWith(work.image)) { const f = new Image(); f.src = work.image; (f.decode ? f.decode() : Promise.resolve()).then(() => { img.src = work.image; }, () => {}); }
  document.body.append(el);
  body.classList.add('zoom-open');
  sound.click();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let w = 0, h = 0, x = 0, y = 0, tx = 0, ty = 0, px = e.clientX / innerWidth, py = e.clientY / innerHeight, raf = 0, live = true, touch = null;
  // close up: larger than the whole work fitted to the screen (along a side that still fits, it stays centred)
  const size = () => {
    const W = innerWidth, H = innerHeight;
    w = (aspect >= W / H ? W : H * aspect) * ZOOM; h = w / aspect;
    img.style.width = `${w}px`; img.style.height = `${h}px`;
  };
  // where the pointer is on the screen is where it looks on the picture (with a margin, so the
  // edges are easy to reach)
  const aim = () => {
    const vw = innerWidth, vh = innerHeight, m = Math.min(vw, vh) * 0.06;
    tx = w > vw ? clamp(m - (w - vw + m * 2) * px, vw - w, 0) : (vw - w) / 2;
    ty = h > vh ? clamp(m - (h - vh + m * 2) * py, vh - h, 0) : (vh - h) / 2;
  };
  const frame = () => {
    raf = 0;
    if (!live) return;
    x += (tx - x) * 0.14; y += (ty - y) * 0.14; // smooth: it follows the hand
    if (Math.abs(tx - x) + Math.abs(ty - y) < 0.3) { x = tx; y = ty; } else raf = requestAnimationFrame(frame);
    img.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
  };
  const run = () => { if (!raf) raf = requestAnimationFrame(frame); };
  size(); aim(); x = tx; y = ty;
  img.style.translate = `${x}px ${y}px`;
  if (!reducedMotion()) {
    // it grows out of the picture on the page; the ground and the × come in with it
    img.animate([{ transform: `translate(${r.left - x}px, ${r.top - y}px) scale(${r.width / w})` }, { transform: 'none' }], { duration: 650, easing: roughCss(.65, 0, .15, 1, 650) });
    el.animate([{ backgroundColor: 'transparent' }, {}], { duration: 400, easing: 'ease-out' });
    rise(x0, { delay: 350, dist: 10, dur: 500 });
  }
  el.addEventListener('pointermove', (ev) => {
    if (ev.pointerType === 'mouse') { px = ev.clientX / innerWidth; py = ev.clientY / innerHeight; aim(); run(); return; }
    if (!touch || touch.id !== ev.pointerId) return;
    tx = w > innerWidth ? clamp(touch.tx + ev.clientX - touch.x, innerWidth - w, 0) : tx;
    ty = h > innerHeight ? clamp(touch.ty + ev.clientY - touch.y, innerHeight - h, 0) : ty;
    x = tx; y = ty; run();
  });
  el.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType === 'mouse' || ev.target.closest('.zoom-x')) return;
    touch = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, tx, ty };
    el.setPointerCapture?.(ev.pointerId);
  });
  el.addEventListener('pointerup', () => { touch = null; });
  x0.addEventListener('click', (ev) => { ev.stopPropagation(); off(); });
  // Escape closes it; the arrows do not move on to another work meanwhile
  const key = (ev) => { if (['Escape', 'ArrowLeft', 'ArrowRight'].includes(ev.key)) { ev.stopImmediatePropagation(); ev.preventDefault(); if (ev.key === 'Escape') off(); } };
  const resize = () => { size(); aim(); x = tx; y = ty; run(); };
  addEventListener('keydown', key, true);
  addEventListener('resize', resize);
  function off() {
    if (!live) return;
    live = false; zoomOff = null;
    removeEventListener('keydown', key, true);
    removeEventListener('resize', resize);
    cancelAnimationFrame(raf);
    body.classList.remove('zoom-open');
    sound.click();
    if (reducedMotion()) { el.remove(); return; }
    // it settles back into the picture on the page as the ground fades away
    const back = $('detailImg').getBoundingClientRect();
    x0.remove();
    el.animate([{}, { backgroundColor: 'transparent' }], { duration: 450, easing: 'ease-in', fill: 'forwards' });
    img.animate([{ transform: 'none' }, { transform: `translate(${back.left - x}px, ${back.top - y}px) scale(${back.width / w})` }], { duration: 550, easing: roughCss(.65, 0, .15, 1, 550), fill: 'forwards' })
      .finished.catch(() => {}).then(() => el.remove());
  }
  zoomOff = off;
}
$('detailImg').addEventListener('click', (e) => { e.stopPropagation(); openZoom(e); });

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
  pageView();
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
  pageView();
}
function route() {
  if (!data || !app.gallery) return;
  const h = parseHash();
  if (!h.work && openWork) closeDetail({ fromPop: true });
  if (!h.info && !shut('info')) closeInfo({ fromPop: true });
  if (!h.events && !shut('events')) closeEvents({ fromPop: true });
  if (h.events && shut('events')) openEvents({ push: false });
  if (h.work && h.work !== openWork?.id) {
    const w = data.works.find((x) => x.id === h.work);
    if (w) openDetail(w, { push: false });
  }
  if (h.info && shut('info')) openInfo({ push: false });
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
  // measured at full size and at once: not mid-way through the names' own change of size (a phone, scrolled)
  const compact = body.classList.contains('bar-compact');
  body.classList.remove('bar-compact');
  a.style.transition = b.style.transition = 'none';
  root.style.removeProperty('--name');
  const fs = parseFloat(getComputedStyle(a).fontSize);
  const phone = matchMedia('(max-width: 700px), (orientation: portrait) and (max-width: 900px)').matches;
  const pad = parseFloat(getComputedStyle(a).paddingTop);
  const k = Math.min(1,
    (innerWidth - pad * 2 - 24) / (a.offsetWidth + b.offsetWidth),
    // before the media (on a phone the hamburger replaces them: before column 3 of its 6)
    ((phone ? innerWidth * 0.42 : $('menu').getBoundingClientRect().left) - pad * (phone ? 2 : 3)) / Math.max(a.offsetWidth, b.offsetWidth));
  if (k < 1) root.style.setProperty('--name', `${Math.floor(fs * k)}px`);
  // Vlado's width in em as it is set in the one line (scrolled): Martek stands a word space after it
  body.classList.add('bar-compact');
  root.style.setProperty('--first-em', (a.getBoundingClientRect().width / parseFloat(getComputedStyle(a).fontSize)).toFixed(3));
  body.classList.toggle('bar-compact', compact);
  void a.offsetWidth; // (the new size is in before the transitions come back)
  a.style.transition = b.style.transition = '';
}

// ---------- a phone: scrolling down frees the screen ----------
// the names shrink into one line on the top row, the word top right and his portrait leave; scrolling
// back up (or the top of the page) brings them back. A work and About stay compact while scrolled.
// the navigation leaves the way it came in after the splash (revealBar), turned round: item by item,
// each fading as it sinks a little; and comes back in the same way
function setCompact(v, { now = false } = {}) {
  if (v === body.classList.contains('bar-compact')) return;
  body.classList.toggle('bar-compact', v);
  const items = [...$('menuList').children, ...$('views').children].filter((el) => el.getClientRects().length); // (language and sound go with his portrait: style.css)
  for (const el of items) for (const a of el.getAnimations()) a.cancel();
  if (now || reducedMotion()) return;
  items.forEach((el, i) => {
    if (v) el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(12px)' }], { duration: 450, delay: i * 30, easing: EASE_OUT_FOR(450), fill: 'backwards' });
    else rise(el, { delay: i * 55, dist: 12, dur: 700 });
  });
}
const barFull = () => { if (!openWork) setCompact(false); }; // (a work stays compact for as long as it is open)
{
  const last = new WeakMap();
  const watch = (el, byDirection) => el.addEventListener('scroll', () => {
    const y = Math.max(0, Math.min(el.scrollTop, el.scrollHeight - el.clientHeight)); // (not the bounce past either end)
    if (y <= 8) { last.set(el, y); barFull(); return; }
    if (!byDirection) { setCompact(true); return; }
    const d = y - (last.get(el) ?? 0);
    if (Math.abs(d) < 10) return; // a few pixels either way change nothing
    last.set(el, y);
    setCompact(d > 0);
  }, { passive: true });
  watch($('index'), true);
  watch($('list'), true);
  watch($('events').querySelector('.events-scroll'), true);
  watch($('detailScroll'), false);
  watch($('info').querySelector('.info-inner'), false);
}
addEventListener('resize', () => fitLabels());

// ---------- wiring ----------
// About (bottom left, with his portrait) opens the text about him; a second click closes it
$('aboutLink').addEventListener('click', (e) => { e.stopPropagation(); if (!shut('info')) { closeInfo(); return; } if (openWork) closeDetail(); if (!shut('events')) closeEvents(); openInfo(); });
initLangMenu();
// (pages are closed without stepping back in the history, which would land after the change and undo it)
const goHome = () => {
  sound.click();
  if (!shut('info')) closeInfo({ fromPop: true });
  if (!shut('events')) closeEvents({ fromPop: true });
  if (openWork) closeDetail({ fromPop: true });
  closeAmer();
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
for (const a of $('infoCredits').querySelectorAll('a')) a.addEventListener('click', (e) => e.stopPropagation()); // the address opens mail, the designer's site a new tab: the page stays
// the fades at the top and the bottom take the light panel's colour once it lies under them
function sheetFades() {
  const p = $('detailPanel').getBoundingClientRect().top;
  const topFade = parseFloat(getComputedStyle($('detail'), '::after').height) || 0;
  const bottomFade = document.querySelector('.bottom-fade').offsetHeight;
  $('detail').classList.toggle('sheet-top', p < topFade);
  body.classList.toggle('detail-sheet-bottom', !!openWork && p < innerHeight - bottomFade);
}
$('detailScroll').addEventListener('scroll', () => {
  sheetFades();
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
  if (e.key === 'Escape') { if (!shut('amer') && !openWork) closeAmer({ toWorks: true }); else if (openWork) closeDetail(); else if (!shut('events')) closeEvents(); else if (!shut('info')) closeInfo(); else body.classList.remove('focus-menu'); }
  if (openWork && e.key === 'ArrowRight') stepWork(1);
  if (openWork && e.key === 'ArrowLeft') stepWork(-1);
  if (!openWork && shut('info') && view === 'surf' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) app.gallery.step(e.key === 'ArrowRight' ? 1 : -1);
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
