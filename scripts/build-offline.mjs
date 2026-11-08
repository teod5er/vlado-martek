// Builds dist-offline/vlado-martek.html: the whole site in ONE file (code, styles, data, images
// inlined), so it also works when opened straight from disk by double-click (file://), where
// browsers block module scripts, crossorigin stylesheets and fetch().
import { build } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'dist-offline');
await build({
  root,
  base: './',
  logLevel: 'warn',
  build: {
    outDir: out, emptyOutDir: true, copyPublicDir: false, cssCodeSplit: false,
    modulePreload: false, chunkSizeWarningLimit: 2000,
    assetsInlineLimit: 50 * 1024 * 1024, // the typeface goes into the CSS as a data URL
    rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } },
  },
});

const pub = path.join(root, 'public');
const mime = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };
const cache = new Map();
const dataUri = (rel) => {
  const f = path.join(pub, rel);
  const type = mime[path.extname(f).toLowerCase()];
  if (!type || !fs.existsSync(f)) return null;
  if (!cache.has(rel)) cache.set(rel, `data:${type};base64,${fs.readFileSync(f).toString('base64')}`);
  return cache.get(rel);
};
// swap every file path in works.json for its inlined copy
const inlineDeep = (v) => {
  if (typeof v === 'string') return dataUri(v) || v;
  if (Array.isArray(v)) return v.map(inlineDeep);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, inlineDeep(x)]));
  return v;
};
const data = inlineDeep(JSON.parse(fs.readFileSync(path.join(pub, 'data/works.json'), 'utf8')));

let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
const assets = path.join(out, 'assets');
const files = fs.readdirSync(assets);
const css = files.filter((f) => f.endsWith('.css')).map((f) => fs.readFileSync(path.join(assets, f), 'utf8')).join('\n');
const js = files.filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(assets, f), 'utf8')).join('\n');
const safe = (s) => s.replace(/<\/script/gi, '<\\/script');

html = html
  .replace(/\s*<script type="module"[^>]*><\/script>/g, '')
  .replace(/\s*<script[^>]*src="\.\/assets\/[^"]+"[^>]*><\/script>/g, '')
  .replace(/\s*<link rel="stylesheet"[^>]*>/g, '')
  .replace('</head>', () => `<style>\n${css}\n</style>\n</head>`) // function replacers: the code contains $' and $& sequences
  .replace(/(src|href)="([^"#:]+\.(?:svg|png|jpe?g|webp|gif))"/g, (m, attr, rel) => {
    const d = dataUri(rel.replace(/^\.\//, ''));
    return d ? `${attr}="${d}"` : m;
  })
  .replace('</body>', () => `<script>window.__VM_DATA__ = ${safe(JSON.stringify(data))};</script>\n<script>\n${safe(js)}\n</script>\n</body>`);

const target = path.join(out, 'vlado-martek.html');
fs.writeFileSync(target, html);
fs.rmSync(path.join(out, 'index.html'));
fs.rmSync(assets, { recursive: true });
console.log(`${path.relative(root, target)}  ${(fs.statSync(target).size / 1024).toFixed(0)} kB`);
