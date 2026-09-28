# 日本版プラチナの SDAT から、捕獲の場面で鳴る効果音と曲を WAV に書き出す（DS の音源の動きをまねた簡易再生器）
import math
import os
import struct
import wave

import ndspy.soundArchive as SA
import ndspy.soundBank as SB
import ndspy.soundSequence as SS

import ndsx

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'build', 'sfx')
os.makedirs(OUT, exist_ok=True)
RATE = 22050

sdat = SA.SDAT(ndsx.rom().getFileByName('data/sound/pl_sound_data.sdat'))
SEQS = dict(sdat.sequences)
BANKS = sdat.banks
WARCS = sdat.waveArchives

# 0〜127 の値を 0.1dB 単位の減衰に（DS の変換表の近似）
def cnv(x):
    if x <= 0:
        return -723
    return max(-723, int(round(400 * math.log10(x / 127))))


ATTACK_TABLE = [0x00, 0x01, 0x05, 0x0E, 0x1A, 0x26, 0x33, 0x3F, 0x49, 0x54, 0x5C, 0x64, 0x6D, 0x74, 0x7B, 0x7F, 0x84, 0x89, 0x8F]


def attack_rate(a):
    return 0xFF - a if a < 0x6D else ATTACK_TABLE[0x7F - a]


def decay_rate(x):
    if x == 0x7F:
        return 0xFFFF
    if x == 0x7E:
        return 0x3C00
    if x < 0x32:
        return x * 2 + 1
    return 0x1E00 // (0x7E - x)


IMA_INDEX = [-1, -1, -1, -1, 2, 4, 6, 8]
IMA_STEP = [7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45, 50, 55, 60, 66, 73, 80, 88, 97, 107, 118, 130, 143,
            157, 173, 190, 209, 230, 253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963, 1060, 1166, 1282, 1411,
            1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327, 3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493,
            10442, 11487, 12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767]

_wave_cache = {}


def samples(warc_id, wave_id):
    """波形を -1〜1 の配列にする。戻り値は (データ, サンプリング周波数, ループ開始, ループするか)"""
    key = (warc_id, wave_id)
    if key in _wave_cache:
        return _wave_cache[key]
    sw = WARCS[warc_id][1].waves[wave_id]
    d = sw.data
    out = []
    if sw.waveType == 0:
        out = [(b - 256 if b >= 128 else b) / 128 for b in d]
        loop = sw.loopOffset * 4
    elif sw.waveType == 1:
        out = [struct.unpack_from('<h', d, i)[0] / 32768 for i in range(0, len(d) - 1, 2)]
        loop = sw.loopOffset * 2
    else:
        pred, idx = struct.unpack_from('<hB', d, 0)
        idx = min(88, idx)
        for b in d[4:]:
            for nib in (b & 15, b >> 4):
                step = IMA_STEP[idx]
                diff = step >> 3
                if nib & 1:
                    diff += step >> 2
                if nib & 2:
                    diff += step >> 1
                if nib & 4:
                    diff += step
                if nib & 8:
                    pred = max(-32768, pred - diff)
                else:
                    pred = min(32767, pred + diff)
                idx = min(88, max(0, idx + IMA_INDEX[nib & 7]))
                out.append(pred / 32768)
        loop = (sw.loopOffset - 1) * 8 if sw.loopOffset else 0
    res = (out, sw.sampleRate, max(0, loop), sw.isLooped)
    _wave_cache[key] = res
    return res


def note_def(bank, program, key):
    inst = bank.instruments[program] if program < len(bank.instruments) else None
    if inst is None:
        return None
    if isinstance(inst, SB.SingleNoteInstrument):
        return inst.noteDefinition
    if isinstance(inst, SB.RangeInstrument):
        i = key - inst.firstPitch
        if 0 <= i < len(inst.noteDefinitions):
            return inst.noteDefinitions[i]
        return None
    if isinstance(inst, SB.RegionalInstrument):
        for r in inst.regions:
            if key <= r.lastPitch:
                return r.noteDefinition
    return None


