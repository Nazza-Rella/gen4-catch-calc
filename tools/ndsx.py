# 日本版プラチナ ROM から素材を取り出すための小道具（NARC・メッセージ・画像形式の読み書き）
import os
import struct
import ndspy.rom
import ndspy.narc
from PIL import Image

ROM_PATH = r'C:\Users\mutk0\Desktop\ポケモン\プログラム開発\ゲーム関連\4世代\PokemonRngLab\roms\Platinum.nds'
DECOMP = r'C:\Users\mutk0\Desktop\ポケモン\逆アセ'
PT = os.path.join(DECOMP, 'pokeplatinum')
HG = os.path.join(DECOMP, 'pokeheartgold')
DP = os.path.join(DECOMP, 'pokediamond')

_rom = None


def rom():
    global _rom
    if _rom is None:
        _rom = ndspy.rom.NintendoDSRom.fromFile(ROM_PATH)
    return _rom


def narc(path):
    return ndspy.narc.NARC(rom().getFileByName(path)).files


# ---- メッセージ ----
_charmap = None


def charmap():
    global _charmap
    if _charmap is None:
        _charmap = {}
        for line in open(os.path.join(PT, 'tools', 'msgenc', 'charmap.txt'), encoding='utf-8'):
            line = line.rstrip('\n')
            if not line or line.lstrip().startswith('//') or '=' not in line:
                continue
            code, ch = line.split('=', 1)
            try:
                _charmap.setdefault(int(code.strip(), 16), ch)
            except ValueError:
                pass
    return _charmap


def decode_msg(data):
    """メッセージバンクを文字列の配列にする。制御コードは {XXXX,...} の形で残す"""
    count, seed = struct.unpack_from('<HH', data, 0)
    cm = charmap()
    out = []
    for i in range(count):
        key = (seed * 0x2FD * (i + 1)) & 0xFFFF
        key32 = key | (key << 16)
        off, ln = struct.unpack_from('<II', data, 4 + i * 8)
        off ^= key32
        ln ^= key32
        k = (0x91BD3 * (i + 1)) & 0xFFFF
        chars = []
        for j in range(ln):
            c = struct.unpack_from('<H', data, off + j * 2)[0] ^ k
            k = (k + 0x493D) & 0xFFFF
            chars.append(c)
        s = []
        j = 0
        while j < len(chars):
            c = chars[j]
            if c == 0xFFFF:
                break
            if c == 0xFFFE:
                cmd = chars[j + 1]
                n = chars[j + 2]
                args = chars[j + 3:j + 3 + n]
                s.append('{%04X%s}' % (cmd, ''.join(',%d' % a for a in args)))
                j += 3 + n
                continue
            if c == 0xE000:
                s.append('\n')
            elif c == 0x25BC:
                s.append('\f')
            elif c == 0x25BD:
                s.append('\r')
            else:
                s.append(cm.get(c, '{?%04X}' % c))
            j += 1
        out.append(''.join(s))
    return out


_banks = None


def text_bank(name):
    """generated/text_banks.txt の並び順で pl_msg.narc から取り出す"""
    global _banks
    if _banks is None:
        names = [l.strip() for l in open(os.path.join(PT, 'generated', 'text_banks.txt'), encoding='utf-8') if l.strip()]
        _banks = {n.replace('TEXT_BANK_', '').lower(): i for i, n in enumerate(names)}
    return decode_msg(narc('msgdata/pl_msg.narc')[_banks[name]])


