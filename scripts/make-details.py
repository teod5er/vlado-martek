# Three square details of every work (works.json `details`), cut where most is going on: edges, ink, colour.
# Run from the project folder: python3 scripts/make-details.py [id ...]   (no ids: every work). Needs Pillow and numpy.
# three square details of every work, where the most is going on (edges, ink, colour)
import json, os, sys
import numpy as np
from PIL import Image, ImageFilter
OUT_PX, Q = 720, 78
only = set(sys.argv[1:])
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
    return s * (alpha > .5)
def integral(x): return np.pad(x, ((1, 0), (1, 0))).cumsum(0).cumsum(1)
def boxsum(I, y, x, k): return I[y + k, x + k] - I[y, x + k] - I[y + k, x] + I[y, x]
for w in d['works']:
    if only and w['id'] not in only: continue
    src = original(w); im = Image.open(src).convert('RGBA')
    bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox(); im = im.crop(bb)
    W, H = im.size
    sc = 400 / max(W, H); sm = im.resize((max(1, round(W * sc)), max(1, round(H * sc))), Image.LANCZOS)
    alpha = np.asarray(sm.getchannel('A'), dtype=np.float32) / 255
    rgbs = Image.new('RGB', sm.size, 'white'); rgbs.paste(sm, mask=sm.getchannel('A'))
    sal = saliency(rgbs, alpha)
    h, wd = sal.shape
    k = max(8, int(min(h, wd) * .42))  # a detail: about 2/5 of the shorter side
    S_, A_ = integral(sal), integral(alpha)
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
    for i, (_, y, x) in enumerate(picked, 1):
        X, Y, K = x / sc, y / sc, k / sc
        c = im.crop((round(X), round(Y), round(X + K), round(Y + K)))
        bg = Image.new('RGB', c.size, 'white'); bg.paste(c, mask=c.getchannel('A'))
        bg = bg.resize((OUT_PX, OUT_PX), Image.LANCZOS) if bg.width > OUT_PX else bg
        p = w['image'].rsplit('.', 1)[0] + f'-d{i}.webp'
        bg.save('public/' + p, 'WEBP', quality=Q, method=6); out.append(p)
    w['details'] = out
    print(w['id'], len(cands))
open('public/data/works.json', 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
