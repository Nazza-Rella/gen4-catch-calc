# DP・Pt・HGSS の出現データ。場所ごとに [図鑑番号, 最低Lv, 最高Lv, 朝%, 昼%, 夜%] の一覧にする
import json
import os
import re
import struct

import ndsx
from ndsx import PT, HG, DP

LAND = [20, 20, 10, 10, 10, 10, 5, 5, 4, 4, 1, 1]
SURF = [60, 30, 5, 4, 1]
OLD_ROD_SINNOH = [60, 30, 5, 4, 1]
ROD_SINNOH = [40, 40, 15, 4, 1]
ROD_JOHTO = [40, 30, 15, 10, 5]
ROCK_JOHTO = [80, 20]
HEADBUTT = [50, 15, 15, 10, 5, 5]

HERE = os.path.dirname(os.path.abspath(__file__))

# HGSS の地名（ジョウト・カントー）。シンオウの地名はプラチナの地名表と同じ番号
HGSS_JP = {
    126: 'ワカバタウン', 127: 'ヨシノシティ', 128: 'キキョウシティ', 129: 'ヒワダタウン', 130: 'タンバシティ', 131: 'コガネシティ',
    132: 'アサギシティ', 133: 'エンジュシティ', 134: 'チョウジタウン', 135: 'いかりのみずうみ', 136: 'フスベシティ', 137: 'シロガネやま',
    138: 'マサラタウン', 139: 'トキワシティ', 140: 'ニビシティ', 141: 'ハナダシティ', 142: 'シオンタウン', 143: 'クチバシティ',
    144: 'タマムシシティ', 145: 'セキチクシティ', 146: 'グレンじま', 147: 'セキエイこうげん', 148: 'ヤマブキシティ',
    197: 'ディグダのあな', 198: 'おつきみやま', 199: 'ハナダのどうくつ', 200: 'イワヤマトンネル', 201: 'はつでんしょ', 202: 'サファリゾーン',
    203: 'ふたごじま', 204: 'マダツボミのとう', 205: 'スズのとう', 206: 'やけたとう', 207: 'しぜんこうえん', 208: 'ラジオとう',
    209: 'アルフのいせき', 210: 'つながりのどうくつ', 211: 'ヤドンのいど', 212: 'アサギのとうだい', 213: 'ロケットだんのアジト',
    214: 'ウバメのもり', 215: 'コガネちかつうろ', 216: 'スリバチやま', 217: 'こおりのぬけみち', 218: 'うずまきじま', 219: 'シロガネやま',
    220: 'くらやみのほらあな', 221: 'チャンピオンロード', 222: 'りゅうのあな', 223: 'トージョウのたき', 224: 'トキワのもり',
    225: 'ポケスロンドーム', 226: 'アクアごう', 227: 'サファリゾーンゲート', 228: 'だんがいのどうくつ', 229: 'フロンティアフロント',
    230: 'スズねのこみち', 231: 'シントいせき', 232: 'うずもれのとう', 234: 'がけっぷちゲート',
}
ZEN = str.maketrans('0123456789', '０１２３４５６７８９')
for i, n in enumerate(range(149, 177), start=1):
    HGSS_JP[n] = str(i).translate(ZEN) + ('ばんすいどう' if i in (19, 20, 21) else 'ばんどうろ')
for i, n in enumerate(range(177, 197), start=29):
    HGSS_JP[n] = str(i).translate(ZEN) + ('ばんすいどう' if i in (40, 41) else 'ばんどうろ')

