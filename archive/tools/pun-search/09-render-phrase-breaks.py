from PIL import Image, ImageDraw, ImageFont, ImageChops
F = ImageFont.truetype('/tmp/pf.ttf', 150); F.set_variation_by_name('Black')
PIECES = {  # доли от ширины advance и от высоты капители
 'R': [(0.42,0.53),(1.08,0.53),(1.08,1.02),(0.42,1.02)],
 'B': [(0.40,0.53),(1.08,0.53),(1.08,1.02),(0.40,1.02)],
 'G': [(0.50,0.46),(1.08,0.46),(1.08,0.94),(0.50,0.94)],
}
INK=(214,169,62); PLANK=(110,75,45); SEAM=(75,50,30); RED=(232,138,98); GHOST=(138,96,56)
def render(text, breaks, mode):
    asc, desc = F.getmetrics(); H = asc + desc
    widths = [int(F.getlength(c)) for c in text]; gap = 10
    W = sum(widths) + gap*(len(text)-1) + 80
    im = Image.new('RGB', (W, H + 40), PLANK); d = ImageDraw.Draw(im)
    for y in range(0, H + 40, 46): d.rectangle([0, y + 44, W, y + 46], fill=SEAM)
    x = 40
    for i, c in enumerate(text):
        g = Image.new('L', (widths[i], H), 0); ImageDraw.Draw(g).text((0, 0), c, font=F, fill=255)
        bb = g.getbbox()
        if bb is None: x += widths[i] + gap; continue
        top, bot = bb[1], bb[3]
        m = Image.new('L', g.size, 0)
        if i in breaks:
            pts = [(px*widths[i], top + py*(bot-top)) for px, py in PIECES[c]]
            ImageDraw.Draw(m).polygon(pts, fill=255)
        keep = ImageChops.subtract(g, m); piece = ImageChops.multiply(g, m)
        layer = Image.new('RGB', g.size, INK)
        if mode == 'before':
            im.paste(layer, (x, 20), g)
        elif mode == 'mark':
            im.paste(layer, (x, 20), keep); im.paste(Image.new('RGB', g.size, RED), (x, 20), piece)
        else:
            im.paste(Image.new('RGB', g.size, GHOST), (x, 20), piece)   # светлый след на доске
            im.paste(layer, (x, 20), keep)
        x += widths[i] + gap
    return im
rows = []
for text, br in [("GOLD RUSH", {0, 5}), ("BEST BET", {0, 5})]:
    for mode in ('before', 'mark', 'after'): rows.append(render(text, br, mode))
W = max(r.width for r in rows); sheet = Image.new('RGB', (W, sum(r.height for r in rows) + 12*len(rows)), (28,20,14))
y = 0
for r in rows: sheet.paste(r, (0, y)); y += r.height + 12
sheet.save('/mnt/user-data/outputs/english-breaks.png'); print(sheet.size)