# ---- 圧縮 ----
def lz_decompress(d):
    t = d[0]
    size = d[1] | d[2] << 8 | d[3] << 16
    i = 4
    out = bytearray()
    while len(out) < size:
        flags = d[i]
        i += 1
        for b in range(8):
            if len(out) >= size:
                break
            if flags & (0x80 >> b):
                if t == 0x10:
                    v = d[i] << 8 | d[i + 1]
                    i += 2
                    ln, disp = (v >> 12) + 3, (v & 0xFFF) + 1
                else:
                    ind = d[i] >> 4
                    if ind == 0:
                        ln = (((d[i] & 0xF) << 4) | (d[i + 1] >> 4)) + 0x11
                        disp = (((d[i + 1] & 0xF) << 8) | d[i + 2]) + 1
                        i += 3
                    elif ind == 1:
                        ln = (((d[i] & 0xF) << 12) | (d[i + 1] << 4) | (d[i + 2] >> 4)) + 0x111
                        disp = (((d[i + 2] & 0xF) << 8) | d[i + 3]) + 1
                        i += 4
                    else:
                        ln = ind + 1
                        disp = (((d[i] & 0xF) << 8) | d[i + 1]) + 1
                        i += 2
                for _ in range(ln):
                    out.append(out[-disp])
            else:
                out.append(d[i])
                i += 1
    return bytes(out)


def maybe_lz(d):
    if d[:1] in (b'\x10', b'\x11'):
        try:
            return lz_decompress(d)
        except Exception:
            pass
    return d


# ---- Nitro 画像形式 ----
def _sections(d):
    """RLCN などの共通ヘッダの後ろのブロックを {名前: 中身} で返す"""
    hsize = struct.unpack_from('<H', d, 12)[0]
    nblk = struct.unpack_from('<H', d, 14)[0]
    i = hsize
    out = {}
    for _ in range(nblk):
        name = d[i:i + 4][::-1].decode('latin1')
        size = struct.unpack_from('<I', d, i + 4)[0]
        out[name] = d[i + 8:i + size]
        i += size
    return out


