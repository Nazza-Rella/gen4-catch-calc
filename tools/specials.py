# 固定シンボル・はいかいと、あまいミツの木などの特別な出現
import csv
import json
import os
import re
import struct

from ndsx import PT, HG, DP
from encounters import pt_location_names, ndsx_jp, water_mons, HGSS_JP, HEADBUTT

# (図鑑番号, Lv, 地名, 地形, 種類)。レベルは各スクリプトで確認した値
# 種類 legend=「やせいの○○が あらわれた！」、wild=通常の野生、roam=はいかい、distortion=やぶれたせかい、event=配布アイテムが必要
PT_STATIC = [
    (480, 50, 'AcuityCavern', 'cave', 'legend'), (482, 50, 'ValorCavern', 'cave', 'legend'),
    (483, 70, 'SpearPillar', 'rocky', 'legend'), (484, 70, 'SpearPillar', 'rocky', 'legend'),
    (487, 47, 'DistortionWorld', 'distortion', 'distortion'), (487, 47, 'TurnbackCave', 'cave', 'legend'),
    (485, 50, 'StarkMountain', 'cave', 'legend'), (486, 1, 'SnowpointTemple', 'cave', 'legend'),
    (377, 30, 'RockPeakRuins', 'cave', 'legend'), (378, 30, 'IcebergRuins', 'cave', 'legend'), (379, 30, 'IronRuins', 'cave', 'legend'),
    (425, 15, 'ValleyWindworks', 'grass', 'legend'), (479, 20, 'OldChateau', 'building', 'wild'), (442, 25, 'Route209', 'grass', 'wild'),
    (491, 50, 'NewmoonIsland', 'grass', 'event'), (492, 30, 'FlowerParadise', 'grass', 'event'), (493, 80, 'HallOfOrigin', 'cave', 'event'),
    (481, 50, None, 'grass', 'roam'), (488, 50, None, 'grass', 'roam'),
    (144, 60, None, 'grass', 'roam'), (145, 60, None, 'grass', 'roam'), (146, 60, None, 'grass', 'roam'),
]
DP_STATIC = {
    'D': [(483, 47, 'SpearPillar', 'rocky', 'legend')],
    'P': [(484, 47, 'SpearPillar', 'rocky', 'legend')],
    'both': [
        (480, 50, 'AcuityCavern', 'cave', 'legend'), (482, 50, 'ValorCavern', 'cave', 'legend'),
        (487, 70, 'TurnbackCave', 'cave', 'legend'), (485, 70, 'StarkMountain', 'cave', 'legend'), (486, 70, 'SnowpointTemple', 'cave', 'legend'),
        (425, 22, 'ValleyWindworks', 'grass', 'legend'), (479, 15, 'OldChateau', 'building', 'wild'), (442, 25, 'Route209', 'grass', 'wild'),
        (491, 40, 'NewmoonIsland', 'grass', 'event'), (492, 30, 'FlowerParadise', 'grass', 'event'), (493, 80, 'HallOfOrigin', 'cave', 'event'),
        (481, 50, None, 'grass', 'roam'), (488, 50, None, 'grass', 'roam'),
    ],
}
# HGSS はスクリプトの wild_battle がすべて伝説扱い（battleSpecial |= 8）なので「あらわれた」。地名は地名番号
HG_STATIC = {
    'HG': [(250, 45, 205, 'building', 'legend'), (249, 70, 218, 'cave', 'legend'), (382, 50, 232, 'cave', 'legend'),
           (380, 35, None, 'grass', 'roam'), (381, 40, 140, 'grass', 'event')],
    'SS': [(249, 45, 218, 'cave', 'legend'), (250, 70, 205, 'building', 'legend'), (383, 50, 232, 'cave', 'legend'),
           (381, 35, None, 'grass', 'roam'), (380, 40, 140, 'grass', 'event')],
    'both': [
        (384, 50, 232, 'cave', 'legend'), (245, 40, 173, 'grass', 'legend'), (245, 40, 206, 'building', 'legend'),
        (150, 70, 199, 'cave', 'legend'), (144, 50, 203, 'cave', 'legend'), (145, 50, 158, 'grass', 'legend'), (146, 50, 219, 'cave', 'legend'),
        (143, 50, 159, 'grass', 'legend'), (143, 50, 160, 'grass', 'legend'), (185, 20, 184, 'grass', 'legend'),
        (130, 30, 135, 'water', 'legend'), (101, 23, 213, 'building', 'legend'), (131, 20, 210, 'water', 'legend'),
        (243, 40, None, 'grass', 'roam'), (244, 40, None, 'grass', 'roam'),
        (483, 1, 231, 'grass', 'event'), (484, 1, 231, 'grass', 'event'), (487, 1, 231, 'grass', 'event'),
    ],
}
NOTE = {130: 'あかいギャラドス', 131: 'きんようびのみ', 425: 'きんようびのみ'}


def build_statics(game):
    names, pt_msgs = pt_location_names()
    out = []
    if game in ('HG', 'SS'):
        rows = HG_STATIC[game] + HG_STATIC['both']
        name_of = lambda k: HGSS_JP.get(k) or ndsx_jp(pt_msgs[k])
        roam_place = 'ジョウト・カントーのどうろ'
    else:
        rows = PT_STATIC if game == 'Pt' else DP_STATIC[game] + DP_STATIC['both']
        name_of = lambda k: names['LocationNames_Text_' + k]
        roam_place = 'シンオウのどうろ'
    for d, lv, place, bg, kind in rows:
        s = {'dex': d, 'lv': lv, 'n': roam_place if kind == 'roam' else name_of(place), 'bg': bg, 'kind': kind}
        if d in NOTE:
            s['note'] = NOTE[d]
        out.append(s)
    return out


