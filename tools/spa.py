# SPL のパーティクル資料（.spa）を読む（pokeplatinum lib/spl の構造体どおり）
import struct


def bits(v, lo, n):
    return (v >> lo) & ((1 << n) - 1)


def s16(v):
    return v - 0x10000 if v >= 0x8000 else v


def parse(data):
    magic, version, res_count, tex_count, _, res_size, tex_size, tex_offset, _ = struct.unpack_from('<IIHHIIIII', data, 0)
    off = 0x20
    resources = []
    for _ in range(res_count):
        h = {}
        flags, bx, by, bz, count, radius, length, ax, ay, az, color, vpos, vaxis, scale, aspect, delay, rmin, rmax, angle, _, elife, plife, ratt, m0, m1, m2, polyx, polyy, user = \
            struct.unpack_from('<IiiiiiihhhHiiihHhhHHHHIIIIhhI', data, off)
        off += 88
        f = {
            'emissionType': bits(flags, 0, 4), 'drawType': bits(flags, 4, 2), 'circleAxis': bits(flags, 6, 2),
            'hasScaleAnim': bits(flags, 8, 1), 'hasColorAnim': bits(flags, 9, 1), 'hasAlphaAnim': bits(flags, 10, 1),
            'hasTexAnim': bits(flags, 11, 1), 'hasRotation': bits(flags, 12, 1), 'randomInitAngle': bits(flags, 13, 1),
            'selfMaintaining': bits(flags, 14, 1), 'followEmitter': bits(flags, 15, 1), 'hasChildResource': bits(flags, 16, 1),
            'polygonRotAxis': bits(flags, 17, 2), 'polygonReferencePlane': bits(flags, 19, 1), 'randomizeLoopedAnim': bits(flags, 20, 1),
            'drawChildrenFirst': bits(flags, 21, 1), 'hideParent': bits(flags, 22, 1), 'useViewSpace': bits(flags, 23, 1),
            'gravity': bits(flags, 24, 1), 'random': bits(flags, 25, 1), 'magnet': bits(flags, 26, 1), 'spin': bits(flags, 27, 1),
            'collision': bits(flags, 28, 1), 'convergence': bits(flags, 29, 1),
        }
        h.update(flags=f, basePos=[bx, by, bz], emissionCount=count, radius=radius, length=length, axis=[ax, ay, az], color=color,
                 initVelPos=vpos, initVelAxis=vaxis, baseScale=scale, aspect=aspect, startDelay=delay, minRot=rmin, maxRot=rmax,
                 initAngle=angle, emitterLife=elife, particleLife=plife,
                 attScale=bits(ratt, 0, 8), attLife=bits(ratt, 8, 8), attVel=bits(ratt, 16, 8),
                 interval=bits(m0, 0, 8), baseAlpha=bits(m0, 8, 8), air=bits(m0, 16, 8), texture=bits(m0, 24, 8),
                 loopFrames=bits(m1, 0, 8), tileS=bits(m1, 24, 2), tileT=bits(m1, 26, 2), scaleDir=bits(m1, 28, 3),
                 flipS=bits(m2, 0, 1), flipT=bits(m2, 1, 1), polyX=polyx, polyY=polyy)
        r = {'h': h}
        if f['hasScaleAnim']:
            a, b, c, curve, fl, _ = struct.unpack_from('<hhhHHH', data, off); off += 12
            r['scale'] = {'start': a, 'mid': b, 'end': c, 'in': curve & 255, 'out': curve >> 8, 'loop': fl & 1}
        if f['hasColorAnim']:
            a, b, curve, fl, _ = struct.unpack_from('<HHIHH', data, off); off += 12
            r['color'] = {'start': a, 'end': b, 'in': bits(curve, 0, 8), 'peak': bits(curve, 8, 8), 'out': bits(curve, 16, 8),
                          'random': fl & 1, 'loop': (fl >> 1) & 1, 'interp': (fl >> 2) & 1}
        if f['hasAlphaAnim']:
            al, fl, curve, _ = struct.unpack_from('<HHHH', data, off); off += 8
            r['alpha'] = {'start': bits(al, 0, 5), 'mid': bits(al, 5, 5), 'end': bits(al, 10, 5), 'rand': fl & 255, 'loop': (fl >> 8) & 1,
                          'in': curve & 255, 'out': curve >> 8}
        if f['hasTexAnim']:
            tex = list(data[off:off + 8]); prm, = struct.unpack_from('<I', data, off + 8); off += 12
            r['tex'] = {'frames': tex, 'count': bits(prm, 0, 8), 'step': bits(prm, 8, 8), 'random': bits(prm, 16, 1), 'loop': bits(prm, 17, 1)}
        if f['hasChildResource']:
            cf, vmag, escale, life, vr, sr, color, m0, m1 = struct.unpack_from('<HhhHBBHII', data, off); off += 20
            r['child'] = {'usesBehaviors': bits(cf, 0, 1), 'hasScaleAnim': bits(cf, 1, 1), 'hasAlphaAnim': bits(cf, 2, 1),
                          'rotType': bits(cf, 3, 2), 'followEmitter': bits(cf, 5, 1), 'useChildColor': bits(cf, 6, 1), 'drawType': bits(cf, 7, 2),
                          'velMag': vmag, 'endScale': escale, 'life': life, 'velRatio': vr, 'scaleRatio': sr, 'color': color,
                          'count': bits(m0, 0, 8), 'delay': bits(m0, 8, 8), 'interval': bits(m0, 16, 8), 'texture': bits(m0, 24, 8),
                          'tileS': bits(m1, 0, 2), 'tileT': bits(m1, 2, 2), 'flipS': bits(m1, 4, 1), 'flipT': bits(m1, 5, 1)}
        beh = []
        if f['gravity']:
            x, y, z, _ = struct.unpack_from('<hhhH', data, off); off += 8
            beh.append({'type': 'gravity', 'v': [x, y, z]})
        if f['random']:
            x, y, z, iv = struct.unpack_from('<hhhH', data, off); off += 8
            beh.append({'type': 'random', 'v': [x, y, z], 'interval': iv})
        if f['magnet']:
            x, y, z, force, _ = struct.unpack_from('<iiihH', data, off); off += 16
            beh.append({'type': 'magnet', 'v': [x, y, z], 'force': force})
        if f['spin']:
            ang, axis = struct.unpack_from('<HH', data, off); off += 4
            beh.append({'type': 'spin', 'angle': ang, 'axis': axis})
        if f['collision']:
            y, el, t = struct.unpack_from('<ihH', data, off); off += 8
            beh.append({'type': 'collision', 'y': y, 'elasticity': el, 'kind': t & 3})
        if f['convergence']:
            x, y, z, force, _ = struct.unpack_from('<iiihH', data, off); off += 16
            beh.append({'type': 'convergence', 'v': [x, y, z], 'force': force})
        r['behaviors'] = beh
        resources.append(r)
    assert off == tex_offset, (off, tex_offset)
    textures = []
    for _ in range(tex_count):
        tid, prm, tsize, poff, psize, _, _, rsize = struct.unpack_from('<IIIIIIII', data, off)
        textures.append({'param': prm, 'format': bits(prm, 0, 4), 'w': 8 << bits(prm, 4, 4), 'h': 8 << bits(prm, 8, 4),
                         'repeat': bits(prm, 12, 2), 'flip': bits(prm, 14, 2), 'color0': bits(prm, 16, 1),
                         'shared': bits(prm, 17, 1), 'sharedId': bits(prm, 18, 8),
                         'data': bytes(data[off + 32:off + 32 + tsize]), 'pal': bytes(data[off + poff:off + poff + psize])})
        off += rsize
    return resources, textures