def nclr(d):
    """16色ずつのパレットの配列"""
    d = maybe_lz(d)
    s = _sections(d)['PLTT']
    bpp_flag, _, size, off = struct.unpack_from('<IIII', s, 0)
    raw = s[off - 8 + 8:][:size] if off == 0x10 else s[16:16 + size]
    cols = []
    for k in range(len(raw) // 2):
        v = struct.unpack_from('<H', raw, k * 2)[0]
        cols.append(((v & 31) * 255 // 31, (v >> 5 & 31) * 255 // 31, (v >> 10 & 31) * 255 // 31))
    return [cols[i:i + 16] for i in range(0, len(cols), 16)]


def ncgr(d):
    """(タイル配列, 横タイル数, bpp) を返す。タイルはピクセル値の 64 要素の配列"""
    d = maybe_lz(d)
    s = _sections(d)['CHAR']
    h, w, bppf = struct.unpack_from('<HHI', s, 0)
    mapping, fmt, size, off = struct.unpack_from('<IIII', s, 8)
    raw = s[0x18:0x18 + size]
    bpp = 4 if bppf == 3 else 8
    tiles = []
    if fmt & 0xFF:  # 線形（タイルでない）ビットマップ
        pix = []
        for b in raw:
            if bpp == 4:
                pix += [b & 15, b >> 4]
            else:
                pix.append(b)
        return {'linear': True, 'pix': pix, 'w': w, 'h': h, 'bpp': bpp}
    step = 32 if bpp == 4 else 64
    for t in range(len(raw) // step):
        tile = []
        for b in raw[t * step:(t + 1) * step]:
            if bpp == 4:
                tile += [b & 15, b >> 4]
            else:
                tile.append(b)
        tiles.append(tile)
    return {'linear': False, 'tiles': tiles, 'w': w if w != 0xFFFF else 0, 'h': h, 'bpp': bpp}


def nscr(d):
    d = maybe_lz(d)
    s = _sections(d)['SCRN']
    w, h, _, size = struct.unpack_from('<HHII', s, 0)
    raw = s[12:12 + size]
    ents = [struct.unpack_from('<H', raw, k * 2)[0] for k in range(len(raw) // 2)]
    return {'w': w, 'h': h, 'map': ents}


def render_screen(chr_, pals, scr, transparent0=False):
    W, H = scr['w'], scr['h']
    im = Image.new('RGBA', (W, H))
    px = im.load()
    tw = W // 8
    for n, e in enumerate(scr['map']):
        # 幅や高さが 256 を超える面は 32x32 マスの区画ごとに並んでいる
        blk, k = n // 1024, n % 1024
        bw = max(1, W // 256)
        tx = (blk % bw) * 32 + k % 32 if W > 256 else n % tw
        ty = (blk // bw) * 32 + k // 32 if W > 256 else n // tw
        if ty * 8 >= H:
            break
        tile = chr_['tiles'][e & 0x3FF] if (e & 0x3FF) < len(chr_['tiles']) else [0] * 64
        hf, vf, pal = e >> 10 & 1, e >> 11 & 1, e >> 12
        for y in range(8):
            for x in range(8):
                v = tile[(7 - y if vf else y) * 8 + (7 - x if hf else x)]
                if chr_['bpp'] == 4:
                    c = pals[pal][v] if pal < len(pals) else (255, 0, 255)
                else:
                    flat = [c for p in pals for c in p]
                    c = flat[v] if v < len(flat) else (255, 0, 255)
                a = 0 if (transparent0 and v == 0) else 255
                px[tx * 8 + x, ty * 8 + y] = c + (a,)
    return im


OAM_SIZE = {(0, 0): (8, 8), (0, 1): (16, 16), (0, 2): (32, 32), (0, 3): (64, 64),
            (1, 0): (16, 8), (1, 1): (32, 8), (1, 2): (32, 16), (1, 3): (64, 32),
            (2, 0): (8, 16), (2, 1): (8, 32), (2, 2): (16, 32), (2, 3): (32, 64)}


def ncer(d):
    """セル（OAM の組み合わせ）の一覧。各セルは (x, y, w, h, tile, hflip, vflip, pal) の配列"""
    d = maybe_lz(d)
    s = _sections(d)['CEBK']
    n, attr, off = struct.unpack_from('<HHI', s, 0)
    mapping = struct.unpack_from('<I', s, 8)[0]
    step = 16 if attr & 1 else 8
    cells = []
    base = off
    oam_base = off + n * step
    for c in range(n):
        noam, _, ooff = struct.unpack_from('<HHI', s, base + c * step)
        objs = []
        for k in range(noam):
            a0, a1, a2 = struct.unpack_from('<HHH', s, oam_base + ooff + k * 6)
            y = a0 & 0xFF
            y = y - 256 if y >= 128 else y
            x = a1 & 0x1FF
            x = x - 512 if x >= 256 else x
            w, h = OAM_SIZE[(a0 >> 14, a1 >> 14)]
            objs.append((x, y, w, h, (a2 & 0x3FF) << (mapping & 3), bool(a1 & 0x1000), bool(a1 & 0x2000), a2 >> 12))
        cells.append(objs)
    return cells


def render_cell(chr_, pal, objs, ox=0, oy=0, W=256, H=256):
    """1D マッピングの NCGR をセルの OAM どおりに並べる"""
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = im.load()
    tiles = chr_['tiles']
    for x0, y0, w, h, t0, hf, vf, _ in objs:
        tw = w // 8
        for ty in range(h // 8):
            for tx in range(tw):
                t = t0 + ty * tw + tx
                if t >= len(tiles):
                    continue
                for y in range(8):
                    for x in range(8):
                        v = tiles[t][y * 8 + x]
                        if not v:
                            continue
                        X = tx * 8 + x
                        Y = ty * 8 + y
                        if hf:
                            X = w - 1 - X
                        if vf:
                            Y = h - 1 - Y
                        X += x0 + ox
                        Y += y0 + oy
                        if 0 <= X < W and 0 <= Y < H:
                            px[X, Y] = pal[v] + (255,)
    return im


def tiles_image(chr_, pal, tiles_w=None, transparent0=True):
    """NCGR のタイルを横 tiles_w 枚で並べた画像"""
    tiles = chr_['tiles']
    tw = tiles_w or chr_['w'] or 32
    th = (len(tiles) + tw - 1) // tw
    im = Image.new('RGBA', (tw * 8, th * 8), (0, 0, 0, 0))
    px = im.load()
    for t, tile in enumerate(tiles):
        ox, oy = t % tw * 8, t // tw * 8
        for k, v in enumerate(tile):
            if transparent0 and v == 0:
                continue
            px[ox + k % 8, oy + k // 8] = pal[v] + (255,)
    return im
