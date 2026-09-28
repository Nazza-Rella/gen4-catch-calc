# 戦闘画面の素材を build/ui と build/bg に書き出す（日本版プラチナ ROM と pokeplatinum の画像）
import json
import os
import struct

from PIL import Image

import ndsx
from ndsx import PT

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
UI = os.path.join(ROOT, 'build', 'ui')
BG = os.path.join(ROOT, 'build', 'bg')
os.makedirs(UI, exist_ok=True)
os.makedirs(BG, exist_ok=True)

obj = ndsx.narc('battle/graphic/pl_batt_obj.narc')
bgn = ndsx.narc('battle/graphic/pl_batt_bg.narc')

# ---- 背景：マップの背景種別（0〜11、17=やぶれたせかい）× 時間帯（昼・夕・夜）。画面に見える 256x144 だけ ----
scr = ndsx.nscr(bgn[2])
for b in list(range(12)) + [17]:
    ch = ndsx.ncgr(bgn[3 + b])
    for t in range(3):
        pals = ndsx.nclr(bgn[172 + b * 3 + t])
        im = ndsx.render_screen(ch, pals, scr)
        im.crop((0, 0, 256, 144)).convert('RGB').save(os.path.join(BG, 'b%d_%d.png' % (b, t)))

# ---- 台座：地形ごとの自分側・相手側。パレットは地形×時間帯 ----
TERRAIN = {  # 名前: (sprites.order の NCGR 行, パレット行の先頭)
    'grass': (128, 2), 'water': (134, 5), 'path': (136, 8), 'ice': (138, 11), 'rocky': (140, 14), 'snow': (142, 17),
    'building': (144, 20), 'sand': (146, 23), 'marsh': (148, 26), 'cave': (150, 29), 'puddle': (152, 32), 'distortion': (164, 50),
}
pcell = ndsx.ncer(obj[128])[0]
ecell = ndsx.ncer(obj[131])[0]
for name, (row, prow) in TERRAIN.items():
    pch = ndsx.ncgr(obj[row - 1])
    ech = ndsx.ncgr(obj[row + (2 if name == 'grass' else 0)])
    for t in range(3):
        pal = ndsx.nclr(obj[prow - 1 + t])[0]
        ndsx.render_cell(pch, pal, pcell, 128, 16, 256, 32).save(os.path.join(BG, 'p_%s_%d.png' % (name, t)))
        ndsx.render_cell(ech, pal, ecell, 64, 32, 128, 64).save(os.path.join(BG, 'e_%s_%d.png' % (name, t)))

