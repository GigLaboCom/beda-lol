from PIL import Image, ImageDraw, ImageFont
import json
F = ImageFont.truetype('/tmp/pf.ttf', 220)
F.set_variation_by_name('Black')
# Области разлома в долях ячейки буквы (0..1 по ширине advance и по высоте строки).
# Всё, что внутри полигона, — отлетающий кусок; остальное остаётся.
PIECES = {
 'R>P': [(0.44,0.56),(1.05,0.56),(1.05,1.0),(0.44,1.0)],
 'B>P': [(0.40,0.53),(1.05,0.53),(1.05,1.0),(0.40,1.0)],
 'O>C': [(0.60,0.30),(1.05,0.24),(1.05,0.76),(0.60,0.70)],
 'G>C': [(0.52,0.50),(1.05,0.50),(1.05,0.93),(0.52,0.93)],
 'M>N': [(0.47,0.90),(0.60,0.90),(0.83,0.22),(0.73,0.22)],
 'E>F': [(0.33,0.80),(1.05,0.80),(1.05,0.93),(0.33,0.93)],
 'E>L': [(0.33,0.20),(1.05,0.20),(1.05,0.62),(0.33,0.62)],
 'W>V': [(-0.05,0.10),(0.42,0.10),(0.42,1.0),(-0.05,1.0)],
}
def cell(ch):
    asc, desc = F.getmetrics()
    w = int(F.getlength(ch)); h = asc + desc
    im = Image.new('L', (w, h), 0); ImageDraw.Draw(im).text((0, 0), ch, font=F, fill=255)
    return im, w, h
tiles = []
for key, poly in PIECES.items():
    src, dst = key.split('>')
    im, w, h = cell(src)
    # вертикальные границы строки: берём от верха капители до базовой линии
    bbox = im.getbbox(); top, bot = bbox[1], bbox[3]
    pts = [(x * w, top + y * (bot - top)) for x, y in poly]
    mask = Image.new('L', (w, h), 0); ImageDraw.Draw(mask).polygon(pts, fill=255)
    keep = Image.new('RGB', (w, h), (245, 240, 228)); piece = keep.copy()
    col = Image.new('RGB', (w, h), (40, 30, 20)); red = Image.new('RGB', (w, h), (200, 70, 40))
    from PIL import ImageChops
    kmask = ImageChops.subtract(im, mask); pmask = ImageChops.multiply(im, mask)
    out = Image.new('RGB', (w * 3 + 40, h + 40), (245, 240, 228))
    a = Image.new('RGB', (w, h), (245, 240, 228)); a.paste(col, (0, 0), kmask); a.paste(red, (0, 0), pmask)
    b = Image.new('RGB', (w, h), (245, 240, 228)); b.paste(col, (0, 0), kmask)
    tgt, tw, th = cell(dst); c = Image.new('RGB', (w, h), (245, 240, 228)); c.paste(col, (0, 0), tgt.crop((0, 0, w, h)))
    out.paste(a, (0, 20)); out.paste(b, (w + 20, 20)); out.paste(c, (2 * w + 40, 20))
    ImageDraw.Draw(out).text((6, 2), key, fill=(0, 0, 0))
    tiles.append(out)
W = max(t.width for t in tiles); H = sum(t.height for t in tiles)
sheet = Image.new('RGB', (W, H), (255, 255, 255)); y = 0
for t in tiles: sheet.paste(t, (0, y)); y += t.height
sheet.save('/tmp/breaks.png'); print(sheet.size)