class Voice:
    def __init__(self, nd, bank, key, vel, length, track, t0):
        self.nd = nd
        self.key = key
        self.vel = vel
        self.len = length  # ティック（残り）
        self.track = track
        self.env = -92544
        self.stage = 0  # 0=アタック 1=ディケイ 2=サステイン 3=リリース
        a = track.attack if track.attack is not None else nd.attack
        dcy = track.decay if track.decay is not None else nd.decay
        sus = track.sustain if track.sustain is not None else nd.sustain
        rel = track.release if track.release is not None else nd.release
        self.ar = attack_rate(a)
        self.dr = decay_rate(dcy)
        self.sl = cnv(sus) << 7
        self.rr = decay_rate(rel)
        self.pos = 0.0
        self.noise = 0x7FFF
        self.phase = 0.0
        self.done = False
        if nd.type == SB.NoteType.PCM:
            self.wave = samples(bank.waveArchiveIDs[nd.waveArchiveIDID], nd.waveID)
        else:
            self.wave = None
        # ピッチスイープとポルタメント（前の音から、または指定の音から滑らせる）
        self.sweep = track.sweep_pitch
        if track.porta and track.porta_key is not None:
            self.sweep += (track.porta_key - key) * 64
        if track.porta_time:
            self.sweep_len = (track.porta_time * track.porta_time * abs(self.sweep)) >> 11
            self.auto_sweep = True
        else:
            self.sweep_len = length or 0
            self.auto_sweep = False
        self.sweep_t = 0
        self.t0 = t0

    def tick(self):
        """音の長さと、ポルタメント時間なしのスイープはティックごとに進む"""
        if not self.auto_sweep and self.sweep_t < self.sweep_len:
            self.sweep_t += 1
        if self.len is not None and self.stage != 3:
            self.len -= 1
            if self.len <= 0:
                self.stage = 3

    def frame(self):
        """エンベロープは処理間隔（約 5.2ms）ごとに進む"""
        if self.stage == 0:
            self.env = -((-self.env * self.ar) >> 8)
            if self.env >= 0 or self.ar == 0:
                self.env = 0
                self.stage = 1
        elif self.stage == 1:
            self.env -= self.dr
            if self.env <= self.sl:
                self.env = self.sl
                self.stage = 2
        elif self.stage == 3:
            self.env -= self.rr
            if self.env <= -92544:
                self.done = True
        if self.auto_sweep and self.sweep_t < self.sweep_len:
            self.sweep_t += 1

    def pitch(self):
        tr = self.track
        cents = (self.key - self.nd.pitch) * 64 + tr.bend * tr.bend_range // 2
        if self.sweep and self.sweep_t < self.sweep_len:
            cents += self.sweep * (self.sweep_len - self.sweep_t) // self.sweep_len
        return cents / 64  # 半音

    def amp(self):
        tr = self.track
        db = (self.env >> 7) + cnv(self.vel) + cnv(tr.vol) + cnv(tr.expr) + cnv(tr.seq_vol)
        return 10 ** (max(-723, db) / 200)


class Track:
    def __init__(self, events, start):
        self.events = events
        self.pc = start
        self.wait = 0
        self.program = 0
        self.vol = 127
        self.expr = 127
        self.seq_vol = 127
        self.bend = 0
        self.bend_range = 2
        self.transpose = 0
        self.porta = False
        self.porta_key = None
        self.porta_time = 0
        self.sweep_pitch = 0
        self.attack = self.decay = self.sustain = self.release = None
        self.mono = False
        self.stack = []
        self.loops = []
        self.ended = False
        self.tie = False


