// Generates placeholder artwork (SVG) into public/works/.
// Real photographs/scans simply replace these files (or new paths go in public/data/works.json).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'works');
mkdirSync(out, { recursive: true });

const RED = '#E63323';
const INK = '#141414';
const PAPER = '#F1ECE1';
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const SERIF = "'Times New Roman', Times, serif";

// small deterministic RNG so the placeholders are stable between runs
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const svg = (w, h, body, bg = PAPER) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
  `<rect width="${w}" height="${h}" fill="${bg}"/>${grain(w, h)}${body}</svg>`;

// subtle paper grain
const grain = (w, h) =>
  `<filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/>` +
  `<feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.09 0"/></filter>` +
  `<rect width="${w}" height="${h}" filter="url(#g)"/>`;

function stackedText(lines, { w, h, size, color = INK, weight = 900, family = SANS, y0, lh = 1.0, anchor = 'middle', x }) {
  const total = lines.length * size * lh;
  let y = y0 ?? (h - total) / 2 + size * 0.82;
  const xx = x ?? (anchor === 'middle' ? w / 2 : 40);
  return lines
    .map((l) => {
      const t = `<text x="${xx}" y="${y}" font-family="${family}" font-weight="${weight}" font-size="${size}" fill="${color}" text-anchor="${anchor}" letter-spacing="-1">${l}</text>`;
      y += size * lh;
      return t;
    })
    .join('');
}

function blob(cx, cy, r, seed, color) {
  const rand = rng(seed);
  const n = 14;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.65 + rand() * 0.55);
    pts.push([cx + Math.cos(a) * rr * 1.5, cy + Math.sin(a) * rr]);
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n; i++) {
    const p = pts[(i + 1) % n];
    const q = pts[(i + 2) % n];
    d += ` Q${p[0]},${p[1]} ${(p[0] + q[0]) / 2},${(p[1] + q[1]) / 2}`;
  }
  return `<path d="${d}Z" fill="${color}"/>`;
}

function scribble(w, h, seed, color, count = 6) {
  const rand = rng(seed);
  let s = '';
  for (let i = 0; i < count; i++) {
    let d = `M${rand() * w},${rand() * h}`;
    for (let k = 0; k < 4; k++) d += ` T${rand() * w},${rand() * h}`;
    s += `<path d="${d}" stroke="${color}" stroke-width="${2 + rand() * 4}" fill="none" stroke-linecap="round"/>`;
  }
  return s;
}

const files = {};

// ---- paintings / works on paper ----
files['citajte.svg'] = svg(900, 680,
  stackedText(['ČITAJTE', 'PJESME', 'MAJAKOVSKOG'], { w: 900, h: 680, size: 128, lh: 1.08 }), '#FBFAF6');

files['crvena-karta.svg'] = svg(800, 900,
  blob(400, 450, 230, 7, RED) + blob(560, 300, 60, 2, RED) +
  `<text x="400" y="840" font-family="${SANS}" font-weight="700" font-size="34" fill="#f4f4f4" text-anchor="middle" letter-spacing="6">KARTA POEZIJE</text>`, INK);

files['zeleno.svg'] = svg(700, 900,
  `<defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9FD0A8"/><stop offset="1" stop-color="#2E8C63"/></linearGradient></defs>` +
  `<rect x="40" y="40" width="620" height="820" fill="url(#lg)"/>` +
  stackedText(['tišina', 'je', 'riječ'], { w: 700, h: 900, size: 96, color: '#F6F2E8', weight: 400, family: SERIF, lh: 1.15 }), '#1E5E42');

files['pjesnik.svg'] = svg(760, 760,
  `<circle cx="380" cy="380" r="300" fill="none" stroke="${RED}" stroke-width="28"/>` +
  stackedText(['PJESNIK', 'NIJE', 'TU'], { w: 760, h: 760, size: 110, lh: 1.02 }));

files['olovka.svg'] = svg(1000, 520,
  `<rect x="80" y="230" width="760" height="60" fill="${INK}"/><polygon points="840,230 940,260 840,290" fill="${RED}"/>` +
  stackedText(['OLOVKA JE ORUŽJE'], { w: 1000, h: 520, size: 64, y0: 170 }) +
  stackedText(['predpoezija'], { w: 1000, h: 520, size: 40, weight: 400, family: SERIF, y0: 400, color: RED }));

files['zastava.svg'] = svg(900, 620,
  `<rect x="0" y="0" width="900" height="206" fill="${RED}"/><rect x="0" y="414" width="900" height="206" fill="${INK}"/>` +
  stackedText(['POEZIJA'], { w: 900, h: 620, size: 150, y0: 365 }), '#FFFFFF');

files['mallarme.svg'] = svg(720, 960,
  scribble(720, 960, 11, INK, 9) +
  `<rect x="60" y="380" width="600" height="200" fill="${PAPER}"/>` +
  stackedText(['ČITAJ', 'MALLARMÉA'], { w: 720, h: 960, size: 92, lh: 1.05, color: RED }));