def rgb555(c):
    return ((c & 31) * 255 // 31, ((c >> 5) & 31) * 255 // 31, ((c >> 10) & 31) * 255 // 31)


def decode_texture(t, textures):
    """RGBA のバイト列を返す"""
    if t['shared']:
        src = textures[t['sharedId']]
        d, fmt = src['data'], src['format']
    else:
        d, fmt = t['data'], t['format']
    w, h = t['w'], t['h']
    pal = [rgb555(struct.unpack_from('<H', t['pal'], i)[0]) for i in range(0, len(t['pal']) - 1, 2)]
    out = bytearray(w * h * 4)

    def put(i, c, a):
        out[i * 4:i * 4 + 4] = bytes((c[0], c[1], c[2], a))
    for i in range(w * h):
        if fmt == 1:  # A3I5
            v = d[i]
            idx, a = v & 31, v >> 5
            put(i, pal[idx] if idx < len(pal) else (0, 0, 0), (a * 4 + a // 2) * 255 // 31)
        elif fmt == 6:  # A5I3
            v = d[i]
            idx, a = v & 7, v >> 3
            put(i, pal[idx] if idx < len(pal) else (0, 0, 0), a * 255 // 31)
        elif fmt == 2:  # 4色
            idx = (d[i >> 2] >> ((i & 3) * 2)) & 3
            put(i, pal[idx] if idx < len(pal) else (0, 0, 0), 0 if (idx == 0 and t['color0']) else 255)
        elif fmt == 3:  # 16色
            idx = (d[i >> 1] >> ((i & 1) * 4)) & 15
            put(i, pal[idx] if idx < len(pal) else (0, 0, 0), 0 if (idx == 0 and t['color0']) else 255)
        elif fmt == 4:  # 256色
            idx = d[i]
            put(i, pal[idx] if idx < len(pal) else (0, 0, 0), 0 if (idx == 0 and t['color0']) else 255)
        elif fmt == 7:  # ダイレクト
            v = struct.unpack_from('<H', d, i * 2)[0]
            put(i, rgb555(v), 255 if v & 0x8000 else 0)
        else:
            raise ValueError('texture format %d' % fmt)
    return bytes(out)