def render(name, max_seconds=12.0, tempo_scale=1.0):
    seq = SEQS[name]
    seq.parse()
    events = seq.events
    index = {id(e): i for i, e in enumerate(events)}
    bank = BANKS[seq.bankID][1]
    tracks = [Track(events, 0)]
    tracks[0].seq_vol = seq.volume
    voices = []
    out = []
    tempo = 120
    tick_acc = 0
    frame_sec = 64 * 2728 / 33513982  # シーケンサの1回の処理間隔（約 5.2ms）
    per_frame = frame_sec * RATE
    carry = 0.0
    frames = 0
    while frames * frame_sec < max_seconds:
        # テンポぶんカウンタを進め、240 に達するごとに 1 ティック処理する
        tick_acc += tempo
        while tick_acc >= 240:
            tick_acc -= 240
            for tr in list(tracks):
                if tr.ended:
                    continue
                if tr.wait > 0:
                    tr.wait -= 1
                    if tr.wait > 0:
                        continue
                if tr.mono and any(v.track is tr and v.stage != 3 and not v.done for v in voices):
                    continue
                guard = 0
                while tr.wait == 0 and not tr.ended and guard < 10000:
                    guard += 1
                    if tr.pc >= len(events):
                        tr.ended = True
                        break
                    e = events[tr.pc]
                    tr.pc += 1
                    if isinstance(e, SS.BeginTrackSequenceEvent):
                        t = Track(events, index[id(e.firstEvent)])
                        t.seq_vol = seq.volume
                        tracks.append(t)
                    elif isinstance(e, SS.NoteSequenceEvent):
                        key = e.pitch + tr.transpose
                        nd = note_def(bank, tr.program, key)
                        if nd is not None:
                            if tr.tie:
                                for v in voices:
                                    if v.track is tr and not v.done:
                                        v.stage = 3
                            voices.append(Voice(nd, bank, key, e.velocity, e.duration if e.duration else None, tr, frames))
                        tr.porta_key = key if tr.porta else tr.porta_key
                        if tr.mono:
                            tr.wait = max(1, e.duration)
                    elif isinstance(e, SS.RestSequenceEvent):
                        tr.wait = e.duration
                    elif isinstance(e, SS.InstrumentSwitchSequenceEvent):
                        tr.program = e.instrumentID
                    elif isinstance(e, SS.TempoSequenceEvent):
                        tempo = max(1, int(e.value * tempo_scale))
                    elif isinstance(e, SS.TrackVolumeSequenceEvent):
                        tr.vol = e.value
                    elif isinstance(e, SS.ExpressionSequenceEvent):
                        tr.expr = e.value
                    elif isinstance(e, SS.GlobalVolumeSequenceEvent):
                        for t in tracks:
                            t.seq_vol = e.value
                    elif isinstance(e, SS.PortamentoRangeSequenceEvent):
                        tr.bend_range = e.value
                    elif isinstance(e, SS.SequenceEvent) and type(e).__name__ == 'PitchBendSequenceEvent':
                        tr.bend = e.value
                    elif isinstance(e, SS.PortamentoSequenceEvent):
                        tr.bend = e.value if e.value < 128 else e.value - 256
                    elif isinstance(e, SS.PortamentoFromSequenceEvent):
                        tr.porta = True
                        tr.porta_key = e.value
                    elif isinstance(e, SS.PortamentoOnOffSequenceEvent):
                        tr.porta = bool(e.value)
                    elif isinstance(e, SS.PortamentoDurationSequenceEvent):
                        tr.porta_time = e.value
                    elif isinstance(e, SS.SweepPitchSequenceEvent):
                        tr.sweep_pitch = e.value - 0x10000 if e.value >= 0x8000 else e.value
                    elif isinstance(e, SS.TransposeSequenceEvent):
                        tr.transpose = e.value
                    elif isinstance(e, SS.AttackRateSequenceEvent):
                        tr.attack = e.value
                    elif isinstance(e, SS.DecayRateSequenceEvent):
                        tr.decay = e.value
                    elif isinstance(e, SS.SustainRateSequenceEvent):
                        tr.sustain = e.value
                    elif isinstance(e, SS.ReleaseRateSequenceEvent):
                        tr.release = e.value
                    elif isinstance(e, SS.MonoPolySequenceEvent):
                        tr.mono = e.value == SS.MonoPolySequenceEvent.Value.MONO
                    elif isinstance(e, SS.TieSequenceEvent):
                        tr.tie = bool(e.value)
                    elif isinstance(e, SS.CallSequenceEvent):
                        tr.stack.append(tr.pc)
                        tr.pc = index[id(e.destination)]
                    elif isinstance(e, SS.ReturnSequenceEvent):
                        if tr.stack:
                            tr.pc = tr.stack.pop()
                    elif isinstance(e, SS.JumpSequenceEvent):
                        tr.ended = True  # 曲のループは1回目で打ち切る
                    elif isinstance(e, SS.BeginLoopSequenceEvent):
                        tr.loops.append([tr.pc, e.loopCount])
                    elif isinstance(e, SS.EndLoopSequenceEvent):
                        if tr.loops:
                            lp = tr.loops[-1]
                            if lp[1] == 0:
                                tr.loops.pop()
                            else:
                                lp[1] -= 1
                                if lp[1] > 0:
                                    tr.pc = lp[0]
                                else:
                                    tr.loops.pop()
                    elif isinstance(e, SS.EndTrackSequenceEvent):
                        tr.ended = True
            for v in voices:
                v.tick()
        for v in voices:
            v.frame()
        # この処理間隔ぶんの波形を作る
        carry += per_frame
        n = int(carry)
        carry -= n
        buf = [0.0] * n
        for v in voices:
            if v.done:
                continue
            a = v.amp()
            semis = v.pitch()
            if v.wave is not None:
                data, sr, loop, looped = v.wave
                step = sr * 2 ** (semis / 12) / RATE
                for i in range(n):
                    p = int(v.pos)
                    if p >= len(data):
                        if looped and loop < len(data):
                            v.pos = loop + (v.pos - len(data))
                            p = int(v.pos)
                        else:
                            v.done = True
                            break
                    buf[i] += data[p] * a
                    v.pos += step
            elif v.nd.type == SB.NoteType.PSG_SQUARE_WAVE:
                freq = 440 * 2 ** ((v.nd.pitch - 69 + semis) / 12)
                duty = (getattr(v.nd, 'dutyCycle', v.nd.waveID) + 1) / 8
                for i in range(n):
                    buf[i] += (0.5 if (v.phase % 1) < duty else -0.5) * a
                    v.phase += freq / RATE
            else:
                freq = 440 * 2 ** ((v.nd.pitch - 69 + semis) / 12) * 8
                for i in range(n):
                    v.phase += freq / RATE
                    while v.phase >= 1:
                        v.phase -= 1
                        bit = v.noise & 1
                        v.noise >>= 1
                        if bit:
                            v.noise ^= 0x6000
                    buf[i] += (0.5 if v.noise & 1 else -0.5) * a
        voices = [v for v in voices if not v.done]
        out.extend(buf)
        frames += 1
        if all(t.ended for t in tracks) and not voices:
            break
    peak = max(1e-6, max(abs(x) for x in out) if out else 1)
    gain = min(1.0, 0.9 / peak) if peak > 0.9 else 1.0
    return [x * gain for x in out]


