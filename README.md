# Vlado Martek — website

Static site: Vite + vanilla JS, Three.js for the 3D viewers. No backend.

## Run

```bash
npm install
npm run dev        # local dev server (also reachable from a phone on the same Wi-Fi)
npm run build      # production build into dist/
npm run preview    # serve the build
```

`dist/` is plain static files with relative paths, so it can be uploaded to any host
(Netlify, Vercel, GitHub Pages, cPanel, S3...). A ready build is in `vlado-martek-dist.zip`.

## Adding real content

Everything lives in **`public/data/works.json`**:

- `artist` — names, bio (`hr` is shown when MARTEK is clicked) and `photo` (path to his portrait, e.g. `img/martek.jpg`; empty shows a grey placeholder).
- `cursors` — list of pointer images (e.g. `"img/cursors/1.png"` or `{ "src": "img/cursors/1.png", "hotspot": [4, 4] }`); one is picked at random on every page load and it changes on every click. Empty = normal pointer.
- `categories` — `poetry`, `actions`, `pictograms`, `photos`, `books`, `sculpture`, `texts`; each has `label` (hr), `label_en` and picks a viewer (`book`, `sculpture`, `sheet`).
- `works` — one entry per work:
  - `id`, `title`, `year`, `category`, `medium`, `width`/`height` (cm), `description`
  - `image` — picture shown in the gallery (put files in `public/works/`)
  - `aspect` — image width ÷ height, `size` — 0.4–1, how tall it hangs in the gallery
  - books: `pages` — list of page images in order (cover first, back cover last)
  - sculptures: `model` — `box`, `accordion` or `star`; `textures` for the box faces (`front`, `side`, `inner`)
  - optional `thumb` (different gallery image), `cutout: true` (transparent PNG, no background), `viewer` (override the category's viewer)

The current works, years, media and descriptions are **placeholders** (descriptions start with
"Placeholder text."). The SVGs in `public/works/` are flat colour placeholders and can simply be replaced (keep the file names or update the paths in `works.json`).

## Where things are

- `src/gallery.js` — endless right-to-left gallery, hover stop, drag/swipe/wheel
- `src/viewers/book.js` — page-flip book (drag, tap, arrow keys)
- `src/viewers/sheet.js` — agitations: a bendable paper sheet you can spin
- `src/viewers/sculpture.js` — paper models (box with sprung flaps, leporello, folded star)
- `src/sound.js` — synthesized click/page sounds (no audio files)
- `src/style.css` — layout, blur states, responsive rules; type sizes follow the golden ratio (`--t0`…`--t4`)

## Opening the site from disk

The normal build (`npm run build` → `dist/`) is meant for a web server. Browsers refuse to load its
module script and stylesheet when `index.html` is opened by double-click (`file://`), so the page
shows without styles. To preview it locally, run `npx vite preview` or any static server
(`python3 -m http.server` inside `dist/`).

`npm run build:offline` writes `dist-offline/vlado-martek.html`: the whole site in one file
(code, styles, data and images inlined), which also works when opened straight from disk.

## GitHub Pages

The repository holds the source; `.github/workflows/deploy.yml` builds it (`npm run build`) and
publishes `dist/` on every push to `main`. One-time setup on GitHub: Settings → Pages →
Build and deployment → Source: **GitHub Actions**.