# 戦闘背景（マップの設定）→ 地形。草むらの上なら草、洞窟の床なら洞窟…と足元で決まるので、陸の出現はこの対応で近似する
BG_LAND = {
    'PLAIN': 'grass', 'FOREST': 'grass', 'MOUNTAIN': 'grass', 'CITY': 'grass', 'SNOW': 'snow', 'WATER': 'grass',
    'INDOORS_1': 'building', 'INDOORS_2': 'building', 'INDOORS_3': 'building',
    'CAVE_1': 'cave', 'CAVE_2': 'cave', 'CAVE_3': 'cave',
}
HG_BG_LAND = {
    'GENERAL': 'grass', 'FOREST': 'grass', 'MOUNTAIN': 'grass', 'CITY': 'grass', 'SNOW': 'snow', 'OCEAN': 'grass',
    'BUILDING_1': 'building', 'BUILDING_2': 'building', 'BUILDING_3': 'building',
    'CAVE_1': 'cave', 'CAVE_2': 'cave', 'CAVE_3': 'cave',
}
PT_BG = ['PLAIN', 'WATER', 'CITY', 'FOREST', 'MOUNTAIN', 'SNOW', 'INDOORS_1', 'INDOORS_2', 'INDOORS_3', 'CAVE_1', 'CAVE_2', 'CAVE_3']
HG_BG_INDEX = {'GENERAL': 0, 'OCEAN': 1, 'CITY': 2, 'FOREST': 3, 'MOUNTAIN': 4, 'SNOW': 5, 'BUILDING_1': 6, 'BUILDING_2': 7, 'BUILDING_3': 8,
               'CAVE_1': 9, 'CAVE_2': 10, 'CAVE_3': 11}
DP_BG = ['PLAIN', 'WATER', 'CITY', 'FOREST', 'MOUNTAIN', 'SNOW', 'INDOORS_1', 'INDOORS_2', 'INDOORS_3', 'CAVE_1', 'CAVE_2', 'CAVE_3']

TOKENS = [
    (r'\blost tower\b', 'ロストタワー'), (r'\blow water\b', 'みずがひいたとき'), (r'\b(outside|exterior|mountainside)\b', 'そと'),
    (r'\b(inside|interior)\b', 'なか'), (r'\bnorthwest\b', 'ほくせい'), (r'\bnortheast\b', 'ほくとう'), (r'\bsouthwest\b', 'なんせい'),
    (r'\bsoutheast\b', 'なんとう'), (r'\bnorth\b', 'きた'), (r'\bsouth\b', 'みなみ'), (r'\beast\b', 'ひがし'), (r'\bwest\b', 'にし'),
    (r'\bdead ?end\b', 'いきどまり'), (r'\bpillar (\d)\b', r'はしら\1'), (r'\brooms? (\d)( and (\d))?\b', r'へや\1'), (r'\broom\b', 'へや'),
    (r'\bb(\d)f\b', r'B\1F'), (r'\b(\d)f\b', r'\1F'), (r'\bleft\b', 'ひだり'), (r'\bright\b', 'みぎ'), (r'\bback\b', 'おく'),
    (r'\bmiddle\b', 'まんなか'), (r'\bcorridor\b', 'ろうか'), (r'\bdining area\b', 'しょくどう'), (r'\bside\b', 'わき'),
    (r'\btunnel\b', 'トンネル'), (r'\bentrance\b', 'いりぐち'), (r'\bstage (\d)\b', r'\1'), (r'\bgiratina\b', 'ギラティナのへや'),
]


def sub_label(rest):
    s = ' ' + rest.replace('_', ' ').lower() + ' '
    for pat, rep in TOKENS:
        s = re.sub(pat, rep, s)
    words = [w for w in s.split() if not re.fullmatch(r'[a-z0-9]+', w)]
    return ' '.join(words)


def pt_location_names():
    """プラチナの地名表（日本版 ROM）を、英語版の地名 ID の並びで引けるようにする"""
    ids = [m['id'] for m in json.load(open(os.path.join(PT, 'res', 'text', 'location_names.json'), encoding='utf-8'))['messages']]
    banks = ndsx.narc('msgdata/pl_msg.narc')
    for b in banks:
        try:
            msgs = ndsx.decode_msg(b)
        except Exception:
            continue
        if len(msgs) == len(ids) and msgs[1] == 'フタバタウン':
            return {k: ndsx_jp(v) for k, v in zip(ids, msgs)}, msgs
    raise RuntimeError('地名表が見つかりません')


def ndsx_jp(s):
    return s.replace('－', 'ー')


def land_mons(slots, species_by_time, lv_of):
    """12枠の陸の出現。species_by_time は [朝, 昼, 夜] の各12枠"""
    out = {}
    for t in range(3):
        for k in range(12):
            d = species_by_time[t][k]
            if not d:
                continue
            lo, hi = lv_of(k)
            e = out.setdefault(d, [d, lo, hi, 0, 0, 0])
            e[1] = min(e[1], lo)
            e[2] = max(e[2], hi)
            e[3 + t] += slots[k]
    return sorted(out.values(), key=lambda m: (-max(m[3:]), m[0]))