// ---- paper models (textures for the 3D models) ----
files['kutija-front.svg'] = svg(800, 500,
  `<rect width="800" height="500" fill="#2F6FA8"/>` +
  `<text x="400" y="300" font-family="${SERIF}" font-style="italic" font-weight="700" font-size="150" fill="#F2F2EE" text-anchor="middle">papir</text>` +
  `<text x="400" y="420" font-family="${SANS}" font-weight="700" font-size="32" fill="#F2F2EE" text-anchor="middle" letter-spacing="8">100 LISTOVA · 24 × 30</text>`, '#2F6FA8');
files['kutija-side.svg'] = svg(500, 500,
  `<rect width="500" height="500" fill="#28649A"/>` +
  `<text x="250" y="270" font-family="${SANS}" font-weight="900" font-size="64" fill="#F2F2EE" text-anchor="middle">LES ARTISTES</text>` +
  `<text x="250" y="340" font-family="${SANS}" font-weight="900" font-size="64" fill="${RED}" text-anchor="middle">AUX ARMES</text>`, '#28649A');
files['kutija-inner.svg'] = svg(800, 800,
  `<rect width="800" height="800" fill="#D8CDB6"/>` + scribble(800, 800, 5, '#8A7B63', 4), '#D8CDB6');
files['kutija-thumb.svg'] = svg(700, 760,
  `<polygon points="120,300 580,300 640,700 60,700" fill="#2F6FA8"/>` +
  `<polygon points="120,300 230,120 360,300" fill="#E9E1CF"/><polygon points="360,300 470,90 580,300" fill="#DCD2BE"/>` +
  `<text x="350" y="560" font-family="${SERIF}" font-style="italic" font-weight="700" font-size="110" fill="#F2F2EE" text-anchor="middle">papir</text>`, '#F4F4F2');

files['harmonika.svg'] = svg(1200, 500,
  stackedText(['RIJEČ · PO · RIJEČ · PO · RIJEČ'], { w: 1200, h: 500, size: 84, y0: 280 }) +
  `<rect x="0" y="380" width="1200" height="40" fill="${RED}"/>`, '#FAF7F0');

files['zvijezda.svg'] = svg(800, 800,
  `<polygon points="400,60 490,300 740,300 540,450 610,720 400,560 190,720 260,450 60,300 310,300" fill="${RED}"/>` +
  stackedText(['ČITAJ'], { w: 800, h: 800, size: 90, y0: 470, color: '#FFFFFF' }), '#F7F4EC');

// ---- artist books (pages) ----
function bookPages(slug, title, seed, words) {
  const rand = rng(seed);
  const W = 600, H = 800;
  const list = [];
  // cover
  list.push(svg(W, H,
    `<rect x="0" y="0" width="${W}" height="${H}" fill="${seed % 2 ? RED : INK}"/>` +
    stackedText(title, { w: W, h: H, size: 80, color: '#FFFFFF', lh: 1.0 }) +
    `<text x="${W / 2}" y="${H - 60}" font-family="${SANS}" font-weight="700" font-size="26" fill="#FFFFFF" text-anchor="middle" letter-spacing="6">VLADO MARTEK</text>`));
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const kind = i % 3;
    let body = '';
    if (kind === 0) body = stackedText([word], { w: W, h: H, size: 64 + rand() * 30, weight: 400, family: SERIF });
    if (kind === 1) body = stackedText(word.toUpperCase().split(' '), { w: W, h: H, size: 70, color: RED, lh: 1.05 });
    if (kind === 2) body = scribble(W, H, seed + i, INK, 3) + stackedText([word], { w: W, h: H, size: 46, y0: H - 140, weight: 400, family: SERIF, color: RED });
    body += `<text x="${i % 2 ? 40 : W - 40}" y="${H - 34}" font-family="${SERIF}" font-size="20" fill="#777" text-anchor="${i % 2 ? 'start' : 'end'}">${i + 1}</text>`;
    list.push(svg(W, H, body, '#F6F1E6'));
  }
  // back cover
  list.push(svg(W, H, `<rect width="${W}" height="${H}" fill="${seed % 2 ? RED : INK}"/>`));
  return list.map((s, i) => {
    const name = `${slug}-${String(i).padStart(2, '0')}.svg`;
    files[`books/${name}`] = s;
    return `works/books/${name}`;
  });
}

const books = {
  pjesme: bookPages('pjesme', ['PJESME', 'BEZ', 'PJESAMA'], 3,
    ['riječ', 'ne piši pjesme', 'papir', 'olovka', 'čitaj sporo', 'tišina', 'ovdje je pjesma', 'kraj?', 'pjesnik', 'list papira']),
  knjiga: bookPages('knjiga', ['KNJIGA', 'ZA', 'NIKOGA'], 4,
    ['prazno', 'čitatelju', 'stranica', 'nečitljivo', 'okreni', 'još jednom', 'slovo', 'tinta']),
  zagreb: bookPages('zagreb', ['ZAGREB', '1979'], 5,
    ['ulica', 'izložba-akcija', 'trg', 'plakat', 'grad čita', 'zid']),
};

for (const [name, content] of Object.entries(files)) {
  const p = join(out, name);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
}
writeFileSync(join(root, 'scripts', 'book-pages.json'), JSON.stringify(books, null, 2));
console.log(`wrote ${Object.keys(files).length} placeholder files`);
