# 逆アセのソースと日本版プラチナ ROM から、計算機で使うデータと画像を build/ に書き出す
import json
import os
import re
import struct
import sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ndsx
import ndspy.narc
from ndsx import PT, HG, DP

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
BUILD = os.path.join(ROOT, 'build')
os.makedirs(BUILD, exist_ok=True)
N = 493

TYPES = {
    'NORMAL': 'ノーマル', 'FIRE': 'ほのお', 'WATER': 'みず', 'ELECTRIC': 'でんき', 'GRASS': 'くさ', 'ICE': 'こおり',
    'FIGHTING': 'かくとう', 'POISON': 'どく', 'GROUND': 'じめん', 'FLYING': 'ひこう', 'PSYCHIC': 'エスパー', 'BUG': 'むし',
    'ROCK': 'いわ', 'GHOST': 'ゴースト', 'DRAGON': 'ドラゴン', 'DARK': 'あく', 'STEEL': 'はがね', 'MYSTERY': '？？？',
}
GENDER = {
    'GENDER_RATIO_MALE_ONLY': 0, 'GENDER_RATIO_FEMALE_12_5': 31, 'GENDER_RATIO_FEMALE_25': 63, 'GENDER_RATIO_FEMALE_50': 127,
    'GENDER_RATIO_FEMALE_75': 191, 'GENDER_RATIO_FEMALE_87_5': 223, 'GENDER_RATIO_FEMALE_ONLY': 254, 'GENDER_RATIO_NO_GENDER': 255,
}

# ---- 種族 ----
SPECIES_CONST = [l.strip() for l in open(os.path.join(PT, 'generated', 'species.txt'), encoding='utf-8') if l.strip()]
DIR = {}
for i in range(1, N + 1):
    DIR[i] = SPECIES_CONST[i].replace('SPECIES_', '').lower()
CONST_TO_DEX = {c: i for i, c in enumerate(SPECIES_CONST[:N + 1])}


def jp(s):
    return s.replace('－', 'ー')


species = [None]
for i in range(1, N + 1):
    d = json.load(open(os.path.join(PT, 'res', 'pokemon', DIR[i], 'data.json'), encoding='utf-8'))
    sd = json.load(open(os.path.join(PT, 'res', 'pokemon', DIR[i], 'sprite_data.json'), encoding='utf-8'))
    types = []
    for t in d['types']:
        n = TYPES[t.replace('TYPE_', '')]
        if n not in types:
            types.append(n)
    species.append({
        'name': jp(d['pokedex_data']['jp']['name']),
        'types': types,
        'rate': d['catch_rate'],
        'hp': d['base_stats']['hp'],
        'spd': d['base_stats']['speed'],
        'wt': d['pokedex_data']['weight'],
        'g': GENDER[d['gender_ratio']],
        'sf': d['safari_flee_rate'],
        'y': sd['front']['y_offset']['male'] if isinstance(sd['front']['y_offset'], dict) else sd['front']['y_offset'],
        'ya': sd['front'].get('addl_y_offset', 0),
        'sh': ['SHADOW_SIZE_NONE', 'SHADOW_SIZE_SMALL', 'SHADOW_SIZE_MEDIUM', 'SHADOW_SIZE_LARGE'].index(sd['shadow']['size']) if 'shadow' in sd else 0,
        'sx': sd['shadow']['x_offset'] if 'shadow' in sd else 0,
        # 正面の動き：動作スクリプト番号・開始までの待ち・鳴き声の待ち・コマ送り [コマ, 待ち, 横ずれ]
        'an': [sd['front']['animation'], sd['front']['start_delay'], sd['front']['cry_delay'],
               [[f['sprite_frame'], f['frame_delay'], f['x_shift']] for f in sd['front']['frames']]],
    })


# ---- 正面スプライト（パレット番号のまま灰色で詰めた画像と、通常色・色違いのパレット） ----
def pal_hex(cols):
    return ''.join('%02x%02x%02x' % tuple(c[:3]) for c in cols[:16])


def read_jasc(path):
    lines = open(path, encoding='utf-8').read().split('\n')
    return [tuple(int(v) for v in l.split()) for l in lines[3:19]]


def png_pal(im):
    p = im.getpalette()
    return [tuple(p[k * 3:k * 3 + 3]) for k in range(16)]


def is_blank(im):
    return not any(im.crop((0, 0, 80, 80)).tobytes())


COLS = 25


