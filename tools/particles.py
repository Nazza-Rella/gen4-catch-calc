# ボールのパーティクル（wazaeffect/effectdata/ball_particle.narc）を JSON とテクスチャ1枚に書き出す
# 捕まえる時は 0x13〜0x23、ボールから出る時は 1〜17 を使う（ov12_02235E94.c の表）
import json
import os

import ndspy.narc
from PIL import Image

import ndsx
import spa

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
BUILD = os.path.join(ROOT, 'build')

narc = ndspy.narc.NARC(ndsx.rom().getFileByName('wazaeffect/effectdata/ball_particle.narc'))
USE = list(range(1, 18)) + list(range(0x13, 0x24))
out = {}
tiles = []
params = []
for idx in USE:
    res, tex = spa.parse(narc.files[idx])
    tlist = []
    for t in tex:
        im = Image.frombytes('RGBA', (t['w'], t['h']), spa.decode_texture(t, tex))
        tlist.append(len(tiles))
        tiles.append(im)
        params.append({'repeat': t['repeat'], 'flip': t['flip']})
    for r in res:
        r['h'] = {k: v for k, v in r['h'].items()}
    out[idx] = {'id': idx, 'res': res, 'tex': tlist}

# テクスチャを横に詰めて1枚にする（高さごとの棚詰め）
W = 256
x = y = row_h = 0
rects = []
for im in tiles:
    if x + im.width > W:
        x, y, row_h = 0, y + row_h, 0
    rects.append([x, y, im.width, im.height])
    x += im.width
    row_h = max(row_h, im.height)
atlas = Image.new('RGBA', (W, y + row_h), (0, 0, 0, 0))
for im, (rx, ry, _, _) in zip(tiles, rects):
    atlas.paste(im, (rx, ry))
atlas.save(os.path.join(BUILD, 'ui', 'spa_atlas.png'))
json.dump({'spa': out, 'rects': rects, 'params': params}, open(os.path.join(BUILD, 'particles.json'), 'w'), separators=(',', ':'))
print('particles', len(out), 'textures', len(tiles), atlas.size)
