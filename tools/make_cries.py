# 日本版プラチナの鳴き声（BANK_PV001〜493 の波形1本を SEQ_PV でそのまま鳴らす）を cries/NNN.wav に書き出す
import os
import wave

import make_sfx as M

OUT = os.path.join(M.ROOT, 'cries')
os.makedirs(OUT, exist_ok=True)
gain = 10 ** (M.cnv(M.SEQS['SEQ_PV'].volume) / 200)
total = 0
for dex in range(1, 494):
    bank = M.BANKS[dex][1]
    nd = bank.instruments[0].noteDefinition
    data, rate, _, _ = M.samples(bank.waveArchiveIDs[nd.waveArchiveIDID], nd.waveID)
    path = os.path.join(OUT, '%03d.wav' % dex)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(1)
        w.setframerate(rate)
        w.writeframes(bytes(max(0, min(255, int(128 + x * gain * 127))) for x in data))
    total += os.path.getsize(path)
print('cries', total // 1024, 'KB')