# ---- 体力ゲージ：相手の枠と、ゲージ部品（状態アイコン入り。オーバーレイ16に埋め込み） ----
hbpal = ndsx.nclr(obj[71])[0]
hbcell = ndsx.ncer(obj[187])[0]
ndsx.render_cell(ndsx.ncgr(obj[188]), hbpal, hbcell, 64, 28, 128, 64).save(os.path.join(UI, 'hb_enemy.png'))
raw = ndsx.rom().loadArm9Overlays()[16].data[0x34560:0x34560 + 2496]
tiles = []
for t in range(len(raw) // 32):
    tile = []
    for b in raw[t * 32:(t + 1) * 32]:
        tile += [b & 15, b >> 4]
    tiles.append(tile)
ndsx.tiles_image({'tiles': tiles, 'w': 78, 'bpp': 4}, hbpal, 78).save(os.path.join(UI, 'hb_parts.png'))
# レベルの数字（特殊文字の 0〜9）。文字=色14・影=色2に置き換えて使われる（FontSpecialChars_Init(14, 2, 15)）
spc = ndsx.ncgr(ndsx.narc('graphic/pl_font.narc')[4])


def digits(pal):
    remap = {'tiles': [[{1: 14, 2: 2}.get(v, 0) for v in t] for t in spc['tiles'][:10]], 'w': 10, 'bpp': 4}
    return ndsx.tiles_image(remap, pal, 10)


digits(hbpal).save(os.path.join(UI, 'hb_digits.png'))

# ---- DP の相手のゲージ（白い吹き出し型）。pokediamond の batt_obj 124/123、パレット35、部品は ov11_0225ECE8 ----
DPOBJ = os.path.join(ndsx.DP, 'files', 'battle', 'graphic', 'batt_obj', 'narc_%04d.')
dprd = lambda i, e: open(DPOBJ % i + e, 'rb').read()
dppal = ndsx.nclr(dprd(35, 'NCLR'))[0]
ndsx.render_cell(ndsx.ncgr(dprd(124, 'NCGR')), dppal, ndsx.ncer(dprd(123, 'NCER'))[0], 64, 28, 128, 64).save(os.path.join(UI, 'hb_enemy_dp.png'))
import re
asm = open(os.path.join(ndsx.DP, 'arm9', 'overlays', '11', 'asm', 'ov11_02256C08.s'), encoding='utf-8').read()
vals = []
for line in asm[asm.index('ov11_0225ECE8:'):].split('\n')[1:]:
    line = line.strip()
    if not line.startswith('.byte'):
        if vals:
            break
        continue
    vals += [int(x, 16) for x in re.findall(r'0x[0-9A-Fa-f]+', line)]
dtiles = []
for t in range(len(vals) // 32):
    tile = []
    for b in vals[t * 32:(t + 1) * 32]:
        tile += [b & 15, b >> 4]
    dtiles.append(tile)
# 日本版DPの状態アイコンは手元に無いので、英語版DPのカプセル（地の色・両端の形・下の影）を24ドット幅に伸ばし、
# プラチナ日本版の文字（白=14→DPの白15、淡い灰4→DPの1）を載せて作る
ptjp = tiles
for base in (41, 44, 47, 50, 53):
    us = [[dtiles[base + x // 8][y * 8 + x % 8] for x in range(24)] for y in range(8)]
    jp = [[ptjp[base + x // 8][y * 8 + x % 8] for x in range(24)] for y in range(8)]
    fill = us[0][4]
    out = []
    for y in range(8):
        # 左端 0〜2 はそのまま、右端 17〜19 を 21〜23 へずらし、あいだは地の色（いちばん下の行は影の色）
        row = [us[y][x] for x in range(3)] + [1 if y == 7 else fill] * 18 + [us[y][x] for x in range(17, 20)]
        for x in range(24):
            if jp[y][x] == 14:
                row[x] = 15
            elif jp[y][x] == 4:
                row[x] = 1
        out.append(row)
    for k in range(3):
        dtiles[base + k] = [out[y][k * 8 + x] for y in range(8) for x in range(8)]
ndsx.tiles_image({'tiles': dtiles, 'w': 70, 'bpp': 4}, dppal, 70).save(os.path.join(UI, 'hb_parts_dp.png'))
digits(dppal).save(os.path.join(UI, 'hb_digits_dp.png'))
json.dump({'hb': hbpal, 'hb_dp': dppal}, open(os.path.join(ROOT, 'build', 'hbpal.json'), 'w'))

# ---- DP の背景（画面2、タイル3+背景、パレット 158+背景×3+時間帯） ----
DPBG = os.path.join(ndsx.DP, 'files', 'battle', 'graphic', 'batt_bg', 'narc_%04d.')
dpscr = ndsx.nscr(open(DPBG % 2 + 'NSCR', 'rb').read())
for b in range(12):
    ch = ndsx.ncgr(open(DPBG % (3 + b) + 'NCGR', 'rb').read())
    for t in range(3):
        pals = ndsx.nclr(open(DPBG % (158 + b * 3 + t) + 'NCLR', 'rb').read())
        ndsx.render_screen(ch, pals, dpscr).crop((0, 0, 256, 144)).convert('RGB').save(os.path.join(BG, 'dpb%d_%d.png' % (b, t)))

# ---- ギラティナ（オリジンフォルム）。やぶれたせかいで出る ----
gdir = os.path.join(PT, 'res', 'pokemon', 'giratina', 'forms', 'origin')
gsrc = Image.open(os.path.join(gdir, 'front.png'))
for tag, palf in (('', 'normal.pal'), ('_s', 'shiny.pal')):
    pal = [tuple(int(v) for v in l.split()) for l in open(os.path.join(gdir, palf), encoding='utf-8').read().split('\n')[3:19]]
    out = Image.new('RGBA', gsrc.size, (0, 0, 0, 0))
    op, gp = out.load(), gsrc.load()
    for y in range(gsrc.height):
        for x in range(gsrc.width):
            v = gp[x, y] & 15
            if v:
                op[x, y] = pal[v] + (255,)
    out.save(os.path.join(UI, 'giratina_o%s.png' % tag))

# ---- メッセージ欄：枠（message_box_00）で画面下の 256x48 を描く。中は白（フォントのパレット15）、枠の外は黒で台座や主人公を隠す ----
wf = ndsx.narc('graphic/pl_winframe.narc')
fch = ndsx.ncgr(wf[2])
fpal = ndsx.nclr(wf[25])[0]
fontpal = ndsx.nclr(ndsx.narc('graphic/pl_font.narc')[6])
box = Image.new('RGBA', (256, 48), (0, 0, 0, 0))
bx = box.load()
x0, y0, w, h = 2, 1, 27, 4


def put(tile, tx, ty):
    for y in range(8):
        for x in range(8):
            v = fch['tiles'][tile][y * 8 + x]
            bx[tx * 8 + x, ty * 8 + y] = fpal[v] + (255,) if v else (0, 0, 0, 255)


for tx in range(32):
    for ty in range(6):
        if ty == 0:
            k = 0 if tx == 0 else 1 if tx == 1 else 2 if tx < x0 + w else 3 + (tx - (x0 + w))
        elif ty == 5:
            k = 12 if tx == 0 else 13 if tx == 1 else 14 if tx < x0 + w else 15 + (tx - (x0 + w))
        else:
            k = 6 if tx == 0 else 7 if tx == 1 else None if tx < x0 + w else 9 + (tx - (x0 + w))
        if k is not None:
            put(k, tx, ty)
fill = fpal[15] if fontpal is None else fontpal[0][15]
for y in range(8, 40):
    for x in range(16, 16 + w * 8):
        bx[x, y] = fill + (255,)
box.save(os.path.join(UI, 'msgbox.png'))

# ---- フォント：0=システム（ゲージの名前）、1=メッセージ。1文字16x16、値は 0〜3 を 64 倍した灰色 ----
fonts = ndsx.narc('graphic/pl_font.narc')
widths = {}
for fi, tag in ((0, 'sys'), (1, 'msg')):
    d = fonts[fi]
    go, wo, cnt, mw, mh, tw, th = struct.unpack_from('<IIIBBBB', d, 0)
    im = Image.new('L', (32 * 16, ((cnt + 31) // 32) * 16), 0)
    px = im.load()
    for g in range(cnt):
        base = go + g * 64
        for t in range(4):
            for y in range(8):
                row = struct.unpack_from('<H', d, base + t * 16 + y * 2)[0]
                for x in range(8):
                    v = (row >> (14 - 2 * x)) & 3
                    px[(g % 32) * 16 + (t % 2) * 8 + x, (g // 32) * 16 + (t // 2) * 8 + y] = v * 64
    im.save(os.path.join(UI, 'font_%s.png' % tag))
    widths[tag] = list(d[wo:wo + cnt])

# ---- 主人公の後ろ姿（Pt と DP）。元画像は 80x80 のコマが1ドットの区切りつきで縦に並ぶ ----
def indexed_to_rgba(src, box):
    pal = src.getpalette()
    part = src.crop(box)
    out = Image.new('RGBA', part.size, (0, 0, 0, 0))
    op = out.load()
    pp = part.load()
    for y in range(part.height):
        for x in range(part.width):
            v = pp[x, y]
            if v:
                op[x, y] = tuple(pal[v * 3:v * 3 + 3]) + (255,)
    return out


for cls, tag in (('player_male', 'lucas'), ('player_female', 'dawn'), ('dp_player_male', 'lucas_dp'), ('dp_player_female', 'dawn_dp')):
    src = Image.open(os.path.join(PT, 'res', 'trainers', 'classes', cls, 'back.png'))
    n = (src.height + 1) // 81
    sheet = Image.new('RGBA', (80, 80 * n), (0, 0, 0, 0))
    for f in range(n):
        sheet.paste(indexed_to_rgba(src, (0, f * 81, 80, f * 81 + 80)), (0, f * 80))
    sheet.save(os.path.join(UI, 'back_%s.png' % tag))

# ---- 投げたボール（16x16 のコマ 0〜8 と開いたボール 32x32。区切り1ドットで縦に並ぶ）とアイテムのアイコン ----
BALLS = ['master', 'ultra', 'great', 'poke', 'safari', 'net', 'dive', 'nest', 'repeat', 'timer', 'luxury', 'premier', 'dusk',
         'heal', 'quick', 'cherish', 'park']
for b in BALLS:
    src = Image.open(os.path.join(PT, 'res', 'graphics', 'battle', 'ball_throws', b + '_ball.png'))
    strip = Image.new('RGBA', (16 * 9 + 32, 32), (0, 0, 0, 0))
    for f in range(9):
        strip.paste(indexed_to_rgba(src, (0, f * 17, 16, f * 17 + 16)), (f * 16, 0))
    strip.paste(indexed_to_rgba(src, (0, 9 * 17, 32, 9 * 17 + 32)), (144, 0))
    strip.save(os.path.join(UI, 'ball_%s_spr.png' % b))
    icp = os.path.join(PT, 'res', 'graphics', 'item_icons', b + '_ball.png')
    if not os.path.exists(icp):
        continue
    ic = Image.open(icp)
    palp = icp[:-4] + '.pal'
    if os.path.exists(palp):
        icpal = [tuple(int(v) for v in l.split()) for l in open(palp, encoding='utf-8').read().split('\n')[3:19]]
    else:
        pp = ic.getpalette()
        icpal = [tuple(pp[k * 3:k * 3 + 3]) for k in range(16)]
    out = Image.new('RGBA', ic.size, (0, 0, 0, 0))
    op = out.load()
    ip = ic.load()
    for y in range(ic.height):
        for x in range(ic.width):
            v = ip[x, y]
            if v:
                op[x, y] = icpal[v] + (255,)
    out.save(os.path.join(UI, 'ball_%s.png' % b))

# ---- HGSS だけのボール（ぼんぐり・コンペ・パーク）。アイコンは pokeheartgold の NCGR/NCLR、
#      投げたボールの絵は手元に無いのでモンスターボールの赤をアイコンの色に置き換える ----
HG_ICON = os.path.join(ndsx.HG, 'files', 'itemtool', 'itemdata', 'item_icon')
HG_BALLS = {'fast': (723, 724), 'level': (717, 718), 'lure': (715, 716), 'heavy': (721, 722), 'love': (727, 728),
            'friend': (725, 726), 'moon': (719, 720), 'sport': (731, 732), 'park': (729, 730)}
poke_spr = Image.open(os.path.join(UI, 'ball_poke_spr.png')).convert('RGBA')
for b, (gi, pi) in HG_BALLS.items():
    ch = ndsx.ncgr(open(os.path.join(HG_ICON, 'item_icon_%03d.NCGR' % gi), 'rb').read())
    pal = ndsx.nclr(open(os.path.join(HG_ICON, 'item_icon_%03d.NCLR' % pi), 'rb').read())[0]
    icon = ndsx.tiles_image(ch, pal, 4)
    icon.save(os.path.join(UI, 'ball_%s.png' % b))
    # アイコンの上半分でいちばん多い色を、ボールの上半分の色として使う
    counts = {}
    for y in range(4, 12):
        for x in range(4, 28):
            c = icon.getpixel((x, y))
            if c[3] and max(c[:3]) - min(c[:3]) > 40:
                counts[c[:3]] = counts.get(c[:3], 0) + 1
    main = max(counts, key=counts.get) if counts else (200, 60, 60)
    spr = poke_spr.copy()
    px = spr.load()
    for y in range(spr.height):
        for x in range(spr.width):
            r, g, bb, a = px[x, y]
            if a and r > 120 and r > g + 60 and r > bb + 60:
                k = r / 255
                px[x, y] = (int(main[0] * k), int(main[1] * k), int(main[2] * k), a)
    if not os.path.exists(os.path.join(UI, 'ball_%s_spr.png' % b)) or b != 'park':
        spr.save(os.path.join(UI, 'ball_%s_spr.png' % b))

codes = {}
for code, ch in ndsx.charmap().items():
    if 1 <= code <= 509 and len(ch) == 1:
        codes.setdefault(ch, code)
if '－' in codes:
    codes['ー'] = codes['－']
json.dump({'fontWidths': widths, 'fontCodes': codes}, open(os.path.join(ROOT, 'build', 'ui_meta.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print('ui ok')

# ---- HGSS の主人公の後ろ姿（投げる動きの5ポーズを並べた画像。1コマ80x80、区切り1ドット、地の色は透明に）
# プラチナの8コマは 0,1,2,3,3,4,4,4 のポーズの並びなので、同じ並びにする
sheet = Image.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src', 'hgss_trainers_back_sheet.png')).convert('RGBA')
for col0, y0, tag in ((0, 18, 'ethan'), (5, 18, 'lyra'), (5, 116, 'lance')):
    out = Image.new('RGBA', (80, 640), (0, 0, 0, 0))
    for f, pose in enumerate((0, 1, 2, 3, 3, 4, 4, 4)):
        c = sheet.crop((1 + 81 * (col0 + pose), y0, 81 + 81 * (col0 + pose), y0 + 80))
        bg = c.getpixel((0, 0))
        c.putdata([(0, 0, 0, 0) if px == bg else px for px in c.getdata()])
        out.paste(c, (0, f * 80))
    out.save(os.path.join(UI, 'back_%s.png' % tag))