def save(path, data):
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(1)
        w.setframerate(RATE)
        w.writeframes(bytes(max(0, min(255, int(128 + x * 127))) for x in data))


JOBS = {
    'throw': ('SEQ_SE_DP_NAGERU', 3), 'hit': ('SEQ_SE_DP_BOWA4', 3), 'bounce1': ('SEQ_SE_DP_KON', 2), 'bounce2': ('SEQ_SE_DP_KON2', 2),
    'bounce3': ('SEQ_SE_DP_KON3', 2), 'bounce4': ('SEQ_SE_DP_KON4', 2), 'shake': ('SEQ_SE_DP_BOWA', 2), 'click': ('SEQ_SE_DP_GETTING', 3),
    'open': ('SEQ_SE_DP_BOWA2', 3), 'caught': ('SEQ_WINPOKE', 7.5),
}
if __name__ == '__main__':
    import sys
    only = sys.argv[1:]
    for key, (seq, sec) in JOBS.items():
        if only and key not in only:
            continue
        data = render(seq, sec)
        if key == 'caught':
            fade = int(RATE * 1.2)
            for i in range(fade):
                data[-fade + i] *= 1 - i / fade
        save(os.path.join(OUT, key + '.wav'), data)
        print(key, seq, round(len(data) / RATE, 2), 's')