def water_mons(slots, table, night=None):
    """table は (種族, 最低Lv, 最高Lv) の枠。night は夜だけ種族が入れ替わる {枠: 種族}"""
    out = {}
    for t in range(3):
        for k, (d, lo, hi) in enumerate(table):
            if t == 2 and night and k in night:
                d = night[k]
            if not d:
                continue
            e = out.setdefault(d, [d, lo, hi, 0, 0, 0])
            e[1] = min(e[1], lo)
            e[2] = max(e[2], hi)
            e[3 + t] += slots[k]
    return sorted(out.values(), key=lambda m: (-max(m[3:]), m[0]))


def special_mons(slots_idx, species, lv_of, rate_slots=LAND):
    """大量発生などで置き換わる枠だけを並べる（置き換わった枠の合計確率）"""
    out = {}
    for k, d in zip(slots_idx, species):
        if not d:
            continue
        lo, hi = lv_of(k)
        e = out.setdefault(d, [d, lo, hi, 0, 0, 0])
        e[1] = min(e[1], lo)
        e[2] = max(e[2], hi)
        for t in range(3):
            e[3 + t] += rate_slots[k]
    return list(out.values())


# 大量発生が起きる場所（Pt: swarm.c、DP: ov06_02251340、HGSS: unk_02097F6C.c の表。HGSSは 0=くさむら 1=なみのり 2=つり）
PT_SWARM = {'MAP_HEADER_' + x for x in ('ROUTE_201 ROUTE_202 ROUTE_203 ROUTE_206 ROUTE_207 ROUTE_208 ROUTE_209 ROUTE_214 ROUTE_215 ROUTE_217 '
            'ROUTE_218 ROUTE_221 ROUTE_222 ROUTE_224 ROUTE_225 ROUTE_226 ROUTE_227 ROUTE_228 ROUTE_229 ROUTE_230 VALLEY_WINDWORKS_OUTSIDE ETERNA_FOREST').split()}
DP_SWARM = {'MAP_' + x for x in ('ROUTE_201 ROUTE_202 ROUTE_203 ROUTE_206 ROUTE_207 ROUTE_208 ROUTE_209 ROUTE_213 ROUTE_214 ROUTE_215 ROUTE_216 '
            'ROUTE_217 ROUTE_218 ROUTE_221 ROUTE_222 ROUTE_224 ROUTE_225 ROUTE_226 ROUTE_227 ROUTE_228 ROUTE_229 ROUTE_230 LAKE_VERITY_GALACTIC '
            'LAKE_VALOR LAKE_ACUITY_GALACTIC VALLEY_WINDWORKS_EXTERIOR ETERNA_FOREST_INTERIOR FUEGO_IRONWORKS_EXTERIOR').split()}
HG_SWARM = {'MAP_ROUTE_1': 0, 'MAP_ROUTE_3': 0, 'MAP_ROUTE_9': 0, 'MAP_ROUTE_12': 2, 'MAP_ROUTE_13': 0, 'MAP_ROUTE_19': 1, 'MAP_ROUTE_32': 2,
            'MAP_ROUTE_25': 0, 'MAP_ROUTE_27': 1, 'MAP_ROUTE_34': 0, 'MAP_ROUTE_35': 0, 'MAP_ROUTE_38': 0, 'MAP_ROUTE_44': 2, 'MAP_ROUTE_45': 0,
            'MAP_ROUTE_47': 0, 'MAP_MOUNT_MORTAR_1F_ENTRANCE': 0, 'MAP_DARK_CAVE_ROUTE_31_SIDE': 0, 'MAP_VIRIDIAN_FOREST': 0, 'MAP_VERMILION': 1,
            'MAP_VIOLET': 2}

GBA = [('ruby', 'ルビー'), ('sapphire', 'サファイア'), ('emerald', 'エメラルド'), ('firered', 'ファイアレッド'), ('leafgreen', 'リーフグリーン')]


