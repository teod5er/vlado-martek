# Three square details of every work (works.json `details`), cut where most is going on: edges, ink, colour.
# Run from the project folder: python3 scripts/make-details.py [id ...]   (no ids: every work). Needs Pillow and numpy.
# three square details of every work, where the most is going on (edges, ink, colour)
import json, os, sys
import numpy as np
from PIL import Image, ImageFilter
OUT_PX, Q = 720, 78
only = set(sys.argv[1:])
# works with two details only (three of them would repeat one another or show bare ground): a wide
# one, with more of the work in it, and a close one, deep into where the most is going on
TWO = set('''imajte-me manija-za-sonetima mama konceptualisticka-poezija dobra-knjiga-losa-knjiga pazi-ostri-tekstovi
volim-citati-poeziju idealiziram-granicu-izmedu-umjetnosti-i-zivota the-manners-of-the-nomad na-umjetnicima-svijet-ostaje
write-its-name citajte-pjesme-rimbauda citajte-pjesme-majakovskog read-larkins-poems drzavo-unakazit-cu-te-artom
umjetnik-artifex ljubav-odgovornost muzej-suvremene-umjetnosti shakespeare starost efke les-artistes-aux-armes
amerika-za-corave balkani every-artist-is-deluded-by-america crna-amerika izgubljena-olovka izmedu-mora-i-amerike-biraj-more
staklena-amerika svaki-je-umjetnik-obmanut-od-amerike hanna-arendt ideja-amerike pseudorimbaud-2026 estetika-uber-alles
amerika-na-romobilu point-de-caption artist bez-naziva-2 bez-naziva-3 bolje-balkan-nego-bol ima-realnog
pubertet-2 svaki-je-umjetnik-obmanut-od-amerike-2'''.split())
WIDE, CLOSE, CLOSE_PX = .64, .22, 620  # their sides, as parts of the work's shorter side; the close one at least this many pixels of the original
d = json.load(open('public/data/works.json', encoding='utf-8'))
def original(w):
    b = w['image'].replace('works/', 'originals/works/').rsplit('.', 1)[0]
    for e in ('.png', '.jpg'):
        if os.path.exists(b + e): return b + e
def saliency(rgb, alpha):
    a = np.asarray(rgb, dtype=np.float32) / 255
    lum = a @ np.array([.299, .587, .114], dtype=np.float32)
    gx = np.abs(np.diff(lum, axis=1, prepend=lum[:, :1])); gy = np.abs(np.diff(lum, axis=0, prepend=lum[:1]))
    edge = gx + gy
    # how far each pixel is from the ground (the work's dominant colour)
    med = np.median(a[alpha > .5], axis=0) if (alpha > .5).any() else a.reshape(-1, 3).mean(0)
    dist = np.sqrt(((a - med) ** 2).sum(-1))
    sat = a.max(-1) - a.min(-1)
    s = edge / (edge.mean() + 1e-6) + .8 * dist / (dist.mean() + 1e-6) + .4 * sat / (sat.mean() + 1e-6)
    s = np.asarray(Image.fromarray((s / s.max() * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3)), dtype=np.float32)
    ink = np.asarray(Image.fromarray(np.clip(edge / (edge.max() + 1e-6) * 255, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2)), dtype=np.float32)
    return s * (alpha > .5), ink * (alpha > .5)