def build_atlas(tag, get):
    atlas = Image.new('L', (COLS * 80, ((N + COLS - 1) // COLS) * 80 * 2), 0)
    pals = {}
    for i in range(1, N + 1):
        im, normal, shiny = get(i)
        for f in range(2):
            fr = im.crop((f * 80, 0, f * 80 + 80, 80))
            g = Image.frombytes('L', fr.size, bytes((v & 15) * 16 for v in fr.tobytes()))
            k = (i - 1) * 2 + f
            atlas.paste(g, ((k % COLS) * 80, (k // COLS) * 80))
        pals[i] = [pal_hex(normal), pal_hex(shiny)]
    atlas.save(os.path.join(BUILD, 'sprites_%s.png' % tag), optimize=True)
    return pals


def get_pt(i):
    base = os.path.join(PT, 'res', 'pokemon', DIR[i])
    m = os.path.join(base, 'male_front.png')
    im = Image.open(m) if os.path.exists(m) else None
    if im is None or is_blank(im):
        im = Image.open(os.path.join(base, 'female_front.png'))
    return im, read_jasc(os.path.join(base, 'normal.pal')), read_jasc(os.path.join(base, 'shiny.pal'))


def get_dp(i):
    base = os.path.join(DP, 'files', 'poketool', 'pokegra', 'pokegra')
    m = os.path.join(base, 'narc_%04d.png' % (i * 6 + 3))
    im = Image.open(m) if os.path.exists(m) else None
    if im is None or is_blank(im):
        im = Image.open(os.path.join(base, 'narc_%04d.png' % (i * 6 + 2)))
    pal = lambda k: read_jasc(os.path.join(base, 'narc_%04d.pal' % (i * 6 + k)))
    return im, pal(4), pal(5)


def get_hg(i):
    base = os.path.join(HG, 'files', 'poketool', 'pokegra', 'pokegra', '%04d' % i)
    front = os.path.join(base, 'male', 'front.png')
    im = Image.open(front) if os.path.getsize(front) else None
    if im is None or is_blank(im):
        im = Image.open(os.path.join(base, 'female', 'front.png'))
    back = os.path.join(base, 'male', 'back.png')
    if not os.path.getsize(back):
        back = os.path.join(base, 'female', 'back.png')
    # HGSS は正面画像のパレットが通常色、背面画像のパレットが色違い
    return im, png_pal(im), png_pal(Image.open(back))


palettes = {}
for tag, fn in (('pt', get_pt), ('dp', get_dp), ('hg', get_hg)):
    palettes[tag] = build_atlas(tag, fn)
    print('sprites', tag)

# ---- アイコン（2コマ目は使わない） ----
icons = Image.new('RGBA', (32 * 32, ((N + 31) // 32) * 32), (0, 0, 0, 0))
for i in range(1, N + 1):
    im = Image.open(os.path.join(PT, 'res', 'pokemon', DIR[i], 'icon.png'))
    im = im.convert('RGBA') if im.mode == 'RGBA' else im.copy()
    if im.mode == 'P':
        im.info['transparency'] = 0
        im = im.convert('RGBA')
    icons.paste(im.crop((0, 0, 32, 32)), ((i - 1) % 32 * 32, (i - 1) // 32 * 32))
icons.save(os.path.join(BUILD, 'icons.png'), optimize=True)

# ---- 出現 ----
import encounters
import specials
games = {}
for g in ('D', 'P', 'Pt', 'HG', 'SS'):
    extra, dailies = specials.build_extra(g, CONST_TO_DEX)
    if g in ('HG', 'SS'):
        locs = encounters.build_hgss(g, CONST_TO_DEX)
    else:
        locs = encounters.build_sinnoh(g, CONST_TO_DEX, dailies)
    games[g] = {'locs': locs + extra, 'statics': specials.build_statics(g)}
    print('encounters', g, len(games[g]['locs']), len(games[g]['statics']))

# ポケモンの動作スクリプト（日本版プラチナ pl_poke_anm.narc。4バイトずつの命令列）
anm = ndspy.narc.NARC(ndsx.rom().getFileByName('pokeanime/pl_poke_anm.narc'))
anims = [list(struct.unpack('<%di' % (len(f) // 4), f)) for f in anm.files]
data = {'species': species, 'palettes': palettes, 'games': games, 'anims': anims}
json.dump(data, open(os.path.join(BUILD, 'data.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('ok', os.path.getsize(os.path.join(BUILD, 'data.json')))