def sinnoh_tables(enc, dex, daily=None, swarm=False):
    """プラチナの JSON と同じ形の dict から、場所の出現一覧を作る。daily は 6・7枠を置き換える日替わりの候補"""
    out = []
    land = enc['land_encounters']
    if enc['land_rate']:
        base = [dex(x['species']) for x in land]
        day = list(base)
        night = list(base)
        day[2], day[3] = dex(enc['day'][0]), dex(enc['day'][1])
        night[2], night[3] = dex(enc['night'][0]), dex(enc['night'][1])
        lv = lambda k: (land[k]['level'], land[k]['level'])
        out.append(('land', '', land_mons(LAND, [base, day, night], lv)))
        for label, cands in (daily or {}).items():
            mons = [special_mons([6, 7], [d, d], lv)[0] for d in sorted(set(x for x in cands if x))]
            out.append(('land', label, mons))
        if swarm and any(enc['swarms']):
            out.append(('land', 'swarm', special_mons([0, 1], [dex(s) for s in enc['swarms']], lv)))
        if any(enc['radar']):
            out.append(('land', 'radar', special_mons([4, 5, 10, 11], [dex(s) for s in enc['radar']], lv)))
        for key, jp in GBA:
            sp = [dex(s) for s in enc[key]]
            if any(sp) and sp != base[8:10]:
                out.append(('land', 'gba_' + key, special_mons([8, 9], sp, lv)))
    for key, m, slots in (('surf', 'surf', SURF), ('old_rod', 'old', OLD_ROD_SINNOH), ('good_rod', 'good', ROD_SINNOH), ('super_rod', 'super', ROD_SINNOH)):
        if enc[key + '_rate']:
            t = [(dex(x['species']), x['level_min'], x['level_max']) for x in enc[key + '_encounters']]
            out.append((m, '', water_mons(slots, t)))
    return out


def dp_bin_to_json(b):
    """DP の出現データ（424バイト）をプラチナの JSON と同じ形にする"""
    o = {}
    o['land_rate'] = struct.unpack_from('<i', b, 0)[0]
    o['land_encounters'] = [{'level': struct.unpack_from('<b', b, 4 + k * 8)[0], 'species': struct.unpack_from('<i', b, 8 + k * 8)[0]} for k in range(12)]
    ints = lambda off, n: list(struct.unpack_from('<%di' % n, b, off))
    o['swarms'] = ints(100, 2)
    o['day'] = ints(108, 2)
    o['night'] = ints(116, 2)
    o['radar'] = ints(124, 4)
    for i, (key, _) in enumerate(GBA):
        o[key] = ints(164 + i * 8, 2)
    for i, key in enumerate(['surf', 'unused', 'old_rod', 'good_rod', 'super_rod']):
        off = 204 + i * 44
        o[key + '_rate'] = struct.unpack_from('<i', b, off)[0]
        o[key + '_encounters'] = [{'level_max': b[off + 4 + k * 8], 'level_min': b[off + 5 + k * 8], 'species': struct.unpack_from('<i', b, off + 8 + k * 8)[0]} for k in range(5)]
    return o


def finish(locs):
    """同じ地名で出現が同じものはまとめ、違うものだけ区別の名前を残す"""
    groups = {}
    for L in locs:
        key = (L['n'], L['m'], L.get('cond', ''), json.dumps(L['mons']))
        g = groups.get(key)
        if g:
            g['subs'].append(L['s'])
        else:
            L['subs'] = [L['s']]
            groups[key] = L
    merged = list(groups.values())
    byname = {}
    for L in merged:
        byname.setdefault((L['n'], L['m'], L.get('cond', '')), []).append(L)
    for (n, m, c), ls in byname.items():
        if len(ls) == 1:
            ls[0]['s'] = ''
        else:
            for i, L in enumerate(ls):
                subs = [s for s in L['subs'] if s]
                subs = list(dict.fromkeys(subs))
                L['s'] = (subs[0] + 'など' if len(subs) > 2 else '・'.join(subs)) if subs else ''
    for L in merged:
        del L['subs']
    return merged