def integral(x): return np.pad(x, ((1, 0), (1, 0))).cumsum(0).cumsum(1)
def boxsum(I, y, x, k): return I[y + k, x + k] - I[y, x + k] - I[y + k, x] + I[y, x]
for w in d['works']:
    if only and w['id'] not in only: continue
    src = original(w); im = Image.open(src).convert('RGBA')
    bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox(); im = im.crop(bb)
    # a work photographed on a plain backdrop (opaque to the corners, all four the same colour): only the work
    px = np.asarray(im.convert('RGB'), dtype=np.int16); cn = [px[0, 0], px[0, -1], px[-1, 0], px[-1, -1]]
    if im.getchannel('A').getextrema()[0] > 250 and all(np.abs(c - cn[0]).max() < 5 for c in cn):
        on = np.abs(px - cn[0]).max(-1) > 6
        ys, xs = np.where(on.mean(1) > .02)[0], np.where(on.mean(0) > .02)[0]
        if len(ys) and len(xs): im = im.crop((xs[0], ys[0], xs[-1] + 1, ys[-1] + 1))
    W, H = im.size
    sc = 400 / max(W, H); sm = im.resize((max(1, round(W * sc)), max(1, round(H * sc))), Image.LANCZOS)
    alpha = np.asarray(sm.getchannel('A'), dtype=np.float32) / 255
    rgbs = Image.new('RGB', sm.size, 'white'); rgbs.paste(sm, mask=sm.getchannel('A'))
    sal, ink = saliency(rgbs, alpha)
    h, wd = sal.shape
    k = max(8, int(min(h, wd) * .42))  # a detail: about 2/5 of the shorter side
    S_, A_, I_ = integral(sal), integral(alpha), integral(ink)
    def best(k, avoid=None, M=None, inset=0):  # the square of side k with the most in it (as little of it as possible inside `avoid`)
        top = None
        step = max(1, k // 12)
        for y in range(inset, h - k + 1 - inset, step):
            for x in range(inset, wd - k + 1 - inset, step):
                if boxsum(A_, y, x, k) < .97 * k * k: continue
                v = boxsum(S_ if M is None else M, y, x, k)
                if avoid:
                    ay, ax, ak = avoid
                    v *= 1 - .6 * max(0, min(y + k, ay + ak) - max(y, ay)) * max(0, min(x + k, ax + ak) - max(x, ax)) / (k * k)
                if top is None or v > top[0]: top = (v, y, x)
        return top
    two = None
    if w['id'] in TWO:
        kw = max(8, int(min(h, wd) * WIDE))
        kc = min(kw, max(8, int(min(h, wd) * CLOSE), int(CLOSE_PX * sc) + 1))  # never so close that the picture goes soft
        # the close one: where the drawing or the writing is densest, clear of the work's own edge
        a = best(kw); b = a and (best(kc, (a[1], a[2], kw), I_, int(min(h, wd) * .05)) or best(kc, (a[1], a[2], kw), I_))
        if a and b: two = [(a[1], a[2], kw), (b[1], b[2], kc)]
    cands = []
    step = max(1, k // 10)
    for y in range(0, h - k + 1, step):
        for x in range(0, wd - k + 1, step):
            if boxsum(A_, y, x, k) < .97 * k * k: continue  # inside the work, not its transparent edge
            cands.append((boxsum(S_, y, x, k), y, x))
    if not cands:  # very thin works: the largest square that fits
        k = min(h, wd); cands = [(0, (h - k) // 2, (wd - k) // 2)]
    cands.sort(reverse=True)
    picked = []
    for s, y, x in cands:
        if all(max(0, min(y + k, py + k) - max(y, py)) * max(0, min(x + k, px + k) - max(x, px)) < .2 * k * k for _, py, px in picked):
            picked.append((s, y, x))
        if len(picked) == 3: break
    while len(picked) < 3: picked.append(picked[len(picked) % max(1, len(picked))])
    picked.sort(key=lambda p: (p[1] // (k // 2), p[2]))  # read them top-left to bottom-right
    out = []
    shots = two or [(y, x, k) for _, y, x in picked]
    for i, (y, x, kk) in enumerate(shots, 1):
        X, Y, K = x / sc, y / sc, kk / sc
        c = im.crop((round(X), round(Y), round(X + K), round(Y + K)))
        bg = Image.new('RGB', c.size, 'white'); bg.paste(c, mask=c.getchannel('A'))
        bg = bg.resize((OUT_PX, OUT_PX), Image.LANCZOS) if bg.width > OUT_PX else bg
        p = w['image'].rsplit('.', 1)[0] + f'-d{i}.webp'
        bg.save('public/' + p, 'WEBP', quality=Q, method=6); out.append(p)
    w['details'] = out
    third = 'public/' + w['image'].rsplit('.', 1)[0] + '-d3.webp'
    if len(out) == 2 and os.path.exists(third): os.remove(third)  # the third detail it had before
    print(w['id'], len(cands))
open('public/data/works.json', 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