def build_extra(game, CONST_TO_DEX):
    """あまいミツの木・トロフィーガーデン・大湿原の日替わり（DPPt）、むしとり大会・ずつき（HGSS）"""
    out = []
    dex = lambda c: CONST_TO_DEX.get(c, 0) if isinstance(c, str) else (c if 0 < c <= 493 else 0)
    names, pt_msgs = pt_location_names()
    if game in ('D', 'P', 'Pt'):
        if game == 'Pt':
            base = os.path.join(PT, 'res', 'field', 'encounters')
            ht = json.load(open(os.path.join(base, 'encounters_honey_tree.json'), encoding='utf-8'))
            gm = json.load(open(os.path.join(base, 'encounters_great_marsh_lookout.json'), encoding='utf-8'))
            tg = json.load(open(os.path.join(base, 'encounters_trophy_garden.json'), encoding='utf-8'))
            honey = {k: [dex(s) for s in ht[k]] for k in ('common', 'uncommon', 'rare')}
            marsh = {'local': [dex(s) for s in gm['before_national_dex']], 'natdex': [dex(s) for s in gm['after_national_dex']]}
            garden = [dex(s) for s in tg['daily_encounters']]
        else:
            ex = [open(os.path.join(DP, 'files', 'arc', 'encdata_ex', 'narc_%04d.bin' % i), 'rb').read() for i in range(12)]
            ints = lambda b: list(struct.unpack('<%di' % (len(b) // 4), b[:len(b) // 4 * 4]))
            off = 0 if game == 'D' else 3
            honey = {k: [dex(x) for x in ints(ex[2 + off + i])] for i, k in enumerate(('common', 'uncommon', 'rare'))}
            marsh = {'natdex': [dex(x) for x in ints(ex[9])], 'local': [dex(x) for x in ints(ex[10])]}
            garden = [dex(x) for x in ints(ex[8])]
        HONEY = [40, 20, 20, 10, 5, 5]
        for key, jp in (('common', 'よくいる木'), ('uncommon', 'ときどきいる木'), ('rare', 'めったにいない木')):
            mons = water_mons(HONEY, [(d, 5, 15) for d in honey[key]])
            out.append({'n': 'あまいミツの木', 's': jp, 'm': 'honey', 'bg': 'grass', 'mons': mons})
        dailies = {'marsh': {'daily_local': marsh['local'], 'daily_natdex': marsh['natdex']}, 'garden': {'daily_natdex': garden}}
        return out, dailies
    ver = 'gold' if game == 'HG' else 'silver'
    rows = list(csv.DictReader(open(os.path.join(HG, 'files', 'data', 'mushi', 'mushi_encount.csv'), encoding='utf-8')))
    for t, jp in enumerate(('全国図鑑の前', '全国図鑑の後・かようび', '全国図鑑の後・もくようび', '全国図鑑の後・どようび')):
        mons = {}
        prev = 100
        for r in rows[t * 10:(t + 1) * 10]:
            d = dex(r['species'])
            p = prev - int(r['rate'])
            prev = int(r['rate'])
            e = mons.setdefault(d, [d, int(r['lvlmin']), int(r['lvlmax']), 0, 0, 0])
            for k in range(3):
                e[3 + k] += p
        out.append({'n': HGSS_JP[207], 's': 'むしとりたいかい・' + jp, 'm': 'contest', 'bg': 'grass',
                    'mons': sorted(mons.values(), key=lambda m: -m[3])})
    hb = json.load(open(os.path.join(HG, 'files', 'arc', 'headbutt.json'), encoding='utf-8'))['tables']
    s = open(os.path.join(HG, 'src', 'data', 'map_headers.h'), encoding='utf-8').read()
    sec = {}
    for l in open(os.path.join(HG, 'include', 'constants', 'map_sections.h'), encoding='utf-8'):
        mm = re.match(r'#define (MAPSEC_\w+)\s+(\d+)', l)
        if mm:
            sec[mm.group(1)] = int(mm.group(2))
    code_sec = {}
    for mapname, b in re.findall(r'\[(MAP_\w+)\]\s*=\s*\{(.*?)\n\s*\},', s, re.S):
        m = re.search(r'scriptsBank\s*=\s*NARC_scr_seq_scr_seq_\d+_(\w+)_bin', b)
        if m:
            code_sec.setdefault(m.group(1), sec[re.search(r'mapsec\s*=\s*(\w+)', b).group(1)])
    pick = lambda v: v[ver] if isinstance(v, dict) else v
    for t in hb:
        if not t['CommonMons'] or t['Map'] not in code_sec:
            continue
        k = code_sec[t['Map']]
        name = HGSS_JP.get(k) or ndsx_jp(pt_msgs[k])
        for key, jp in (('CommonMons', 'ふつうの木'), ('RareMons', 'めずらしい木')):
            tab = [(dex(pick(x['species'])), x['minLevel'], x['maxLevel']) for x in t[key]]
            mons = water_mons(HEADBUTT, tab)
            if mons:
                out.append({'n': name, 's': 'ずつき・' + jp, 'm': 'headbutt', 'bg': 'grass', 'mons': mons})
    return out, None