def build_sinnoh(game, CONST_TO_DEX, dailies):
    """dailies は {'marsh': {'daily_local': [...], 'daily_natdex': [...]}, 'garden': {...}}"""
    names, _ = pt_location_names()
    pick_daily = lambda key: dailies['marsh'] if 'GREAT_MARSH' in key.upper() else dailies['garden'] if 'TROPHY_GARDEN' in key.upper() else None
    locs = []
    if game == 'Pt':
        s = open(os.path.join(PT, 'include', 'data', 'map_headers.h'), encoding='utf-8').read()
        for mapname, b in re.findall(r'\[(MAP_HEADER_\w+)\]\s*=\s*\{(.*?)\n    \},', s, re.S):
            m = re.search(r'wildEncountersArchiveID\s*=\s*(encounters_\w+)', b)
            if not m:
                continue
            lab = re.search(r'mapLabelTextID\s*=\s*(\w+)', b).group(1)
            bg = re.search(r'battleBG\s*=\s*BACKGROUND_(\w+)', b).group(1)
            enc = json.load(open(os.path.join(PT, 'res', 'field', 'encounters', m.group(1) + '.json'), encoding='utf-8'))
            dex = lambda c: CONST_TO_DEX.get(c, 0)
            name = names[lab]
            rest = mapname.replace('MAP_HEADER_', '')
            rest = rest[len(re.sub(r'^LocationNames_Text_', '', lab)):] if False else rest
            yield_tables(locs, game, name, rest, bg, sinnoh_tables(enc, dex, pick_daily(m.group(1)), mapname in PT_SWARM), m.group(1))
    else:
        s = open(os.path.join(DP, 'arm9', 'src', 'map_header.c'), encoding='utf-8').read()
        sec = {}
        for l in open(os.path.join(DP, 'include', 'constants', 'map_sections.h'), encoding='utf-8'):
            mm = re.match(r'#define (MAPSEC_\w+)\s+(\d+)', l)
            if mm:
                sec[mm.group(1)] = int(mm.group(2))
        ids = [m['id'] for m in json.load(open(os.path.join(PT, 'res', 'text', 'location_names.json'), encoding='utf-8'))['messages']]
        folder = 'd_enc_data' if game == 'D' else 'p_enc_data'
        for m in re.finditer(r'ENCDATA\(NARC_d_enc_data_narc_(\d+)_bin, NARC_p_enc_data_narc_(\d+)_bin\), \w+, (MAPSEC_\w+), (\d+), (\d+), (\d+), (\d+),.*?// (MAP_\w+)', s):
            idx = int(m.group(1) if game == 'D' else m.group(2))
            b = open(os.path.join(DP, 'files', 'fielddata', 'encountdata', folder, 'narc_%04d.bin' % idx), 'rb').read()
            enc = dp_bin_to_json(b)
            dex = lambda c: c if isinstance(c, int) and 0 < c <= 493 else 0
            name = names[ids[sec[m.group(3)]]]
            bg = DP_BG[int(m.group(7))]
            yield_tables(locs, game, name, m.group(8).replace('MAP_', ''), bg, sinnoh_tables(enc, dex, pick_daily(m.group(8)), m.group(8) in DP_SWARM), m.group(8))
    return finish(locs)


def yield_tables(locs, game, name, mapname, bg, tables, key):
    rest = sub_label(mapname)
    for method, cond, mons in tables:
        if not mons:
            continue
        if method == 'land':
            terrain = BG_LAND.get(bg, 'grass')
        else:
            terrain = 'water'
        # 背景はマップの設定。なみのり中は水の背景になる（SetBackgroundAndTerrain）
        L = {'n': name, 's': rest, 'm': method, 'bg': terrain, 'bb': 1 if method == 'surf' else PT_BG.index(bg) if bg in PT_BG else 0, 'mons': mons}
        if cond:
            L['cond'] = cond
        if 'GREAT_MARSH' in key.upper():
            L['safari'] = True
            L['bg'] = 'marsh' if method == 'land' else 'water'
            m = re.search(r'(\d)$', key)
            if m:
                L['s'] = 'エリア' + m.group(1)
        # ポケトレは草むらでしか使えない（大湿原・洞窟・建物は除く）
        if cond == 'radar' and (L.get('safari') or terrain != 'grass'):
            continue
        locs.append(L)


