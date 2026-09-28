import math, io, cairosvg
from PIL import Image, ImageDraw, ImageFont
BG, BR, RU, CR = '#1c140e', '#d6a93e', '#c2542d', '#ede4cf'
C = 12
def P(r, a):  # a — градусы, 0 = вправо, 90 = вниз (экранные координаты)
    t = math.radians(a); return (C + r*math.cos(t), C + r*math.sin(t))
def f(v): return f"{v:.2f}".rstrip('0').rstrip('.')
def handle(a, r0=5, r1=9): (x0,y0),(x1,y1) = P(r0,a), P(r1,a); return f"M{f(x0)} {f(y0)}L{f(x1)} {f(y1)}"
def arc(r, a0, a1):
    (x0,y0),(x1,y1) = P(r,a0), P(r,a1); large = 1 if (a1-a0) % 360 > 180 else 0
    return f"M{f(x0)} {f(y0)}A{r} {r} 0 {large} 1 {f(x1)} {f(y1)}"
def svg(title, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>{title}</title>'
            f'<rect width="24" height="24" rx="5" fill="{BG}"/>{body}</svg>')
G = f'fill="none" stroke="{BR}" stroke-width="1.6" stroke-linecap="round"'
ALL = [-90, -45, 0, 45, 90, 135, 180, 225]
V = {}
# 0. исходник
V['0-original'] = ('Яхта «Беда»', open('/mnt/user-data/uploads/favicon.svg').read())
# 1. отломалась одна рукоять и лежит внизу
hs = ' '.join(handle(a) for a in ALL if a != 45)
V['1-broken-handle'] = ('Яхта «Беда» — отломанная рукоять', svg('Яхта «Беда»',
    f'<g {G}><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.8"/><path d="{hs}"/>'
    f'<path d="M17.2 21.1L20.4 20.1"/></g>'))
# 2. скол обода между спицами, кусок падает
chip = arc(6, 8, 32)
V['2-chipped-rim'] = ('Яхта «Беда» — скол обода', svg('Яхта «Беда»',
    f'<g {G}><path d="{arc(6, 32, 368)}"/><circle cx="12" cy="12" r="1.8"/><path d="{" ".join(handle(a) for a in ALL)}"/>'
    f'<path d="{chip}" transform="translate(1.9 3.1) rotate(28 17.6 14.4)"/></g>'))
# 3. две рукояти отвалились — как «ПО»
hs3 = ' '.join(handle(a) for a in ALL if a not in (-90, -45))
V['3-two-handles'] = ('Яхта «Беда» — отвалились две рукояти', svg('Яхта «Беда»',
    f'<g {G}><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.8"/><path d="{hs3}"/>'
    f'<path d="M5.9 21.3L8.9 20.6M15.3 20.7L18.2 21.4"/></g>'
    f'<g fill="{BR}"><circle cx="{f(P(6.9,-90)[0])}" cy="{f(P(6.9,-90)[1])}" r=".55" opacity=".45"/>'
    f'<circle cx="{f(P(6.9,-45)[0])}" cy="{f(P(6.9,-45)[1])}" r=".55" opacity=".45"/></g>'))
# 4. обод раскрылся в «С»: откололся правый кусок вместе с рукоятью
piece = arc(6, -32, 32) + ' ' + handle(0, 6, 9)
V['4-rim-to-C'] = ('Яхта «Беда» — обод стал буквой С', svg('Яхта «Беда»',
    f'<g {G}><path d="{arc(6, 32, 328)}"/><circle cx="12" cy="12" r="1.8"/><path d="{" ".join(handle(a) for a in ALL if a != 0)}"/>'
    f'<path d="{piece}" transform="translate(0.6 4.4) rotate(38 18 12) scale(.82)" transform-origin="18 12"/></g>'))
# 5. настоящий спасательный круг: кремовое кольцо, ржавые полосы, один сегмент выбит
ring_r, sw = 6.1, 3.3
bands = [45, 135, 225, 315]
cream = ' '.join(arc(ring_r, b+16, b+74) for b in bands if b != 315)   # сегмент между 315° и 45° выбит
rust = ' '.join(arc(ring_r, b-16, b+16) for b in bands)
chip5 = arc(ring_r, -29, 29)
V['5-lifebuoy'] = ('Яхта «Беда» — спасательный круг со сколом', svg('Яхта «Беда»',
    f'<g fill="none" stroke-width="{sw}" stroke-linecap="butt"><path d="{cream}" stroke="{CR}"/><path d="{rust}" stroke="{RU}"/>'
    f'<path d="{chip5}" stroke="{CR}" transform="translate(1.2 3.6) rotate(32 18.1 12)"/></g>'))
for k, (title, s) in V.items():
    open(f'{k}.svg', 'w').write(s)
# превью: 16, 32, 64, 180 на тёмной и светлой подложке вкладки
sizes = [16, 32, 64, 180]
rows = []
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)
except: font = ImageFont.load_default()
for k, (title, s) in V.items():
    row = Image.new('RGB', (1100, 230), (250, 248, 243)); d = ImageDraw.Draw(row)
    d.text((14, 8), k, fill=(40, 30, 20), font=font)
    x = 14
    for bgc in [(250, 248, 243), (32, 33, 36)]:
        for sz in sizes:
            png = cairosvg.svg2png(bytestring=s.encode(), output_width=sz, output_height=sz)
            im = Image.open(io.BytesIO(png)).convert('RGBA')
            tile = Image.new('RGB', (sz + 16, sz + 16), bgc); tile.paste(im, (8, 8), im)
            row.paste(tile, (x, 40)); x += sz + 26
        x += 20
    rows.append(row)
sheet = Image.new('RGB', (1100, 230 * len(rows)), (255, 255, 255))
for i, r in enumerate(rows): sheet.paste(r, (0, 230 * i))
sheet.save('/mnt/user-data/outputs/favicons/preview.png'); print(sheet.size)
