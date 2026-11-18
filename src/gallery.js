// Carousel. One work is featured on the page grid (third column of the grid); the works after it
// stand behind it to the right like a fanned-out deck, each a step further right and a little
// smaller; the one before it waits small on the left. Scrolling moves the featured work out to the
// left while the next one comes forward from the deck. The line is endless (works repeat).
// In detail mode (a work is open) the featured work stays where it is, its neighbours move to the
// edges and the rest slide out of the screen. Nothing fades: works only move.

import { sound, unlock } from './sound.js';

const mod = (a, n) => ((a % n) + n) % n;
const lerp = (a, b, t) => a + (b - a) * t;
const WHEEL = 320;        // px of wheel travel per work
const AUTO_MS = 3000;      // left alone, each work stays in front this long before the next one comes
const SNAP_AFTER = 160;   // ms of quiet before the line settles on a work
const EASE = 9;           // how quickly the line follows the wheel / hand (1/s)
export const OPEN_MS = 900; // opening / closing a work: the title grows in step with this
const GROW = 1.15;          // how much bigger the open work stands

// CSS-style cubic-bezier easing, so the line and the title can move in the same rhythm
export function bezier(x1, y1, x2, y2) {
  const c = (a, b, t) => ((1 - 3 * b + 3 * a) * t + (3 * b - 6 * a)) * t * t + 3 * a * t;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (c(x1, x2, t) < x) lo = t; else hi = t; }
    return c(y1, y2, t);
  };
}
// every movement keeps its soft curve, but time moves in fine steps (ROUGH_FPS a second): a slight
// hitch, a touch of the unfinished. Only what follows the hand (wheel, swipe, the pointer) is smooth.
export const ROUGH_FPS = 24;
const quant = (x, n) => (x >= 1 ? 1 : Math.floor(Math.max(0, x) * n) / n);
const stepsFor = (ms) => Math.max(3, Math.round(ms / 1000 * ROUGH_FPS));
export const rough = (ease, ms) => { const n = stepsFor(ms); return (x) => ease(quant(x, n)); };
// the same, as a CSS easing for the Web Animations API and for transitions
// (older browsers without linear() easings, before Safari 17.2: the plain smooth curve)
const hasLinear = typeof CSS !== 'undefined' && CSS.supports?.('animation-timing-function', 'linear(0, 1)');
export function roughCss(x1, y1, x2, y2, ms) {
  if (!hasLinear) return `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
  const e = bezier(x1, y1, x2, y2), n = stepsFor(ms), pts = [];
  for (let i = 0; i < n; i++) { const v = +e(i / n).toFixed(4); pts.push(`${v} ${(i / n * 100).toFixed(2)}%`, `${v} ${((i + 1) / n * 100).toFixed(2)}%`); }
  return `linear(${pts.join(', ')}, 1 100%)`;
}
export const OPEN_EASE = 'cubic-bezier(.65, 0, .2, 1)';
const openEase = rough(bezier(0.65, 0, 0.2, 1), OPEN_MS);
const enterEase = (t) => 1 - Math.pow(1 - t, 4); // the works sliding in: perfectly smooth, without the fine steps



export class Gallery {
  constructor(root, track, { onOpen, onHover, onFeature }) {
    this.root = root;
    this.track = track;
    this.onOpen = onOpen;
    this.onHover = onHover;
    this.onFeature = onFeature;
    this.works = [];
    this.slots = new Map();   // absolute index k → { el, img, k }
    this.pool = new Map();    // work → figures that left the screen, kept with their picture loaded and decoded for when it comes back
    this.covered = false;     // a page (a work, About, the events) or the phone's menu lies over the gallery: nothing is drawn
    this.p = 0;               // current position (index of the featured work, fractional while moving)
    this.target = 0;
    this.mode = 0;            // 0 = gallery, 1 = a work is open
    this.modeTarget = 0;
    this.hovered = null;
    this.paused = false;
    this.hidden = false;
    this.lastInput = 0;
    this.featured = null;
    this.hiddenK = new Set();  // works whose 3D model stands in their place (drawn by main.js)
    this.flying = new Set();   // works being flown in from the overview (drawn by main.js meanwhile)
    this.holdAll = false;      // hide every work for a moment (until the flight is set up)
    this.scrollBlur = 0;       // px, set by the open work's page as it scrolls
    this.enterAt = null;       // when the works last started sliding in from the right
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.last = performance.now();
    this.bindInput();
    addEventListener('resize', () => { this.m = this.metrics(); });
    this.m = this.metrics();
    requestAnimationFrame((t) => this.frame(t));
  }

  metrics() {
    const vw = innerWidth, vh = innerHeight;
    const phone = matchMedia('(max-width: 700px), (orientation: portrait) and (max-width: 900px)').matches; // same as the CSS
    // the page's 12-column grid (as in style.css): margins and gutters of --pad
    const pad = phone ? 16 : Math.min(30, Math.max(16, vw * 0.016)), gut = phone ? 10 : Math.min(22, Math.max(10, vw * 0.011)); // as --pad / --gut
    const colg = (vw - pad * 2 - gut * 11) / 12 + gut; // a column and its gutter
    // a phone has its own 6-column grid (as in style.css): the featured work stands on column 3
    const pcolg = (vw - pad * 2 - gut * 5) / 6 + gut;
    const cs = pad + (phone ? pcolg * 2 : colg * 3); // the featured work stands on column 4 (column 3 on a phone)
    return {
      vw, vh, phone, cs, pad,
      h0: phone ? vh * 0.46 : vh * 0.47,               // featured height
      maxW: phone ? pcolg * 4 - 10 : colg * 6 - gut,   // featured width cap: four columns (phone), 4–9
      step: phone ? pcolg * 0.5 : colg,                // deck: each work a step further right
      shrink: 0.06,                                    // ... and this much smaller
      gap: phone ? 20 : colg + gut,                    // the work on the left ends before the featured one
      left: 0.7,                                       // size of the work on the left
      yc: vh * 0.5,
      yc1: vh * (phone ? 0.46 : 0.45),                 // a work open: everything moves up a little
    };
  }

  release(s) {
    s.el.remove();
    s.el.style.visibility = 'hidden';
    const list = this.pool.get(s.work) || [];
    list.push(s.el);
    this.pool.set(s.work, list);
  }
  setWorks(works) {
    for (const s of this.slots.values()) this.release(s);
    this.slots.clear();
    this.works = works;
    this.p = this.target = 0;
    this.hovered = null;
    this.featured = null;
    this.fk = undefined; // so the next frame names the new featured work (and the title follows)
  }

  // jump (or glide) so that `work` is featured
  show(work, { animate = true } = {}) {
    const n = this.works.length;
    const i = this.works.indexOf(work);
    if (i < 0 || !n) return;
    const base = Math.round(this.target);
    let k = base - mod(base, n) + i;
    if (k - base > n / 2) k -= n;
    if (base - k > n / 2) k += n;
    this.target = k;
    if (!animate) this.p = k;
  }
  featuredWork() { return this.works.length ? this.works[mod(Math.round(this.target), this.works.length)] : null; }
  step(dir) { this.target = Math.round(this.target) + dir; this.lastInput = 0; }
  setMode(open) {
    const t = open ? 1 : 0;
    if (t === this.modeTarget) return;
    this.modeTarget = t;
    this.modeFrom = this.mode;
    this.modeAt = performance.now();
  }
  focusK(k) { this.target = k; this.lastInput = 0; }
  // where work k stands once the line has settled with a work open
  restRect(k) {
    const m = this.m, work = this.works[mod(k, this.works.length)];
    const a = work?.aspect ?? 1, g = this.key(k - Math.round(this.target), a, 1);
    const w = Math.min(m.h0 * a, m.maxW) * g.s, h = w / a;
    return { x: g.x, y: m.yc1 - h / 2, w, h, s: g.s };
  }
  // where the featured work stands once the line has settled (for the flight back from a work)
  featuredRect() {
    const m = this.m, work = this.featuredWork();
    if (!work) return null;
    const a = work.aspect ?? 1, g = this.key(0, a, 0);
    const w = Math.min(m.h0 * a, m.maxW) * g.s, h = w / a;
    return { x: g.x, y: m.yc - h / 2, w, h };
  }
  // the works slide in from the right, one after another (each time the gallery is shown)
  enter() { this.enterAt = this.reduced ? null : performance.now(); }
  // where each work on screen stands (without the slide-in), for flights to and from the overview
  rects() {
    return [...this.slots.values()].filter((s) => s.r && s.r.o > 0.01 && s.r.x < this.m.vw && s.r.x + s.r.w > 0)
      .map((s) => ({ k: s.k, work: s.work, d: s.k - this.p, rect: s.r, z: Number(s.el.style.zIndex) || 0 }));
  }
  // the neighbour (one step left or right) under a point, while a work is open
  neighbourAt(x, y) {
    const c = Math.round(this.target);
    for (const k of [c - 1, c + 1]) {
      const r = this.slots.get(k)?.r;
      if (r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return { k, work: this.slots.get(k).work };
    }
    return null;
  }

  slot(k) {
    let s = this.slots.get(k);
    if (s) return s;
    const work = this.works[mod(k, this.works.length)];
    // a figure of this work that left the screen before comes back as it was (its picture already
    // decoded, so it never shows empty for a frame)
    let el = this.pool.get(work)?.pop();
    if (!el) {
      el = document.createElement('figure');
      el.className = 'work' + (work.cutout ? ' is-cutout' : '');
      el.setAttribute('role', 'listitem');
      const img = new Image();
      img.alt = ''; img.decoding = 'async'; img.draggable = false;
      img.src = work.thumb || work.image;
      img.decode?.().catch(() => {}); // decoded off the main thread before it first shows, not while the line moves
      el.append(img);
    }
    el.setAttribute('aria-label', `${work.title} ${work.year || ''}`);
    this.track.append(el);
    s = { el, k, work };
    this.slots.set(k, s);
    return s;
  }

  // where a work with this aspect sits at whole-number distance d from the featured one
  key(d, aspect, mode) {
    const m = this.m;
    const w0 = Math.min(m.h0 * aspect, m.maxW);
    if (mode) {
      // detail: only the neighbours stay, small, at the edges
      const s = 0.6;
      if (d === -1) return { x: m.vw * (m.phone ? 0.06 : 0.104) - w0 * s, s, o: 1 };
      if (d === 1) return { x: m.vw * (m.phone ? 0.94 : 0.84), s, o: 1 };
      if (d === 0) return { x: m.phone ? (m.vw - w0 * GROW) / 2 : m.cs, s: GROW, o: 1 };
      return { x: d < 0 ? -w0 * s - 40 - (-d) * 40 : m.vw + 40 + d * 40, s, o: 1 };
    }
    if (m.phone) {
      // a phone: a deck, wholly centred. The featured work in the middle of the screen; the next
      // ones stand behind it, each a little smaller and centred too, their top edges stepping up
      // out of the deck (four on show), so the next work is drawn from the top; the one before has
      // gone off to the left (a swipe throws the front card away and the next comes forward)
      const DEPTH = 4, PEEK = 14, h0 = w0 / aspect;
      if (d >= 0) {
        const k = Math.min(d, DEPTH + 1), s = 1 - 0.06 * k;
        return { x: (m.vw - w0 * s) / 2, s, o: d > DEPTH ? 0 : 1, dy: h0 * (1 - s) / 2 - k * PEEK - h0 * (1 - s) };
      }
      return { x: -w0 * (1.1 - d * 0.1) - 40, s: 1, o: 1, dy: 0 };
    }
    const x0 = m.cs; // the featured work: on column 4
    const step = m.step;
    if (d >= 0) return { x: x0 + d * step, s: Math.max(0.3, 1 - m.shrink * d), o: 1 };
    const s = d === -1 ? m.left : m.left * 0.8;
    const right = d === -1 ? x0 - m.gap : x0 - m.gap * 2 - w0 * m.left * (-1 - d);
    return { x: right - w0 * s, s, o: 1 };
  }
  place(d, aspect, mode) {
    const a = Math.floor(d), t = d - a;
    const k0 = this.key(a, aspect, mode), k1 = t ? this.key(a + 1, aspect, mode) : k0;
    return { x: lerp(k0.x, k1.x, t), s: lerp(k0.s, k1.s, t), o: lerp(k0.o, k1.o, t), dy: lerp(k0.dy || 0, k1.dy || 0, t) };
  }

  bindInput() {
    const r = this.root;
    this.mouse = null;
    // (whether the pointer is over the gallery itself, not over a name, the menu or a page above it)
    addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') this.mouse = { x: e.clientX, y: e.clientY, over: !!e.target.closest?.('.gallery') }; }, { passive: true });
    document.addEventListener('mouseleave', () => { this.mouse = null; });
    // the wheel works anywhere on the page, over the names and menus too
    addEventListener('wheel', (e) => {
      if (this.paused || this.hidden) return;
      if (e.target.closest?.('.overlay, .menu-list')) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const px = e.deltaMode === 1 ? delta * 32 : e.deltaMode === 2 ? delta * innerWidth : delta;
      this.target += px / WHEEL;
      this.lastInput = performance.now();
      unlock();
    }, { passive: true });
    // drag with the mouse, swipe with a finger (sideways or up/down)
    r.addEventListener('pointerdown', (e) => {
      if (this.paused || e.button > 0) return;
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, p: this.target, moved: false, t: performance.now(), v: 0, lp: this.target, target: e.target.closest('.work') };
    });
    addEventListener('pointermove', (e) => {
      const d = this.drag;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (!d.moved && Math.hypot(dx, dy) > 8) { d.moved = true; r.setPointerCapture?.(e.pointerId); this.setHover(null); }
      if (!d.moved) return;
      const along = Math.abs(dx) >= Math.abs(dy) || e.pointerType === 'mouse' ? dx : dy;
      const next = d.p - along / (this.m.phone ? this.m.vw * 0.62 : this.m.step * 2.2);
      const now = performance.now();
      d.v = (next - d.lp) / Math.max(1, now - d.t) * 1000; d.lp = next; d.t = now;
      this.target = this.p = next;
      this.lastInput = now;
    });
    const end = (e) => {
      const d = this.drag;
      if (!d || d.id !== e.pointerId) return;
      this.drag = null;
      if (d.moved) {
        // a flick carries on to the next work
        if (this.m.phone) {
          // phone: one swipe is one work
          const delta = this.target - d.p;
          const dir = Math.abs(delta) > 0.08 || Math.abs(d.v) > 0.8 ? Math.sign(Math.abs(delta) > 0.08 ? delta : d.v) : 0;
          this.target = Math.round(d.p) + dir;
        } else this.target = Math.round(this.target + Math.max(-3, Math.min(3, d.v * 0.12)));
        this.lastInput = 0;
      } else if (d.target && e.type === 'pointerup') {
        const s = [...this.slots.values()].find((x) => x.el === d.target);
        // a click on a work further off first brings it to the front; a click on the front one opens it
        if (s && s.k === Math.round(this.target) && Math.abs(this.p - s.k) < 0.3) this.onOpen(s.work);
        else if (s) { this.target = s.k; this.lastInput = 0; }
      }
    };
    addEventListener('pointerup', end);
    addEventListener('pointercancel', end);
  }

  setHover(work) {
    if (this.hovered === work) return;
    this.hovered = work;
    this.onHover?.(work);
  }

  frame(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    requestAnimationFrame((t) => this.frame(t));
    const n = this.works.length;
    if (!n || !this.m) return;
    // settle on the nearest work once the wheel has been quiet for a moment
    if (!this.drag && now - this.lastInput > SNAP_AFTER) this.target = Math.round(this.target);
    const f = this.reduced ? 1 : 1 - Math.exp(-EASE * (this.modeTarget ? 0.5 : 1) * dt); // calmer with a work open
    // moving on by itself: one slow glide on a fixed time (a gentle start, a long soft landing);
    // any move by hand takes over at once
    const gl = this.glide;
    if (gl && (gl.to !== this.target || this.drag)) this.glide = null;
    if (this.glide) {
      const t = Math.min(1, (now - gl.at) / AUTO_GLIDE);
      this.p = gl.from + (gl.to - gl.from) * glideEase(t);
      if (t >= 1) { this.p = this.target; this.glide = null; }
    } else {
      this.p += (this.target - this.p) * f;
      if (Math.abs(this.target - this.p) < 0.0005) this.p = this.target;
    }
    // a work opening / closing: on a fixed time and curve, the same as the title's
    if (this.mode !== this.modeTarget) {
      const k = this.reduced ? 1 : openEase((now - this.modeAt) / OPEN_MS);
      this.mode = this.modeFrom + (this.modeTarget - this.modeFrom) * k;
      if (k >= 1) this.mode = this.modeTarget;
    }

    // a notch sound and a new title each time another work comes to the front
    const fk = Math.round(this.p);
    if (fk !== this.fk) {
      if (this.fk !== undefined && !this.paused && !this.auto) sound.notch(); // (moving on by itself: in silence)
      this.auto = false;
      this.fk = fk;
      const w = this.works[mod(fk, n)];
      if (w !== this.featured) { this.featured = w; this.onFeature?.(w); }
    }
    // left alone, the gallery moves on by itself: each work stays in front for three seconds. It waits
    // while it is being moved by hand, while the pointer rests on a work, with a work or a page open,
    // and in a tab that is not on show; the three seconds start again once it is left alone
    if (this.hidden || this.covered || this.paused || this.mode || this.modeTarget || this.drag || this.hovered || this.enterAt !== null
      || this.reduced || n < 2 || document.hidden || document.body.classList.contains('intro') || Math.abs(this.target - this.p) > .01 || now - this.lastInput < SNAP_AFTER) this.stay = now;
    else if (now - (this.stay ?? now) > AUTO_MS) { this.auto = true; this.target = Math.round(this.target) + 1; this.stay = now; this.glide = { from: this.p, to: this.target, at: now }; }
    else this.stay ??= now;

    if (this.hidden || this.covered) return; // nothing to draw: the gallery is not on show
    const m = this.m;
    if (this.enterAt !== null && now - this.enterAt > 1500) this.enterAt = null;
    const lo = Math.floor(this.p) - 2;
    const hi = m.phone ? Math.ceil(this.p) + 6 : Math.ceil(this.p) + Math.ceil((m.vw - m.cs) / m.step) + 2; // one beyond the edge: made and decoded before it comes on
    for (const [k, s] of this.slots) if (k < lo || k > hi) { this.release(s); this.slots.delete(k); }
    for (let k = lo; k <= hi; k++) {
      const s = this.slot(k);
      const aspect = s.work.aspect ?? 1;
      const d = k - this.p;
      const g = this.place(d, aspect, 0);
      const q = this.mode ? this.place(d, aspect, 1) : g;
      // the works that leave when one opens go first, quickly, still as one deck, so the
      // neighbour that comes out from behind the opened work never crosses them
      const mx = Math.abs(d) > 1.5 ? Math.min(1, Math.sqrt(this.mode) * 1.5) : this.mode;
      const x = lerp(g.x, q.x, mx), sc = lerp(g.s, q.s, mx), o = lerp(g.o, q.o, this.mode);
      const w0 = Math.min(m.h0 * aspect, m.maxW), w = w0 * sc;
      const h = w / aspect, y = lerp(m.yc, m.yc1, this.mode) - h / 2 + lerp(g.dy, q.dy || 0, mx); // (a phone's deck steps up)
      s.r = { x, y, w, h, o };
      // sliding in: from beyond the right edge, the ones on the left first
      let ex = x, fade = 1;
      if (this.enterAt !== null && !this.flying.has(k)) {
        // smooth, a second each, the ones on the left first
        const t = Math.max(0, (now - this.enterAt - Math.max(0, x) / m.vw * 320) / 1000);
        if (t < 1) ex = lerp(m.vw + 60 + Math.max(0, x - m.cs) * 0.4, x, enterEase(t));
      }
      s.ex = ex; // where it stands this frame (sliding in included), for the hover
      const st = s.el.style;
      // the figure keeps one size (the featured one's) and only moves and scales: a change of width or
      // height would lay out the page and resample the picture on every frame
      const bw = w0.toFixed(1);
      if (s.bw !== bw) { s.bw = bw; st.width = `${bw}px`; st.height = `${(w0 / aspect).toFixed(1)}px`; }
      // the work under the pointer grows by 3 %, about its own middle (softly, over a few frames)
      s.up = lerp(s.up ?? 0, this.hovered === s.work && !this.mode ? HOVER_GROW : 0, .16);
      if (s.up < .0005) s.up = 0;
      st.transform = `translate3d(${(ex - w * s.up / 2).toFixed(1)}px, ${(y - h * s.up / 2).toFixed(1)}px, 0) scale(${(sc * (1 + s.up)).toFixed(4)})`;
      const op = (o * fade).toFixed(3);
      if (s.op !== op) { st.opacity = op; s.op = op; }
      // the gallery itself is sharp; only with a work open does scrolling its page blur what is behind
      const bl = this.mode * this.scrollBlur;
      const f = bl > 0.05 ? `blur(${bl.toFixed(1)}px)` : '';
      if (s.f !== f) { st.filter = f; s.f = f; }
      // a work open: the neighbours at the edges go out of focus
      const vis = o * fade < 0.01 || ex > m.vw || ex + w < 0 || this.holdAll || this.flying.has(k) || this.hiddenK.has(k) ? 'hidden' : '';
      if (st.visibility !== vis) st.visibility = vis;
      // one fixed order, like a deck of cards: each work lies on the ones after it. The order never
      // changes while the line moves, so no work ever jumps over another: the one leaving slides
      // off the top and uncovers the next
      const z = String(1000 - (k - Math.round(this.p)));
      if (st.zIndex !== z) st.zIndex = z;
    }

    // hover by hit-testing, so a work that slides under a still pointer counts too
    // (worked out from where the works stand, without asking the page: that would lay it out every frame)
    if (this.mouse && !this.paused && !this.drag?.moved && !document.body.classList.contains('focus-menu')) {
      const { x: px, y: py, over } = this.mouse;
      let top = null, tz = -Infinity;
      if (over) for (const s of this.slots.values()) {
        const r = s.r, z = Number(s.el.style.zIndex) || 0;
        if (r && s.el.style.visibility !== 'hidden' && z > tz && px >= s.ex && px <= s.ex + r.w && py >= r.y && py <= r.y + r.h) { top = s; tz = z; }
      }
      this.setHover(top ? top.work : null);
    } else if (this.hovered && (this.paused || !this.mouse)) this.setHover(null);
  }
}

const AUTO_GLIDE = 1500; // ms: how long the gallery takes to move on by itself
// slow in, slow out, but gentle (a sine): it starts and ends visibly, with no long standstill at
// either end and no lurch in the middle (the quintic it replaces stood still for a sixth of the glide
// at each end, then rushed: it looked like the line stuttered)
const glideEase = (t) => (1 - Math.cos(Math.PI * t)) / 2;
const HOVER_GROW = .03; // how much the work under the pointer grows

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export { escapeHtml };