def build_hgss(game, CONST_TO_DEX):
    ver = 'HEARTGOLD' if game == 'HG' else 'SOULSILVER'
    pick = lambda v: v[ver] if isinstance(v, dict) and ver in v else v
    dex = lambda c: CONST_TO_DEX.get(pick(c), 0)
    lvmin = lambda x: pick(pick(x['level'])['min'])
    lvmax = lambda x: pick(pick(x['level'])['max'])
    E = json.load(open(os.path.join(HG, 'files', 'fielddata', 'encountdata', 'gs_enc_data.json'), encoding='utf-8'))['encounters']
    by_code = {e['map']: e for e in E}
    s = open(os.path.join(HG, 'src', 'data', 'map_headers.h'), encoding='utf-8').read()
    sec = {}
    for l in open(os.path.join(HG, 'include', 'constants', 'map_sections.h'), encoding='utf-8'):
        mm = re.match(r'#define (MAPSEC_\w+)\s+(\d+)', l)
        if mm:
            sec[mm.group(1)] = int(mm.group(2))
    _, pt_msgs = pt_location_names()
    locs = []
    seen = set()
    for mapname, b in re.findall(r'\[(MAP_\w+)\]\s*=\s*\{(.*?)\n\s*\},', s, re.S):
        m = re.search(r'wildEncounterBank\s*=\s*ENCDATA_(\w+)', b)
        if not m or m.group(1) == 'NA' or m.group(1) not in by_code or m.group(1) in seen:
            continue
        seen.add(m.group(1))
        e = by_code[m.group(1)]
        sid = sec[re.search(r'mapsec\s*=\s*(\w+)', b).group(1)]
        name = HGSS_JP.get(sid) or ndsx_jp(pt_msgs[sid])
        bg = re.search(r'battleBg\s*=\s*BATTLE_BG_(\w+)', b).group(1)
        rest = mapname.replace('MAP_', '')
        tables = []
        land = e['land']
        if land['rate']:
            mons = land['mons']
            sp = [[dex(x['species'][t]) for x in mons] for t in ('morn', 'day', 'nite')]
            lv = lambda k: (pick(mons[k]['level']), pick(mons[k]['level']))
            tables.append(('land', '', land_mons(LAND, sp, lv)))
            sw = dex(e['swarm'][0])
            if sw and HG_SWARM.get(mapname) == 0:
                tables.append(('land', 'swarm', special_mons([0, 1], [sw, sw], lv)))
            for key in ('hoenn', 'sinnoh'):
                ss = [dex(x) for x in e[key]]
                if any(ss):
                    tables.append(('land', key, special_mons([2, 3, 4, 5][:len(ss) * 2], [x for x in ss for _ in (0, 1)], lv)))
        for key, meth, slots in (('surf', 'surf', SURF), ('rock_smash', 'rock', ROCK_JOHTO)):
            if e[key]['rate']:
                t = [(dex(x['species']), lvmin(x), lvmax(x)) for x in e[key]['mons']]
                tables.append((meth, '', water_mons(slots, t)))
                sw = dex(e['swarm'][1])
                if meth == 'surf' and sw and HG_SWARM.get(mapname) == 1:
                    tables.append((meth, 'swarm', special_mons([0], [sw], lambda k, t=t: t[k][1:], SURF)))
        # 夜はいいつりざおの4枠目・すごいつりざおの2枠目が別の種族になる（ov02_02246AD4）
        night_fish = dex(e['swarm'][2])
        for key, meth, nslot, sw_slots in (('old_rod', 'old', None, [2]), ('good_rod', 'good', 3, [0, 2, 3]), ('super_rod', 'super', 1, [0, 1, 2, 3, 4])):
            f = e['fishing'][key]
            if f['rate']:
                t = [(dex(x['species']), lvmin(x), lvmax(x)) for x in f['mons']]
                tables.append((meth, '', water_mons(ROD_JOHTO, t, {nslot: night_fish} if nslot is not None and night_fish else None)))
                sw = dex(e['swarm'][3])
                if sw and HG_SWARM.get(mapname) == 2:
                    tables.append((meth, 'swarm', special_mons(sw_slots, [sw] * len(sw_slots), lambda k, t=t: t[k][1:], ROD_JOHTO)))
        for method, cond, mons in tables:
            if not mons:
                continue
            terrain = HG_BG_LAND.get(bg, 'grass') if method in ('land', 'rock') else 'water'
            if method == 'rock':
                terrain = 'cave' if bg.startswith('CAVE') else 'grass'
            L = {'n': name, 's': sub_label(rest), 'm': method, 'bg': terrain, 'bb': 1 if method == 'surf' else HG_BG_INDEX.get(bg, 0), 'mons': mons}
            if cond:
                L['cond'] = cond
            locs.append(L)
    return finish(locs)
