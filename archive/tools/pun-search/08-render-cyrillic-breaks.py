from PIL import Image, ImageDraw, ImageFont, ImageChops
F = ImageFont.truetype('/tmp/pf.ttf', 200); F.set_variation_by_name('Black')
PIECES = {   # x — доля advance, y — доля «чернил» (сверху вниз, вместе с диакритикой)
 'Т>Г': [(-0.06,-0.06),(0.39,-0.06),(0.39,0.30),(-0.06,0.30)],
 'Д>Л': [(-0.08,0.70),(1.08,0.70),(1.08,1.04),(-0.08,1.04)],
 'Ё>Е': [(-0.06,-0.06),(1.08,-0.06),(1.08,0.19),(-0.06,0.19)],
 'Й>И': [(-0.06,-0.06),(1.08,-0.06),(1.08,0.19),(-0.06,0.19)],
 'Б>Ь': [(0.36,-0.06),(1.08,-0.06),(1.08,0.30),(0.36,0.30)],
 'Б>Г': [(0.36,0.38),(1.08,0.38),(1.08,1.04),(0.36,1.04)],
 'В>Р': [(0.40,0.53),(1.08,0.53),(1.08,1.04),(0.40,1.04)],
 'П>Г': [(0.62,0.20),(1.08,0.20),(1.08,1.04),(0.62,1.04)],
 'Щ>Ш': [(0.72,0.80),(1.08,0.80),(1.08,1.04),(0.72,1.04)],
 'Ы>Ь': [(0.70,-0.06),(1.08,-0.06),(1.08,1.04),(0.70,1.04)],
 'Ж>К': [(-0.08,-0.06),(0.38,-0.06),(0.38,1.04),(-0.08,1.04)],
 'О>С': [(0.60,0.30),(1.08,0.24),(1.08,0.76),(0.60,0.70)],
}
def cell(ch):
    asc, desc = F.getmetrics(); w = int(F.getlength(ch)); h = asc + desc
    im = Image.new('L', (w, h), 0); ImageDraw.Draw(im).text((0, 0), ch, font=F, fill=255); return im, w, h
col=(40,30,20); red=(210,70,40); bg=(245,240,228)
tiles=[]
for key, poly in PIECES.items():
    src, dst = key.split('>'); im, w, h = cell(src); bb = im.getbbox(); top, bot = bb[1], bb[3]
    pts = [(x*w, top + y*(bot-top)) for x, y in poly]
    m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).polygon(pts, fill=255)
    keep = ImageChops.subtract(im, m); piece = ImageChops.multiply(im, m)
    tgt, tw, th = cell(dst)
    W = w + w + tw + 60
    out = Image.new('RGB', (W, h + 30), bg)
    a = Image.new('RGB', (w, h), bg); a.paste(Image.new('RGB',(w,h),col),(0,0),keep); a.paste(Image.new('RGB',(w,h),red),(0,0),piece)
    b = Image.new('RGB', (w, h), bg); b.paste(Image.new('RGB',(w,h),col),(0,0),keep)
    c = Image.new('RGB', (tw, th), bg); c.paste(Image.new('RGB',(tw,th),col),(0,0),tgt)
    out.paste(a,(0,24)); out.paste(b,(w+20,24)); out.paste(c,(2*w+40,24))
    ImageDraw.Draw(out).text((4,2), key, fill=(0,0,0)); tiles.append(out)
cols=3; rows=(len(tiles)+cols-1)//cols
cw=max(t.width for t in tiles)+20; ch=max(t.height for t in tiles)+10
sheet=Image.new('RGB',(cw*cols, ch*rows),(255,255,255))
for i,t in enumerate(tiles): sheet.paste(t,((i%cols)*cw,(i//cols)*ch))
sheet.save('/tmp/cyr.png'); print(sheet.size)
