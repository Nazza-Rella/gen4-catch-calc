(() => {
'use strict';

const D = window.DATA;
const A = window.ASSETS;
const SP = D.species;
const $ = (id) => document.getElementById(id);
const fl = Math.floor;

// ---------------------------------------------------------------- 定義
const GAMES = [
  { id: 'D', name: 'ダイヤモンド', color: '#3f6fb8', set: 'dp', back: 'lucas_dp', player: 'コウキ', def: 483 },
  { id: 'P', name: 'パール', color: '#c1608f', set: 'dp', back: 'dawn_dp', player: 'ヒカリ', def: 484 },
  { id: 'Pt', name: 'プラチナ', color: '#6f7b8a', set: 'pt', back: 'lucas', player: 'コウキ', def: 487 },
  { id: 'HG', name: 'ハートゴールド', color: '#c69a1c', set: 'hg', back: 'ethan', player: 'ヒビキ', def: 250, hgss: true },
  { id: 'SS', name: 'ソウルシルバー', color: '#8f9fb3', set: 'hg', back: 'lyra', player: 'コトネ', def: 249, hgss: true },
  { id: 'ALL', name: '全ポケモン', color: '#46a352', set: 'pt', back: 'lance', player: 'ワタル', def: 493, all: true },
];
const GAME = Object.fromEntries(GAMES.map((g) => [g.id, g]));

// 並びはゲームのアイテム番号順
const BALLS = [
  { id: 'master', name: 'マスター' }, { id: 'ultra', name: 'ハイパー' }, { id: 'great', name: 'スーパー' },
  { id: 'poke', name: 'モンスター' }, { id: 'safari', name: 'サファリ' }, { id: 'net', name: 'ネット' },
  { id: 'dive', name: 'ダイブ' }, { id: 'nest', name: 'ネスト' }, { id: 'repeat', name: 'リピート' },
  { id: 'timer', name: 'タイマー' }, { id: 'luxury', name: 'ゴージャス' }, { id: 'premier', name: 'プレミア' },
  { id: 'dusk', name: 'ダーク' }, { id: 'heal', name: 'ヒール' }, { id: 'quick', name: 'クイック' },
  { id: 'fast', name: 'スピード', hgss: true }, { id: 'level', name: 'レベル', hgss: true }, { id: 'lure', name: 'ルアー', hgss: true },
  { id: 'heavy', name: 'ヘビー', hgss: true }, { id: 'love', name: 'ラブラブ', hgss: true }, { id: 'friend', name: 'フレンド', hgss: true },
  { id: 'moon', name: 'ムーン', hgss: true }, { id: 'sport', name: 'コンペ', hgss: true },
];
const BALL = Object.fromEntries(BALLS.map((b) => [b.id, b]));

const STATUS = [
  { id: 'none', name: 'なし', color: '#8b968d', mul: '×1' },
  { id: 'slp', name: 'ねむり', color: '#8a8698', mul: '×2' },
  { id: 'frz', name: 'こおり', color: '#4f9fd8', mul: '×2' },
  { id: 'par', name: 'まひ', color: '#c29a12', mul: '×1.5' },
  { id: 'psn', name: 'どく', color: '#a34db3', mul: '×1.5' },
  { id: 'brn', name: 'やけど', color: '#e0643c', mul: '×1.5' },
];
const STAT = Object.fromEntries(STATUS.map((s) => [s.id, s]));

// 時間帯（rtc.c の時刻表）。出現表は 朝／昼・夕／夜 の3つ、背景の色は 昼／夕／夜 の3つ
const TIMES = [
  { id: 0, name: '朝', hours: '4〜9時', enc: 0, pal: 0 },
  { id: 1, name: '昼', hours: '10〜16時', enc: 1, pal: 0 },
  { id: 2, name: '夕', hours: '17〜19時', enc: 1, pal: 1 },
  { id: 3, name: '夜', hours: '20〜3時', enc: 2, pal: 2, night: true },
];

const TYPE_COLOR = {
  'ノーマル': '#9a9a72', 'ほのお': '#e87a2e', 'みず': '#5f86e0', 'でんき': '#d8b21c', 'くさ': '#62ad44', 'こおり': '#6cbcbc',
  'かくとう': '#b8322a', 'どく': '#9a409a', 'じめん': '#c8a652', 'ひこう': '#8f7fdc', 'エスパー': '#e6537c', 'むし': '#98a820',
  'いわ': '#a8923a', 'ゴースト': '#6a5494', 'ドラゴン': '#6a3ae8', 'あく': '#6a5444', 'はがね': '#9a9ab6', '？？？': '#68a090',
};

const METHOD = {
  land: 'くさむら', surf: 'なみのり', old: 'ボロいつりざお', good: 'いいつりざお', super: 'すごいつりざお', rock: 'いわくだき',
  headbutt: 'ずつき', honey: 'あまいミツ', contest: 'むしとりたいかい',
};
const COND = {
  swarm: 'たいりょうはっせい', radar: 'ポケトレ', gba_ruby: 'ルビーをさす', gba_sapphire: 'サファイアをさす', gba_emerald: 'エメラルドをさす',
  gba_firered: 'ファイアレッドをさす', gba_leafgreen: 'リーフグリーンをさす', hoenn: 'ラジオ・ホウエンのおと', sinnoh: 'ラジオ・シンオウのおと',
  daily_local: '日替わり（全国図鑑の前）', daily_natdex: '日替わり（全国図鑑の後）',
};
const FISH = new Set(['old', 'good', 'super']);

const ICON = {
  land: '<path d="M5 20c1-6 1-10-1-14M10 20c0-5 1-9 4-13M15 20c0-4-1-7-3-9M19 20c0-5 1-8 2-10" stroke-linecap="round"/>',
  cave: '<path d="M3 20c0-9 4-15 9-15s9 6 9 15M8 20c0-4 2-7 4-7s4 3 4 7" stroke-linejoin="round"/>',
  building: '<path d="M4 20V10l8-6 8 6v10M9 20v-6h6v6" stroke-linejoin="round"/>',
  surf: '<path d="M2 14c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0M2 19c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0M12 10c0-3 2-6 5-6" stroke-linecap="round"/>',
  rod: '<path d="M4 20L18 4M18 4v11" stroke-linecap="round"/><circle cx="18" cy="17" r="2"/>',
  rock: '<path d="M3 19l3-8 5-4 6 2 4 10z" stroke-linejoin="round"/><path d="M11 7l1 5 5 1" />',
  tree: '<path d="M12 21v-6M7 15h10l-5-11z" stroke-linejoin="round"/>',
  static: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z" stroke-linejoin="round"/>',
  roam: '<path d="M4 18c3-1 4-4 8-4s5 3 8 4" stroke-linecap="round"/><circle cx="7" cy="8" r="1.8"/><circle cx="12" cy="6" r="1.8"/><circle cx="17" cy="8" r="1.8"/>',
  swarm: '<circle cx="7" cy="9" r="2"/><circle cx="13" cy="7" r="2"/><circle cx="17" cy="12" r="2"/><circle cx="9" cy="15" r="2"/><circle cx="15" cy="17" r="2"/>',
  radar: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 12l6-6"/>',
  radio: '<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M8 9l9-5M8 15h.01M13 13h4M13 16h4" stroke-linecap="round"/>',
  cart: '<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 8h8v5H8z"/>',
  bug: '<path d="M12 6v14M7 10l-3-2M17 10l3-2M7 15H3M17 15h4M8 19l-2 2M16 19l2 2" stroke-linecap="round"/><ellipse cx="12" cy="13" rx="4" ry="6"/>',
  honey: '<path d="M8 3h8l1 4H7zM6 7h12l-1 13H7z" stroke-linejoin="round"/>',
  marsh: '<path d="M3 17c3-2 6-2 9 0s6 2 9 0M6 13V6M10 13V8M14 13V5" stroke-linecap="round"/>',
  free: '<path d="M9 9a3 3 0 1 1 4 2.8c-.8.4-1 1-1 2.2M12 18h.01" stroke-linecap="round"/>',
  undo: '<path d="M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-2" stroke-linecap="round" stroke-linejoin="round"/>',
  reset: '<path d="M4 12a8 8 0 1 0 3-6.3M4 4v4h4" stroke-linecap="round" stroke-linejoin="round"/>',
  bait: '<path d="M12 7c3-3 8-1 8 4 0 5-4 9-8 9s-8-4-8-9c0-5 5-7 8-4z M12 7c0-2 1-3 3-4" stroke-linejoin="round"/>',
  mud: '<path d="M4 16c0-4 4-7 8-7s8 3 8 7c0 2-3 3-8 3s-8-1-8-3z" stroke-linejoin="round"/><circle cx="9" cy="14" r="1"/><circle cx="14" cy="13" r="1"/>',
  distortion: '<path d="M4 12c4-8 12 8 16 0M4 17c4-8 12 8 16 0M4 7c4-8 12 8 16 0" stroke-linecap="round"/>',
};
const svg = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">${ICON[k]}</svg>`;

// 全ポケモン・出現条件を無視したときの場所（アイコン, 名前, 補足, 地形, 背景番号, 追加）
const FREE_PLACES = [
  ['land', 'くさむら', '', 'grass', 0, {}],
  ['land', 'もり', '', 'grass', 3, {}],
  ['cave', 'どうくつ', 'ダークボール3.5倍', 'cave', 10, {}],
  ['building', 'たてもの', '', 'building', 6, {}],
  ['rock', 'やま', '', 'rocky', 4, {}],
  ['land', 'ゆきの ふる ばしょ', '', 'snow', 5, {}],
  ['surf', 'みず', 'なみのり・つり。ダイブボール3.5倍', 'water', 1, { water: true }],
  ['marsh', 'だいしつげん', 'サファリボールのみ', 'marsh', 3, { safari: true }],
  ['distortion', 'やぶれたせかい', '', 'distortion', 17, {}],
];

// ---------------------------------------------------------------- 状態
const st = {
  game: 'Pt', free: false, dex: 487, entry: 0, level: 47, iv: 31, hpFrac: 0, status: 'slp', ball: 'ultra', time: 1,
  turn: 1, repeat: false, shiny: false, acts: [], balls: 30, fg: 'm', leadLv: 50, same: false, gsel: 'diff',
};
const tally = { n: 0, ok: 0 };

// ---------------------------------------------------------------- 出現条件
function placeTerrain(loc) {
  if (loc.m === 'surf' || FISH.has(loc.m)) return 'water';
  return loc.bg;
}

function entriesFor(gid, dex, free) {
  const game = GAME[gid];
  const out = [];
  if (free || game.all) {
    for (const [icon, title, sub, bg, bb, extra] of FREE_PLACES) {
      if (extra.safari && game.hgss) continue;
      out.push({ kind: 'free', icon, title, sub, min: 1, max: 100, bg, bb, free: true, ...extra });
    }
    return out;
  }
  const g = D.games[gid];
  for (const l of g.locs) {
    for (const m of l.mons) {
      if (m[0] !== dex) continue;
      const pct = [m[3], m[4], m[5]];
      if (!pct.some((p) => p > 0)) continue;
      const lo = m[1] || 1, hi = m[2] || m[1] || 1;
      const sub = [l.s, l.cond ? COND[l.cond] : METHOD[l.m]].filter(Boolean).join('・');
      out.push({ kind: 'wild', icon: placeIcon(l), title: l.n, sub, min: lo, max: hi, pct, bg: placeTerrain(l), bb: l.bb ?? 0,
        method: l.m, cond: l.cond, safari: !!l.safari, water: l.m === 'surf' || FISH.has(l.m), contest: l.m === 'contest' });
    }
  }
  for (const s of g.statics) {
    if (s.dex !== dex) continue;
    const kindName = { roam: 'はいかい' }[s.kind];
    out.push({ kind: s.kind === 'roam' ? 'roam' : 'static', icon: s.kind === 'roam' ? 'roam' : s.kind === 'distortion' ? 'distortion' : 'static',
      title: s.n, sub: [kindName, s.note].filter(Boolean).join('・'), min: s.lv, max: s.lv, bg: s.bg, bb: bbOfTerrain(s.bg),
      msg: s.kind, water: s.bg === 'water' });
  }
  return out;
}

function bbOfTerrain(t) {
  return { grass: 0, water: 1, building: 6, cave: 10, snow: 5, rocky: 4, marsh: 3, distortion: 17 }[t] ?? 0;
}

function placeIcon(l) {
  if (l.cond === 'swarm') return 'swarm';
  if (l.cond === 'radar') return 'radar';
  if (l.cond && l.cond.startsWith('gba')) return 'cart';
  if (l.cond === 'hoenn' || l.cond === 'sinnoh') return 'radio';
  if (l.safari) return 'marsh';
  if (FISH.has(l.m)) return 'rod';
  if (l.m === 'surf') return 'surf';
  if (l.m === 'rock') return 'rock';
  if (l.m === 'headbutt') return 'tree';
  if (l.m === 'honey') return 'honey';
  if (l.m === 'contest') return 'bug';
  if (l.bg === 'cave') return 'cave';
  if (l.bg === 'building') return 'building';
  return 'land';
}

const speciesCache = {};
function speciesFor(gid) {
  if (speciesCache[gid]) return speciesCache[gid];
  if (GAME[gid].all) return (speciesCache[gid] = Array.from({ length: 493 }, (_, i) => i + 1));
  const set = new Set();
  const g = D.games[gid];
  g.locs.forEach((l) => l.mons.forEach((m) => set.add(m[0])));
  g.statics.forEach((s) => set.add(s.dex));
  return (speciesCache[gid] = [...set].sort((a, b) => a - b));
}

// ---------------------------------------------------------------- 計算
function maxHP(dex, lv, iv) {
  if (dex === 292) return 1;
  return fl((2 * SP[dex].hp + iv) * lv / 100) + lv + 10;
}
function curHP(M) {
  return Math.max(1, Math.min(M, Math.round(st.hpFrac * M)));
}
const isqrt = (n) => fl(Math.sqrt(n));

// サファリ：捕まえやすさ・逃げやすさの段階（0〜12、はじめ6）と倍率（battle_script.c / battle_display.c の表）
const STAGE = [[10, 40], [10, 35], [10, 30], [10, 25], [10, 20], [10, 15], [10, 10], [15, 10], [20, 10], [25, 10], [30, 10], [35, 10], [40, 10]];
const SAFARI_ACT = { ball: 'ボール', bait: 'エサ', mud: 'どろ' };

// エサ・どろの効果。プラチナ/DPは エサ=捕まえやすさ+1・9割で逃げやすさ+1、どろ=逃げやすさ-1・9割で捕まえやすさ-1。HGSSは逆
function safariMoves(hgss) {
  const up = (x) => Math.min(12, x + 1), dn = (x) => Math.max(0, x - 1);
  const easy = (s) => [[{ c: up(s.c), e: up(s.e) }, 0.9], [{ c: up(s.c), e: s.e }, 0.1]];
  const calm = (s) => [[{ c: dn(s.c), e: dn(s.e) }, 0.9], [{ c: s.c, e: dn(s.e) }, 0.1]];
  return hgss ? { bait: calm, mud: easy } : { bait: easy, mud: calm };
}
function safariRate(dex, c) {
  return fl(SP[dex].rate * STAGE[c][0] / STAGE[c][1]);
}
// 逃げる判定：乱数(0〜65535) % 255 <= 逃げやすさ×倍率
function safariFlee(dex, e) {
  const v = fl(SP[dex].sf * STAGE[e][0] / STAGE[e][1]);
  if (v >= 254) return 1;
  return Math.min(1, ((v + 1) * 257 + 1) / 65536);
}
function safariInfo(dex) {
  const hg = GAME[st.game].hgss;
  const s = { c: 6, e: 6 };
  const log = [];
  for (const a of st.acts) {
    const r = safariMoves(hg)[a](s)[0][0];
    s.c = r.c; s.e = r.e;
    log.push({ a, c: s.c, e: s.e });
  }
  return { c: s.c, e: s.e, log, rate: safariRate(dex, s.c), flee: safariFlee(dex, s.e) };
}
function safariPc(dex, c) {
  const rate = safariRate(dex, c);
  const a = fl(fl(rate * 15 / 10) / 3);
  if (a >= 255) return 1;
  if (!a) return 0;
  const b = fl(1048560 / isqrt(isqrt(fl(16711680 / a))));
  return (Math.min(b, 65536) / 65536) ** 4;
}
// 最善の動き：のこりボールごとに価値反復。逃げる判定はターンのはじめ（行動の前）の逃げやすさで決まる
const solveCache = new Map();
function solveSafari(dex, balls) {
  const hg = !!GAME[st.game].hgss;
  const key = [hg, dex, balls].join('|');
  if (solveCache.has(key)) return solveCache.get(key);
  const moves = safariMoves(hg);
  const acts = ['ball', 'bait', 'mud'];
  const N = 169;
  const enc = (s) => s.c * 13 + s.e;
  const S = Array.from({ length: N }, (_, i) => ({ c: fl(i / 13), e: i % 13 }));
  const pc = S.map((s) => safariPc(dex, s.c));
  const pf = S.map((s) => safariFlee(dex, s.e));
  const T = S.map((s) => [null, moves.bait(s).map(([t, w]) => [enc(t), w]), moves.mud(s).map(([t, w]) => [enc(t), w])]);
  let prev = new Float64Array(N);
  const policy = [];
  for (let bl = 1; bl <= balls; bl++) {
    const cur = new Float64Array(N);
    const pol = new Uint8Array(N);
    for (let it = 0; it < 500; it++) {
      let delta = 0;
      for (let i = 0; i < N; i++) {
        let best = pc[i] + (1 - pc[i]) * (1 - pf[i]) * prev[i];
        let ba = 0;
        for (let a = 1; a < 3; a++) {
          let v = 0;
          for (const [j, w] of T[i][a]) v += w * cur[j];
          v *= 1 - pf[i];
          if (v > best + 1e-13) { best = v; ba = a; }
        }
        delta = Math.max(delta, Math.abs(best - cur[i]));
        cur[i] = best;
        pol[i] = ba;
      }
      if (delta < 1e-12) break;
    }
    policy.push(pol);
    prev = cur;
  }
  const start = enc({ c: 6, e: 6 });
  const q = pc[start], f0 = pf[start];
  let only = 0, keep = 1;
  for (let i = 0; i < balls; i++) { only += keep * q; keep *= (1 - q) * (1 - f0); }
  const path = [];
  let s = start, bl = balls;
  for (let step = 0; step < 14 && bl > 0; step++) {
    const a = policy[bl - 1][s];
    path.push(acts[a]);
    if (a === 0) bl--;
    else s = T[s][a][0][0];
  }
  const res = { best: prev[start], only, path };
  solveCache.set(key, res);
  return res;
}

function ctxNow() {
  const entry = curEntry();
  const dex = st.dex;
  const M = maxHP(dex, st.level, st.iv);
  const H = entry.safari ? M : curHP(M);
  const status = entry.safari ? 'none' : st.status;
  let rate = SP[dex].rate;
  let safari = null;
  if (entry.safari) {
    safari = safariInfo(dex);
    rate = safari.rate;
  }
  return { entry, dex, M, H, status, rate, safari, game: st.game };
}

const MOON = new Set([29, 30, 31, 32, 33, 34, 173, 35, 36, 174, 39, 40, 300, 301]);

// ボールの倍率（10倍値）。HGSS のぼんぐりボールは倍率でなく種族の捕獲率そのものを変える（rate）
function ballInfo(id, c) {
  const g = GAME[c.game];
  const e = c.entry;
  const sp = SP[c.dex];
  const b = BALL[id];
  if (b.hgss && !g.hgss) return null;
  if (id === 'safari') {
    if (g.hgss && !e.safari) return null;
    return e.safari ? { m: 15 } : { off: 'だいしつげんの中でしか使えません' };
  }
  if (e.safari) return { off: g.hgss ? 'サファリゾーンではサファリボールしか投げられません' : 'だいしつげんではサファリボールしか投げられません' };
  if (id === 'sport') return e.contest ? { m: 15 } : { off: 'むしとりたいかいでしか使えません' };
  if (e.contest) return { off: 'むしとりたいかいではコンペボールしか投げられません' };
  const night = TIMES[st.time].night;
  switch (id) {
    case 'master': return { master: true, why: '必ず捕まる' };
    case 'ultra': return { m: 20 };
    case 'great': return { m: 15 };
    case 'poke': return { m: 10 };
    case 'net': {
      const ok = sp.types.includes('みず') || sp.types.includes('むし');
      return { m: ok ? 30 : 10, why: ok ? 'みず・むしタイプ' : 'みず・むしタイプではない' };
    }
    case 'dive': return { m: e.water ? 35 : 10, why: e.water ? 'すいじょう（なみのり・つり）' : 'すいじょうではない' };
    case 'nest': return { m: st.level < 40 ? Math.max(10, 40 - st.level) : 10, why: 'Lv' + st.level };
    case 'repeat': return { m: st.repeat ? 30 : 10, why: st.repeat ? 'つかまえたことがある' : 'つかまえたことがない' };
    case 'timer': return { m: Math.min(40, 10 + (st.turn - 1)), why: st.turn + 'ターン目' };
    case 'dusk': {
      const cave = e.bg === 'cave';
      return { m: night || cave ? 35 : 10, why: cave ? 'どうくつ' : night ? '夜（20〜3時）' : '夜でも どうくつでもない' };
    }
    case 'quick': return { m: st.turn === 1 ? 40 : 10, why: st.turn === 1 ? '1ターン目' : '2ターン目以降' };
    case 'fast': return sp.spd >= 100 ? { m: 10, rate: 'x4', why: `すばやさ種族値${sp.spd}（100以上）` } : { m: 10, why: `すばやさ種族値${sp.spd}` };
    case 'level': {
      const pl = st.leadLv, wl = st.level;
      if (pl <= wl) return { m: 10, why: `先頭のLv${pl}が相手より高くない` };
      const k = (pl >> 1) <= wl ? 2 : (pl >> 2) <= wl ? 4 : 8;
      return { m: 10, rate: 'x' + k, why: `先頭のLv${pl}・相手Lv${wl}` };
    }
    case 'lure': return FISH.has(e.method) ? { m: 10, rate: 'x3', why: 'つりで出会った' } : { m: 10, why: 'つりで出会っていない' };
    case 'heavy': {
      const w = sp.wt;
      const d = w >= 4096 ? 40 : w >= 3072 ? 30 : w >= 2048 ? 20 : -20;
      return { m: 10, rate: (d > 0 ? '+' : '') + d, why: `おもさ${(w / 10).toFixed(1)}kg` };
    }
    case 'love': {
      const ok = st.same && st.gsel === 'diff' && SP[c.dex].g !== 255;
      return ok ? { m: 10, rate: 'x8', why: '同じ種族で性別がちがう' } : { m: 10, why: '同じ種族で性別がちがう相手ではない' };
    }
    case 'moon': return MOON.has(c.dex) ? { m: 10, rate: 'x4', why: 'つきのいしで進化する系統' } : { m: 10, why: 'つきのいしで進化する系統ではない' };
    default: return { m: 10 };
  }
}

// ぼんぐりボールで変わった種族の捕獲率（255で頭打ち、マイナスは1。0はそのまま）
function effRate(rate, bi) {
  if (!bi.rate) return rate;
  let r = rate;
  if (bi.rate[0] === 'x') r = rate * +bi.rate.slice(1);
  else r = rate + +bi.rate;
  if (r > 255) r = 255;
  else if (r < 0) r = 1;
  return r;
}

function calc(c, ballId) {
  const bi = ballInfo(ballId, c);
  if (!bi || bi.off) return null;
  const r = { bi, c };
  if (bi.master) { r.p = 1; r.master = true; r.p1 = 1; return r; }
  const { M, H } = c;
  r.rate = effRate(c.rate, bi);
  r.a1 = fl(r.rate * bi.m / 10);
  r.a2 = fl(r.a1 * (3 * M - 2 * H) / (3 * M));
  const s = c.status;
  if (s === 'slp' || s === 'frz') r.a3 = r.a2 * 2, r.smul = '×2';
  else if (s !== 'none') r.a3 = fl(r.a2 * 15 / 10), r.smul = '×1.5';
  else r.a3 = r.a2, r.smul = '×1';
  if (r.a3 >= 255) { r.p = 1; r.sure = true; r.p1 = 1; return r; }
  if (r.a3 === 0) { r.p = 0; r.p1 = 0; r.zero = true; return r; }
  r.q = fl(16711680 / r.a3);
  r.s1 = isqrt(r.q);
  r.s2 = isqrt(r.s1);
  r.b = fl(1048560 / r.s2);
  r.p1 = Math.min(r.b, 65536) / 65536;
  r.p = r.p1 ** 4;
  return r;
}

// 投げた数ごとの累積確率。タイマーボールは1ターンに1球として倍率が上がり、クイックボールは2球目から1倍
function series(c, ballId) {
  const base = calc(c, ballId);
  if (!base) return null;
  const turnDep = ballId === 'timer' || ballId === 'quick';
  const pAt = (k) => {
    if (!turnDep) return base.p;
    const save = st.turn;
    st.turn = save + k;
    const r = calc(c, ballId);
    st.turn = save;
    return r.p;
  };
  const cum = [];
  let surv = 1, exp = 0;
  const need = { 50: null, 90: null, 99: null };
  const LIMIT = 400;
  for (let k = 0; k < LIMIT; k++) {
    const p = pAt(k);
    exp += surv;
    surv *= 1 - p;
    cum.push(1 - surv);
    for (const P of [50, 90, 99]) if (need[P] == null && 1 - surv >= P / 100 - 1e-12) need[P] = k + 1;
    if (surv < 1e-12) break;
  }
  if (surv >= 1e-12) {
    const p = pAt(LIMIT + 100);
    if (p > 0) {
      exp += surv / p;
      for (const P of [50, 90, 99]) {
        if (need[P] == null) need[P] = LIMIT + Math.ceil(Math.log((1 - P / 100) / surv) / Math.log(1 - p));
      }
    } else {
      exp = Infinity;
    }
  }
  return { base, cum, exp, need, turnDep };
}

// ---------------------------------------------------------------- 画像
function loadImg(src) {
  return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}
function imgData(img) {
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const x = cv.getContext('2d');
  x.drawImage(img, 0, 0);
  return { w: img.width, d: x.getImageData(0, 0, img.width, img.height).data };
}
const parsePal = (hex) => Array.from({ length: 16 }, (_, i) => [0, 2, 4].map((o) => parseInt(hex.substr(i * 6 + o, 2), 16)));

const ATLAS = {};
let ICONS = null, FONT_MSG = null, FONT_SYS = null;
const IMG = {};
const cache = new Map();

// 正面の絵（80x80、2コマ）。灰色の濃さ = パレット番号
function sprite(dex, frame, shiny) {
  const set = GAME[st.game].set;
  const k = `s${set}${dex}_${frame}_${shiny ? 1 : 0}`;
  if (!cache.has(k)) {
    const src = ATLAS[set];
    const i = (dex - 1) * 2 + frame;
    const sx = (i % 25) * 80, sy = fl(i / 25) * 80;
    const pal = parsePal(D.palettes[set][dex][shiny ? 1 : 0]);
    const cv = document.createElement('canvas');
    cv.width = cv.height = 80;
    const x = cv.getContext('2d');
    const out = x.createImageData(80, 80);
    for (let y = 0; y < 80; y++) {
      for (let xx = 0; xx < 80; xx++) {
        const v = (src.d[((sy + y) * src.w + sx + xx) * 4] + 8) >> 4;
        if (!v) continue;
        const o = (y * 80 + xx) * 4;
        const c = pal[v];
        out.data[o] = c[0]; out.data[o + 1] = c[1]; out.data[o + 2] = c[2]; out.data[o + 3] = 255;
      }
    }
    x.putImageData(out, 0, 0);
    cache.set(k, cv);
  }
  return cache.get(k);
}
// ギラティナ（オリジンフォルム）の 80x80 のコマ
function originSprite(frame, shiny) {
  const k = `go${frame}${shiny ? 1 : 0}`;
  if (!cache.has(k)) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 80;
    cv.getContext('2d').drawImage(shiny ? IMG.giratina_o_s : IMG.giratina_o, frame * 80, 0, 80, 80, 0, 0, 80, 80);
    cache.set(k, cv);
  }
  return cache.get(k);
}
function tinted(img, color, key) {
  const k = 't' + key + color;
  if (!cache.has(k)) {
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const x = cv.getContext('2d');
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color;
    x.fillRect(0, 0, cv.width, cv.height);
    cache.set(k, cv);
  }
  return cache.get(k);
}
function iconURL(dex) {
  const k = `u${dex}`;
  if (!cache.has(k)) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 32;
    if (IMG.icons) cv.getContext('2d').drawImage(IMG.icons, ((dex - 1) % 32) * 32, fl((dex - 1) / 32) * 32, 32, 32, 0, 0, 32, 32);
    cache.set(k, cv.toDataURL());
  }
  return cache.get(k);
}

// ---------------------------------------------------------------- 文字（日本版プラチナのフォント。1文字 16x16、値 1=文字 2=影 3=地）
function glyph(font, ch, fg, sh) {
  const k = `g${font}${ch}_${fg}_${sh}`;
  if (!cache.has(k)) {
    const sheet = font === 'msg' ? FONT_MSG : FONT_SYS;
    const code = D.fontCodes[ch];
    const cvg = document.createElement('canvas');
    cvg.width = cvg.height = 16;
    if (code && sheet) {
      const g = code - 1;
      const gx = (g % 32) * 16, gy = fl(g / 32) * 16;
      const x = cvg.getContext('2d');
      const out = x.createImageData(16, 16);
      for (let y = 0; y < 16; y++) {
        for (let xx = 0; xx < 16; xx++) {
          const v = (sheet.d[((gy + y) * sheet.w + gx + xx) * 4] + 32) >> 6;
          const c = v === 1 ? fg : v === 2 ? sh : null;
          if (!c) continue;
          const o = (y * 16 + xx) * 4;
          out.data[o] = c[0]; out.data[o + 1] = c[1]; out.data[o + 2] = c[2]; out.data[o + 3] = 255;
        }
      }
      x.putImageData(out, 0, 0);
    }
    cvg.adv = code ? D.fontWidths[font][code - 1] : 8;
    cache.set(k, cvg);
  }
  return cache.get(k);
}
function drawString(g, font, str, x, y, fg, sh, lh = 16) {
  let cx = x, cy = y;
  for (const ch of str) {
    if (ch === '\n') { cx = x; cy += lh; continue; }
    const gl = glyph(font, ch, fg, sh);
    g.drawImage(gl, cx, cy);
    cx += gl.adv;
  }
}

// ---------------------------------------------------------------- ポケモンの動き（pokemon_anim.c の動作スクリプトと pokemon_sprite.c のコマ送り。1コマ=1/30秒）
// 動き始めてから n コマ目の姿を、最初から計算しなおして返す
const MA = { X: 0, Y: 1, XOFS: 3, YOFS: 4, HIDE: 6, ROT: 9, XPIV: 10, YPIV: 11, SX: 12, SY: 13 };
const sinIdx = (r) => Math.round(Math.sin(((r & 0xffff) >> 4) * Math.PI * 2 / 4096) * 4096);
const cosIdx = (r) => Math.round(Math.cos(((r & 0xffff) >> 4) * Math.PI * 2 / 4096) * 4096);
function monPose(dex, n) {
  const [animNum, startDelay, , frames] = SP[dex].an;
  const A = new Array(48).fill(0);
  A[MA.SX] = A[MA.SY] = 256;
  const pose = () => ({ frame: sf, x: A[MA.X] + A[MA.XOFS], y: A[MA.Y] + A[MA.YOFS], sx: A[MA.SX] / 256, sy: A[MA.SY] / 256,
    rot: (A[MA.ROT] & 0xffff) * Math.PI * 2 / 65536, px: A[MA.X] + A[MA.XPIV], py: A[MA.Y] + A[MA.YPIV], fade });
  // コマ送り
  let sf = 0, fi = 0, fdelay = 0, factive = false;
  const loops = new Array(frames.length).fill(0);
  if (frames[0][0] !== -1) { factive = true; sf = frames[0][0]; fdelay = frames[0][1]; A[MA.XOFS] = frames[0][2]; }
  const tickFrames = () => {
    if (!factive) return;
    if (fdelay > 0) { fdelay--; return; }
    fi++;
    while (fi < frames.length && frames[fi][0] < -1) {
      loops[fi]++;
      if (frames[fi][1] === loops[fi] || frames[fi][1] === 0) { loops[fi] = 0; fi++; }
      else fi = -frames[fi][0] - 2;
    }
    if (fi >= frames.length || frames[fi][0] === -1) { sf = 0; factive = false; A[MA.XOFS] = 0; return; }
    sf = frames[fi][0]; fdelay = frames[fi][1]; A[MA.XOFS] = frames[fi][2];
  };
  // 動作スクリプト
  const code = D.anims[animNum < D.anims.length ? animNum : 0];
  const m = { pc: 0, vars: new Array(8).fill(0), delay: animNum < D.anims.length ? startDelay : 0, end: false,
    tx: 0, ty: 0, ox: 0, oy: 0, sx: 0, sy: 0, rz: 0, ynorm: 28, waitT: false, loopStart: -1, loopMax: 0, loopN: 0, fadeWait: false };
  const oX = A[MA.X], oY = A[MA.Y];
  let fade = null;
  const T = [];
  const rd = () => code[++m.pc];
  const field = { 35: 'ox', 36: 'oy', 37: 'sx', 38: 'sy', 39: 'rz' };
  const applyT = () => { A[MA.X] = oX + m.tx + m.ox; A[MA.Y] = oY + m.ty + m.oy; };
  const applySR = () => {
    A[MA.SX] = 256 + m.sx; A[MA.SY] = 256 + m.sy; A[MA.ROT] = m.rz & 0xffff;
    if ((m.ynorm === 27 && m.sy < 0) || (m.ynorm === 29 && m.sy !== 0)) A[MA.Y] += Math.trunc(-m.sy / 8);
  };
  const reset = () => { A[MA.X] = oX; A[MA.Y] = oY; A[MA.ROT] = 0; A[MA.XPIV] = 0; A[MA.SX] = A[MA.SY] = 256; };
  const nextVal = (tr) => {
    if (tr.calc === 24) m[tr.f] = tr.cur;
    else if (tr.calc === 25) m[tr.f] = tr.orig + tr.cur;
    else m[tr.f] += tr.cur;
  };
  const curve = (tr, r) => {
    const v = tr.v, sc = v[0] === 30 || v[0] === 32 ? sinIdx(r) : cosIdx(r);
    tr.cur = (v[0] >= 32 ? -1 : 1) * ((sc * v[2]) >> 12);
  };
  const FN = [
    (tr) => { const v = tr.v; curve(tr, v[3] * (v[6] + 1) + v[4]); nextVal(tr); if (++v[6] >= v[5]) tr.on = false; },
    (tr) => { const v = tr.v; curve(tr, Math.trunc(v[3] * (v[6] + 1) / v[5]) + v[4]); nextVal(tr); if (++v[6] >= v[5]) tr.on = false; },
    (tr) => { const v = tr.v; tr.cur += v[1] + v[2] * v[4]; nextVal(tr); if (++v[4] >= v[3]) tr.on = false; },
    (tr) => { const v = tr.v; tr.cur = Math.trunc((v[3] + 1) * v[1] / v[2]); nextVal(tr); if (++v[3] >= v[2]) tr.on = false; },
    (tr) => {
      const v = tr.v, d = v[1] + v[2] * v[4];
      tr.cur += d;
      if (tr.calc === 25) {
        const t2 = tr.orig + tr.cur;
        if (d < 0 ? t2 <= v[3] : t2 >= v[3]) { tr.cur += v[3] - t2; tr.on = false; }
      } else if (d < 0 ? tr.cur <= v[3] : tr.cur >= v[3]) { tr.cur = v[3]; tr.on = false; }
      nextVal(tr); v[4]++;
    },
  ];
  const NPAR = [6, 6, 4, 3, 4], TIDX = [1, 1, 0, 0, 0];
  const newTransform = (fn) => {
    const tr = { on: true, fn, v: new Array(8).fill(0), cur: 0 };
    tr.calc = rd(); tr.delay = rd() & 0xff;
    for (let i = 0; i < NPAR[fn]; i++) tr.v[i] = rd();
    tr.f = field[tr.v[TIDX[fn]]] || 'ox';
    tr.orig = m[tr.f];
    const slot = T.findIndex((x) => !x.on);
    if (slot >= 0) T[slot] = tr; else if (T.length < 4) T.push(tr);
    if (tr.delay === 0) FN[fn](tr); else tr.delay--;
  };
  const val = (isVar) => (isVar ? m.vars[rd()] : rd());
  const step = () => {
    let wait = false, count = 0;
    for (const tr of T) { if (!tr.on) continue; if (tr.delay === 0) FN[tr.fn](tr); else tr.delay--; }
    if (!T.some((x) => x.on)) m.waitT = false;
    if (m.waitT) { applyT(); applySR(); return; }
    if (m.fadeWait) { if (fade && fade.on) return; m.fadeWait = false; }
    while (!m.end && count++ < 256) {
      const op = code[m.pc];
      let a, b, i, t1, t2;
      switch (op) {
        case 0: reset(); wait = true; m.end = true; break;
        case 1: wait = true; break;
        case 2: reset(); break;
        case 3: {
          t1 = rd();
          if (t1 === 20) { a = m.vars[rd()]; b = rd(); } else { a = m.vars[rd()]; b = m.vars[rd()]; }
          const cond = rd(), res = a < b ? 15 : a > b ? 16 : 17;
          t2 = rd();
          let nv;
          if (t2 === 20) { i = rd(); nv = rd(); } else { i = rd(); nv = m.vars[rd()]; }
          if (cond === res) m.vars[i] = nv;
          break;
        }
        case 4: i = rd(); m.vars[i] = rd(); break;
        case 5: i = rd(); m.vars[i] = m.vars[rd()]; break;
        case 6: case 7: {
          i = rd(); t1 = rd();
          if (t1 === 18) { a = m.vars[rd()]; b = rd(); } else { a = m.vars[rd()]; b = m.vars[rd()]; }
          m.vars[i] = op === 6 ? a + b : a * b;
          break;
        }
        case 8: case 9: case 10: {
          i = rd(); t1 = rd(); t2 = rd();
          a = val(t1 === 19); b = val(t2 === 19);
          m.vars[i] = op === 8 ? a - b : op === 9 ? Math.trunc(a / b) : a % b;
          break;
        }
        case 11: m.loopStart = ++m.pc; m.loopMax = code[m.pc]; m.loopN = 0; break;
        case 12: if (++m.loopN >= m.loopMax) { m.loopStart = -1; m.loopN = 0; m.loopMax = 0; } else m.pc = m.loopStart; break;
        case 13: a = rd(); A[a] = m.vars[rd()]; break;
        case 14: a = rd(); A[a] += m.vars[rd()]; break;
        case 15: { a = rd(); t1 = rd(); b = val(t1 === 21); if (rd() === 22) A[a] = b; else A[a] += b; break; }
        case 16: case 17: {
          i = rd(); const r = m.vars[rd()];
          t1 = rd(); const amp = val(t1 === 21);
          t2 = rd(); const off = val(t2 === 21);
          const rr = (r + off) % 0x10000;
          m.vars[i] = ((op === 16 ? sinIdx(rr) : cosIdx(rr)) * amp) >> 12;
          break;
        }
        case 18: case 19: {
          i = rd(); t1 = rd();
          const key = t1 === 8 ? 'tx' : 'ty';
          if (op === 18) m[key] = m.vars[i]; else m[key] += m.vars[i];
          break;
        }
        case 20: {
          const key = { 8: 'tx', 9: 'ty', 10: 'ox', 11: 'oy', 12: 'sx', 13: 'sy', 14: 'rz' }[rd()];
          t1 = rd(); b = val(t1 === 21);
          if (rd() === 22) m[key] = b; else m[key] += b;
          break;
        }
        case 21: applyT(); break;
        case 22: applySR(); break;
        case 23: { i = rd(); a = rd(); if (a === 8 || a === 10) m.ox = m.vars[i]; else m.oy = m.vars[i]; break; }
        case 24: m.waitT = true; break;
        case 25: m.ynorm = rd(); break;
        case 26: case 27: case 28: case 29: case 30: newTransform(op - 26); break;
        case 31: m.delay = rd(); wait = true; break;
        case 32: {
          const ia = rd(), ta = rd(), dl = rd(), col = rd();
          fade = { on: true, a: ia, to: ta, d: dl, c: 0, col: `rgb(${[col & 31, (col >> 5) & 31, (col >> 10) & 31].map((v) => Math.round(v * 255 / 31)).join(',')})`, cur: ia };
          break;
        }
        case 33: if (fade && fade.on) { m.fadeWait = true; wait = true; } break;
        default: m.end = true; wait = true;
      }
      if (m.end) break;
      m.pc++;
      if (wait) break;
      if (m.waitT) { applyT(); applySR(); break; }
    }
  };
  const tickFade = () => {
    if (!fade || !fade.on) return;
    if (fade.c > 0) { fade.c--; return; }
    fade.c = fade.d; fade.cur = fade.a;
    if (fade.a === fade.to) fade.on = false; else fade.a += fade.a > fade.to ? -1 : 1;
  };
  for (let k = 0; k < n; k++) {
    if (!m.end) { if (m.delay === 0) step(); else m.delay--; }
    tickFrames();
    tickFade();
  }
  const r = pose();
  r.fade = fade && fade.cur > 0 ? { a: fade.cur / 16, col: fade.col } : null;
  return r;
}

// ---------------------------------------------------------------- ボールのパーティクル（pokeplatinum lib/spl の移植。1コマ=1/30秒、正射影で 1 ワールド単位 = 24 ドット）
const FXM = (a, b) => Math.floor(a * b / 4096);
const fxSin = (i) => Math.round(Math.sin(((i & 0xffff) >> 4) * Math.PI * 2 / 4096) * 4096);
const fxCos = (i) => Math.round(Math.cos(((i & 0xffff) >> 4) * Math.PI * 2 / 4096) * 4096);
const s16v = (v) => ((v & 0xffff) ^ 0x8000) - 0x8000;
function vnorm(v) {
  const m = Math.hypot(v[0], v[1], v[2]);
  return m ? v.map((c) => Math.trunc(c * 4096 / m)) : [0, 0, 0];
}
class SplSystem {
  constructor(spa, seed) {
    this.spa = spa;
    this.rs = seed >>> 0;
    this.emitters = [];
  }
  next() { this.rs = (Math.imul(this.rs, 0x5eedf715) + 0x1b0cb173) >>> 0; return this.rs; }
  u(bits) { return this.next() >>> (32 - bits); }
  fx(bits) { return (this.next() | 0) >> (32 - bits); }
  range(num) { return Math.floor((num * this.u(9) - num * 256) / 256); }
  scaled(num, r) { return Math.floor(num * (255 - ((r * this.u(8)) >> 8)) / 256); }
  dscaled(num, r) { return Math.floor(num * (255 + r - ((r * this.u(8)) >> 7)) / 256); }
  rvec() { return vnorm([this.fx(24), this.fx(24), this.fx(24)]); }
  rvecXY() { return vnorm([this.fx(24), this.fx(24), 0]); }
  emit(i, pos) {
    const r = this.spa.res[i], h = r.h;
    const e = { r, h, pos: [pos[0] + h.basePos[0], pos[1] + h.basePos[1], pos[2] + h.basePos[2]], age: 0, started: false, ps: [], cs: [],
      axis: h.axis.slice(), frac: 0 };
    this.emitters.unshift(e);
  }
  axes(e) {
    let axis;
    const ca = e.h.flags.circleAxis;
    if (ca === 2) axis = [4096, 0, 0]; else if (ca === 1) axis = [0, 4096, 0]; else if (ca === 0) axis = [0, 0, 4096]; else axis = vnorm(e.axis);
    let vec = [0, 4096, 0];
    const dot = FXM(vec[1], axis[1]);
    if (dot === 4096 || dot === -4096) vec = [4096, 0, 0];
    const cross = (a, b) => [FXM(a[1], b[2]) - FXM(a[2], b[1]), FXM(a[2], b[0]) - FXM(a[0], b[2]), FXM(a[0], b[1]) - FXM(a[1], b[0])];
    const c1 = cross(axis, vec);
    const c2 = cross(axis, c1);
    e.c1 = vnorm(c1); e.c2 = vnorm(c2);
    e.c3 = vnorm(cross(e.c1, e.c2));
  }
  tilt(e, p) {
    return [0, 1, 2].map((k) => FXM(p[0], e.c1[k]) + FXM(p[1], e.c2[k]) + FXM(p[2], e.c3[k]));
  }
  emitParticles(e) {
    const h = e.h, r = e.r, f = h.flags;
    const cnt = e.h.emissionCount + e.frac;
    const total = cnt >> 12;
    e.frac = cnt & 0xfff;
    if ([2, 3, 5, 6, 7, 8, 9].includes(f.emissionType)) this.axes(e);
    let emission = 0;
    for (let i = 0; i < total; i++) {
      const p = { pos: [0, 0, 0], vel: [0, 0, 0] };
      e.ps.unshift(p);
      const R = h.radius;
      switch (f.emissionType) {
        case 1: p.pos = this.rvec().map((c) => FXM(c, R)); break;
        case 2: { const v = this.rvecXY(); p.pos = this.tilt(e, [FXM(v[0], R), FXM(v[1], R), 0]); break; }
        case 3: {
          const idx = Math.trunc(emission * 65536 / total); emission++;
          p.pos = this.tilt(e, [FXM(fxSin(idx), R), FXM(fxCos(idx), R), 0]);
          break;
        }
        case 4: { const v = this.rvec(); p.pos = v.map((c) => FXM(FXM(c, R), this.range(4096))); break; }
        case 5: { const v = this.rvecXY(); p.pos = this.tilt(e, [FXM(FXM(v[0], R), this.range(4096)), FXM(FXM(v[1], R), this.range(4096)), 0]); break; }
        case 8: case 9: {
          let v = this.rvec();
          const up = e.c3;
          const d = v[0] * up[0] + v[1] * up[1] + v[2] * up[2];
          if (f.emissionType === 8 ? d <= 0 : d < 0) v = v.map((c) => -c);
          p.pos = f.emissionType === 8 ? v.map((c) => FXM(c, R)) : v.map((c) => FXM(FXM(c, R), (this.range(4096) >> 1) + 2048));
          break;
        }
        case 6: case 7: {
          p.vel = this.rvecXY();
          const k1 = f.emissionType === 7 ? this.range(4096) : 4096, k2 = f.emissionType === 7 ? this.range(4096) : 4096;
          p.pos = this.tilt(e, [FXM(FXM(p.vel[0], R), k1), FXM(FXM(p.vel[1], R), k2), this.range(h.length)]);
          break;
        }
        default: break;
      }
      const magPos = this.dscaled(h.initVelPos, h.attVel);
      const magAxis = this.dscaled(h.initVelAxis, h.attVel);
      let n;
      if (f.emissionType === 6) {
        n = vnorm([0, 1, 2].map((k) => FXM(p.vel[0], e.c1[k]) + FXM(p.vel[1], e.c2[k])));
      } else if (!p.pos[0] && !p.pos[1] && !p.pos[2]) n = this.rvec();
      else n = vnorm(p.pos);
      p.vel = [0, 1, 2].map((k) => FXM(n[k], magPos) + FXM(e.axis[k], magAxis));
      p.epos = e.pos.slice();
      p.scale = this.dscaled(h.baseScale, h.attScale);
      p.anim = 4096;
      if (f.hasColorAnim && r.color.random) { const idx = this.u(12); p.color = [r.color.start, h.color, r.color.end][idx % 3]; } else p.color = h.color;
      p.baseAlpha = h.baseAlpha; p.animAlpha = 31;
      p.rot = f.randomInitAngle ? this.u(32) & 0xffff : h.initAngle;
      p.av = f.hasRotation ? s16v(((h.maxRot - h.minRot) * this.u(12) + h.minRot * 4096) >> 12) : 0;
      p.life = this.scaled(h.particleLife, h.attLife) + 1;
      p.age = 0;
      if (f.hasTexAnim && r.tex.random) p.tex = r.tex.frames[this.u(12) % r.tex.count];
      else if (f.hasTexAnim) p.tex = r.tex.frames[0];
      else p.tex = h.texture;
      p.loopF = Math.trunc(0xffff / (h.loopFrames || 1));
      p.lifeF = Math.trunc(0xffff / p.life);
      p.off = f.randomizeLoopedAnim ? this.u(8) : 0;
    }
  }
  animate(p, r, lr) {
    const f = r.h.flags;
    if (f.hasScaleAnim) {
      const a = r.scale, rate = a.loop ? lr[1] : lr[0];
      if (rate < a.in) p.anim = a.start + Math.trunc(rate * (a.mid - a.start) / a.in);
      else if (rate < a.out) p.anim = a.mid;
      else p.anim = a.end + Math.trunc((rate - 255) * (a.end - a.mid) / (255 - a.out));
    }
    if (f.hasColorAnim && !r.color.random) {
      const a = r.color, rate = a.loop ? lr[1] : lr[0], pk = r.h.color;
      const ch = (c, s) => (c >> s) & 31;
      const mix = (c1, c2, x, y) => [0, 5, 10].reduce((acc, s) => acc | ((ch(c1, s) + Math.trunc(x * (ch(c2, s) - ch(c1, s)) / y)) << s), 0);
      if (rate < a.in) p.color = a.start;
      else if (rate < a.peak) p.color = a.interp ? mix(a.start, pk, rate - a.in, a.peak - a.in) : pk;
      else if (rate < a.out) p.color = a.interp ? mix(pk, a.end, rate - a.peak, a.out - a.peak) : a.end;
      else p.color = a.end;
    }
    if (f.hasAlphaAnim) {
      const a = r.alpha, rate = a.loop ? lr[1] : lr[0];
      let v;
      if (rate < a.in) v = Math.trunc(rate * (a.mid - a.start) / a.in) + a.start;
      else if (rate < a.out) v = a.mid;
      else v = Math.trunc((rate - 255) * (a.end - a.mid) / (255 - a.out)) + a.end;
      p.animAlpha = this.scaled(v, a.rand) & 31;
    }
    if (f.hasTexAnim && !r.tex.random) {
      const a = r.tex, rate = a.loop ? lr[1] : lr[0];
      for (let i = 0; i < a.count; i++) if (rate < a.step * (i + 1)) { p.tex = a.frames[i]; break; }
    }
  }
  behave(p, r, acc) {
    for (const b of r.behaviors) {
      if (b.type === 'gravity') { acc[0] += b.v[0]; acc[1] += b.v[1]; acc[2] += b.v[2]; }
      else if (b.type === 'random') { if (p.age % b.interval === 0) for (let k = 0; k < 3; k++) acc[k] += this.range(b.v[k]); }
      else if (b.type === 'magnet') { for (let k = 0; k < 3; k++) acc[k] += (b.force * ((b.v[k] - p.pos[k]) - p.vel[k])) >> 12; }
      else if (b.type === 'spin') {
        const s = fxSin(b.angle), c = fxCos(b.angle), [x, y, z] = p.pos;
        if (b.axis === 0) p.pos = [x, FXM(y, c) - FXM(z, s), FXM(y, s) + FXM(z, c)];
        else if (b.axis === 1) p.pos = [FXM(x, c) + FXM(z, s), y, FXM(z, c) - FXM(x, s)];
        else p.pos = [FXM(x, c) - FXM(y, s), FXM(x, s) + FXM(y, c), z];
      } else if (b.type === 'convergence') { for (let k = 0; k < 3; k++) p.pos[k] += FXM(b.force, b.v[k] - p.pos[k]); }
    }
  }
  move(p, air) {
    p.rot = (p.rot + p.av) & 0xffff;
    for (let k = 0; k < 3; k++) {
      p.vel[k] = (p.vel[k] * air) >> 9;
    }
  }
  step() {
    for (const e of this.emitters.slice()) {
      const h = e.h, r = e.r, f = h.flags;
      if (!e.started && e.age >= h.startDelay) { e.started = true; e.age = 0; }
      const air = h.air + 384;
      if ((h.emitterLife === 0 || e.age < h.emitterLife) && e.age % (h.interval || 1) === 0 && e.started) this.emitParticles(e);
      for (const p of e.ps.slice()) {
        const lr = [(p.lifeF * p.age >> 8) & 255, (p.off + ((p.loopF * p.age) >> 8)) & 255];
        this.animate(p, r, lr);
        const acc = [0, 0, 0];
        if (f.followEmitter) p.epos = e.pos.slice();
        this.behave(p, r, acc);
        this.move(p, air);
        for (let k = 0; k < 3; k++) { p.vel[k] += acc[k]; p.pos[k] += p.vel[k]; }
        if (r.child) {
          const c = r.child;
          const delay = FXM(p.life * 4096, c.delay * 4096);
          const diff = p.age * 4096 - (delay >> 8);
          if (diff >= 0 && ((diff >> 12) % (c.interval || 1)) === 0) this.emitChildren(e, p);
        }
        p.age++;
        if (p.age > p.life) e.ps.splice(e.ps.indexOf(p), 1);
      }
      if (r.child) {
        const c = r.child;
        for (const p of e.cs.slice()) {
          const rate = Math.trunc((p.age << 8) / p.life);
          if (c.hasScaleAnim) p.anim = c.endScale + Math.trunc((c.endScale - 4096) * (rate - 255) / 255);
          if (c.hasAlphaAnim) p.animAlpha = Math.trunc((255 - rate) * 31 / 255);
          const acc = [0, 0, 0];
          if (c.followEmitter) p.epos = e.pos.slice();
          if (c.usesBehaviors) this.behave(p, r, acc);
          this.move(p, air);
          for (let k = 0; k < 3; k++) { p.vel[k] += acc[k]; p.pos[k] += p.vel[k]; }
          p.age++;
          if (p.age > p.life) e.cs.splice(e.cs.indexOf(p), 1);
        }
      }
      e.age++;
      const done = f.selfMaintaining && h.emitterLife !== 0 && e.started && e.age > h.emitterLife;
      if (done && !e.ps.length && !e.cs.length) this.emitters.splice(this.emitters.indexOf(e), 1);
    }
  }
  emitChildren(e, p) {
    const c = e.r.child;
    const ratio = FXM(c.velRatio * 4096, 16);
    for (let i = 0; i < c.count; i++) {
      const q = { pos: p.pos.slice(), vel: [0, 1, 2].map((k) => FXM(p.vel[k], ratio) + this.range(c.velMag)), epos: p.epos.slice() };
      const ps = (p.scale * p.anim) >> 12;
      q.scale = (ps * (c.scaleRatio + 1)) >> 6;
      q.anim = 4096;
      q.color = c.useChildColor ? c.color : p.color;
      q.baseAlpha = (p.baseAlpha * (p.animAlpha + 1)) >> 5;
      q.animAlpha = 31;
      q.rot = c.rotType ? p.rot : 0;
      q.av = c.rotType === 2 ? p.av : 0;
      q.life = c.life; q.age = 0; q.tex = c.texture;
      e.cs.unshift(q);
    }
  }
  alive() { return this.emitters.some((e) => e.ps.length || e.cs.length || !e.started || e.h.emitterLife === 0 || e.age < e.h.emitterLife); }
}

// 1 ワールド単位 = 24 ドット、画面の中心 (128, 96) が原点
function splDraw(g, sys, atlas) {
  const k = 24 / 4096;
  for (const e of sys.emitters) {
    const h = e.h, f = h.flags;
    const list = [];
    const parent = () => { if (!f.hideParent) for (const p of e.ps) list.push([p, false]); };
    const child = () => { if (e.r.child) for (const p of e.cs) list.push([p, true]); };
    if (f.drawChildrenFirst) { child(); parent(); } else { parent(); child(); }
    for (const [p, isChild] of list) {
      const alpha = (p.baseAlpha * (p.animAlpha + 1)) >> 5;
      if (alpha <= 0) continue;
      const c = isChild ? e.r.child : null;
      const texIdx = isChild ? c.texture : (f.hasTexAnim ? p.tex : h.texture);
      const tileS = isChild ? c.tileS : h.tileS, tileT = isChild ? c.tileT : h.tileT;
      const flipS = isChild ? c.flipS : h.flipS, flipT = isChild ? c.flipT : h.flipT;
      const img = splTexture(sys.spa, texIdx, tileS, tileT, flipS, flipT, p.color, atlas);
      if (!img) continue;
      let sy = p.scale, sx = FXM(sy, h.aspect);
      if (h.scaleDir === 0) { sx = FXM(sx, p.anim); sy = FXM(sy, p.anim); } else if (h.scaleDir === 1) sx = FXM(sx, p.anim); else sy = FXM(sy, p.anim);
      const wx = p.pos[0] + p.epos[0], wy = p.pos[1] + p.epos[1];
      const dt = isChild ? c.drawType : f.drawType;
      let U, V;
      if (dt === 1) {
        const d = vnorm([p.vel[1], -p.vel[0], 0]);
        if (!d[0] && !d[1]) continue;
        const vn = vnorm(p.vel);
        const dot = Math.abs(-vn[2]);
        const len = FXM(sy, FXM(4096 - dot, h.dbbScale || 0) + 4096);
        U = [FXM(d[0], sx), FXM(d[1], sx)]; V = [FXM(-d[1], len), FXM(d[0], len)];
      } else {
        const s = fxSin(p.rot), co = fxCos(p.rot);
        if (dt >= 2 && f.polygonRotAxis === 0) {
          // Y 軸まわりの回転は正面から見ると横に縮むだけ
          U = [FXM(co, sx), 0]; V = [0, sy];
          if (f.polygonReferencePlane) V = [0, 0];
        } else {
          U = [FXM(co, sx), FXM(s, sx)]; V = [FXM(-s, sy), FXM(co, sy)];
        }
      }
      // 画面へ（Y は下向き）
      const Ux = U[0] * k, Uy = -U[1] * k, Vx = V[0] * k, Vy = -V[1] * k;
      const cx = 128 + wx * k + (h.polyX / 4096) * Ux + (h.polyY / 4096) * Vx;
      const cy = 96 - wy * k + (h.polyX / 4096) * Uy + (h.polyY / 4096) * Vy;
      if (Math.abs(Ux * Vy - Uy * Vx) < 0.01) continue;
      g.save();
      g.globalAlpha = alpha / 31;
      g.setTransform(2 * Ux / img.width, 2 * Uy / img.width, -2 * Vx / img.height, -2 * Vy / img.height, cx - Ux + Vx, cy - Uy + Vy);
      g.drawImage(img, 0, 0);
      g.restore();
    }
  }
}
const SPL_TEX = new Map();
function splTexture(spa, idx, tileS, tileT, flipS, flipT, color, atlas) {
  const key = `${spa.id}_${idx}_${tileS}${tileT}${flipS}${flipT}_${color}`;
  if (SPL_TEX.has(key)) return SPL_TEX.get(key);
  const ti = spa.tex[idx];
  if (ti === undefined || !atlas) return null;
  const [ax, ay, w, h] = D.spaRects[ti];
  const t = D.spaTexParam[ti];
  const nS = 1 << tileS, nT = 1 << tileT;
  const cv = document.createElement('canvas');
  cv.width = w * nS; cv.height = h * nT;
  const x = cv.getContext('2d');
  for (let i = 0; i < nS; i++) {
    for (let j = 0; j < nT; j++) {
      const mx = (t.flip & 1) && (i & 1), my = (t.flip & 2) && (j & 1);
      x.save();
      x.translate(i * w + (mx ? w : 0), j * h + (my ? h : 0));
      x.scale(mx ? -1 : 1, my ? -1 : 1);
      x.drawImage(atlas, ax, ay, w, h, 0, 0, w, h);
      x.restore();
    }
  }
  let out = cv;
  if (flipS || flipT) {
    out = document.createElement('canvas');
    out.width = cv.width; out.height = cv.height;
    const y = out.getContext('2d');
    y.translate(flipS ? cv.width : 0, flipT ? cv.height : 0);
    y.scale(flipS ? -1 : 1, flipT ? -1 : 1);
    y.drawImage(cv, 0, 0);
  }
  // 頂点の色を掛ける（形は元のまま）
  if ((color & 0x7fff) !== 0x7fff) {
    const r = (color & 31) * 255 / 31, gg = ((color >> 5) & 31) * 255 / 31, b = ((color >> 10) & 31) * 255 / 31;
    const tinted = document.createElement('canvas');
    tinted.width = out.width; tinted.height = out.height;
    const y = tinted.getContext('2d');
    y.drawImage(out, 0, 0);
    y.globalCompositeOperation = 'multiply';
    y.fillStyle = `rgb(${r},${gg},${b})`;
    y.fillRect(0, 0, out.width, out.height);
    y.globalCompositeOperation = 'destination-in';
    y.drawImage(out, 0, 0);
    out = tinted;
  }
  SPL_TEX.set(key, out);
  return out;
}

// ボールごとのパーティクル（ov12_02235E94.c の表。道具番号の順。ぼんぐりボールはモンスターボールのもので代用）
const BALL_ITEM = { master: 1, ultra: 2, great: 3, poke: 4, safari: 5, net: 6, dive: 7, nest: 8, repeat: 9, timer: 10, luxury: 11,
  premier: 12, dusk: 13, heal: 14, quick: 15, cherish: 16, park: 17 };
const SPA_CAPTURE_SKIP = [0, 2, 1, 3, 1, 1, 1, 1, 2, 3, 1, 0, 1, 0, 1, 1, 3];
const SPA_CAPTURE_COUNT = [5, 5, 5, 5, 5, 6, 5, 5, 5, 7, 6, 5, 5, 5, 6, 6, 5];
const SPA_OPEN_COUNT = [5, 4, 3, 3, 3, 4, 3, 4, 3, 5, 4, 3, 3, 3, 4, 4, 3];
const worldAt = (x, y) => [(x - 190 + 61) * 172, (70 - y + 30) * 172, 0];
function makeFx(fx) {
  const sys = new SplSystem(D.spa[fx.spa], fx.seed);
  for (const i of fx.list) sys.emit(i, fx.pos);
  return sys;
}
function fxDuration(fx) {
  const sys = makeFx(fx);
  let n = 0;
  while (sys.alive() && n < 200) { sys.step(); n++; }
  return n;
}
function drawEffects(an, f) {
  for (const fx of an.plan.fx) {
    const n = f - fx.f0 + 1;
    if (n < 1 || n > fx.dur) continue;
    const sys = makeFx(fx);
    for (let i = 0; i < n; i++) sys.step();
    splDraw(ctx, sys, IMG.spa_atlas);
  }
}

// ---------------------------------------------------------------- 戦闘画面
const cv = $('scene');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;
const scene = { introT0: 0, anim: null, msg: '' };

function fitScreen() {
  const w = $('screen').clientWidth;
  $('screenInner').style.transform = `scale(${w / 256})`;
}
new ResizeObserver(fitScreen).observe($('screen'));

const easeOut = (x) => 1 - (1 - x) ** 3;
const MON_ANIM_MS = 560;  // 台座が止まって相手が動き出すまで

// 主人公の投げる動き（back_anim.json のコマと長さ。1=1/60秒）。4コマ目で手からボールが離れる
const BACK_SEQ = [[0, 8], [1, 16], [2, 6], [3, 2], [4, 4], [5, 2], [6, 2], [7, 56]];
const RELEASE_MS = (8 + 16 + 6 + 2) * 1000 / 60;

// 投げたボールの動き（ov12_02235E94.c。1コマ=1/30秒）
const BF = 1000 / 30;
const HAND = [null, [-34, 4], [-28, -11]];  // 手を離すまでのボールの位置（主人公の中心から。投げる動きのコマ 1, 2）
const TUMBLE = [0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 6, 6, 6, 6, 7, 7];
const BOUNCE = [[-7, 1], [-5, 0], [-3, 0], [-2, 0], [2, 0], [3, 0], [5, 0], [7, 1], [-5, 1], [-3, 0], [-2, 0], [2, 0], [3, 0], [5, 1],
  [-2, 0], [-1, 1], [1, 0], [2, 0], [-2, 1], [2, 1]];
const BOUNCE_SE = { 0: 'bounce1', 7: 'bounce1', 13: 'bounce2', 17: 'bounce3', 19: 'bounce4' };
// ボールから出入りする時にポケモンを染める色（sFadeColors。ぼんぐりボールは表が見つからないのでモンスターボールの色）
const BALL_FADE = Object.fromEntries(Object.entries({
  master: [23, 20, 28], ultra: [31, 31, 15], great: [16, 23, 30], poke: [31, 22, 30], safari: [23, 30, 20], net: [21, 31, 25],
  dive: [12, 25, 30], nest: [30, 27, 10], repeat: [31, 24, 16], timer: [29, 30, 30], luxury: [31, 17, 10], premier: [31, 9, 10],
  dusk: [14, 14, 17], heal: [31, 24, 28], quick: [17, 26, 31], cherish: [30, 8, 5],
}).map(([k, c]) => [k, `rgb(${c.map((v) => Math.round(v * 255 / 31)).join(',')})`]));
const WOBBLE = [[-2, 0, 2, 2, 0, -2], [-1, 0, 1, 1, 0, -1], [-1, 0, 1, 1, 0, -1, 0, 0, 0, 0, 0]];
function ballPlan(visual, caught, ball) {
  const bi = (BALL_ITEM[ball] || 4) - 1;
  const seed = (Math.random() * 0x100000000) >>> 0;
  const p = { hit: 17, fx: [] };
  p.squash = p.hit + 10; p.open = p.hit + 20; p.shrink = p.hit + 23;
  // ボールが開ききったら、そのボールの光（捕まえた時用の1つを除く全部）。消えたら閉じる
  const skip = SPA_CAPTURE_SKIP[bi];
  const openFx = { spa: 0x13 + bi, list: [...Array(SPA_CAPTURE_COUNT[bi]).keys()].filter((i) => i !== skip), pos: worldAt(192, 56), f0: p.open + 1, seed };
  openFx.dur = fxDuration(openFx);
  p.fx.push(openFx);
  p.close = Math.max(openFx.f0 + openFx.dur, p.shrink + 9) + 1;
  p.glow = p.close + 3; p.drop = p.glow + 14; p.bounce = p.drop + 11;
  p.shakes = [];
  let s = p.bounce + 21, end = s;
  for (let i = 0; i < visual; i++) {
    p.shakes.push(s + 16);
    end = s + 16 + WOBBLE[i].length;
    s = end + 13;
  }
  p.end = visual ? end + 13 : end;
  if (caught) {
    p.click = p.end + 12;
    const cfx = { spa: 0x13 + bi, list: [skip], pos: worldAt(192, 88), f0: p.click + 3, seed: seed + 1 };
    cfx.dur = fxDuration(cfx);
    p.fx.push(cfx);
    p.msg = Math.max(p.click + 30, cfx.f0 + cfx.dur);
  } else {
    p.pop = p.end + 20;
    // ボールから出る時の光（相手の位置から少しずらした所。ov12_02236520）
    const ofx = { spa: 1 + bi, list: [...Array(SPA_OPEN_COUNT[bi]).keys()], pos: [Math.round(2.5 * 4096) + 860, Math.round(0.75 * 4096) - 1204, 0], f0: p.pop, seed: seed + 2 };
    ofx.dur = fxDuration(ofx);
    p.fx.push(ofx);
    p.msg = p.pop + Math.max(40, ofx.dur + 2);
  }
  return p;
}

// 体力ゲージの部品（healthbar.c の HealthbarPart の並び）
const PART = { green: 2, yellow: 11, red: 20, healthy: 38, par: 41, frz: 44, slp: 47, psn: 50, brn: 53, caught: 59,
  lvTop: { f: 60, m: 62, n: 64 }, lvBot: { f: 72, m: 74, n: 76 } };
const HB = { x: -6, y: 8 };  // 相手の枠の左上（枠の中心が画面(58,36)）
// DP の部品の並び（ov11_0225ECE8）。Lv は1段。状態アイコンの番号はプラチナと同じ
const PART_DP = { green: 2, yellow: 11, red: 20, healthy: 56, caught: 59, lv: { f: 60, m: 62, n: 64 } };

function hpPixels(H, M) {
  if (H >= M) return 48;
  return Math.max(H > 0 ? 1 : 0, fl(H * 48 / M));
}
function part(g, idx, x, y) {
  g.drawImage(IMG.hb_parts, idx * 8, 0, 8, 8, x, y, 8, 8);
}
function genderOf() {
  const r = SP[st.dex].g;
  if (r === 255) return 'n';
  if (r === 254) return 'f';
  if (r === 0) return 'm';
  return st.fg;
}

function drawHealthbox(c) {
  const dp = GAME[st.game].set === 'dp';
  const box = dp ? IMG.hb_enemy_dp : IMG.hb_enemy;
  if (!box) return;
  const g = ctx;
  const ox = HB.x, oy = HB.y;
  const parts = dp ? IMG.hb_parts_dp : IMG.hb_parts;
  const put = (img, idx, x, y) => g.drawImage(img, idx * 8, 0, 8, 8, x, y, 8, 8);
  g.drawImage(box, ox, oy);
  // なまえ：システムフォント（TEXT_COLOR(14, 2, 15)。Pt は白い字、DP は濃い字になる）
  const pal = dp ? D.hbpal_dp : D.hbpal;
  drawString(g, 'sys', SP[st.dex].name, ox + 8, oy + 16, pal[14], pal[2]);
  // Lv と性別、レベルの数字（8x8 の特殊文字を 4 ドット下げて左詰め）
  const gd = genderOf();
  if (dp) {
    put(parts, PART_DP.lv[gd], ox + 72, oy + 20); put(parts, PART_DP.lv[gd] + 1, ox + 80, oy + 20);
  } else {
    put(parts, PART.lvTop[gd], ox + 72, oy + 16); put(parts, PART.lvTop[gd] + 1, ox + 80, oy + 16);
    put(parts, PART.lvBot[gd], ox + 72, oy + 24); put(parts, PART.lvBot[gd] + 1, ox + 80, oy + 24);
  }
  const dg = dp ? IMG.hb_digits_dp : IMG.hb_digits;
  [...String(st.level)].forEach((d, i) => g.drawImage(dg, +d * 8, 0, 8, 8, ox + 88 + i * 8, oy + 20, 8, 8));
  // HPバー 6マス
  const P = dp ? PART_DP : PART;
  const px = hpPixels(c.H, c.M);
  const base = c.H >= c.M || px > 24 ? P.green : px > 9 ? P.yellow : P.red;
  for (let i = 0; i < 6; i++) put(parts, base + Math.max(0, Math.min(8, px - i * 8)), ox + 56 + i * 8, oy + 32);
  // つかまえたことがある印と、状態のアイコン（3マス）
  if (st.repeat && !c.entry.safari) put(parts, P.caught, ox + 8, oy + 32);
  for (let i = 0; i < 3; i++) {
    if (c.status === 'none') put(parts, P.healthy + i, ox + 16 + i * 8, oy + 32);
    else put(parts, PART[c.status] + i, ox + 16 + i * 8, oy + 32);
  }
  const hit = $('hbHit');
  hit.setAttribute('aria-valuemax', c.M);
  hit.setAttribute('aria-valuenow', c.H);
}

function draw(t) {
  const game = GAME[st.game];
  const e = curEntry();
  const c = ctxNow();
  const time = TIMES[st.time];
  const pal = [0, 1, 2, 3, 4, 5].includes(e.bb) ? time.pal : 0;
  const tpal = ['grass', 'water', 'path', 'ice', 'rocky', 'snow', 'sand', 'marsh', 'puddle'].includes(e.bg) ? time.pal : 0;
  ctx.clearRect(0, 0, 256, 192);
  const dpbg = game.set === 'dp' && e.bb < 12 ? IMG[`bg_dpb${e.bb}_${pal}`] : null;
  const bg = dpbg || IMG[`bg_b${e.bb}_${pal}`] || IMG.bg_b0_0;
  if (bg) ctx.drawImage(bg, 0, 0);
  // 台座は左右から滑り込む（相手側の中心 192,88、自分側の中心 64,136）
  const since = t - scene.introT0;
  const cryAt = MON_ANIM_MS + SP[st.dex].an[2] * BF;
  if (!scene.cried && since >= cryAt) { scene.cried = true; if (since < cryAt + 1000) cry(st.dex); }
  const k = Math.min(1, since / 540);
  const slide = Math.round((1 - easeOut(k)) * 256);
  const ep = IMG[`bg_e_${e.bg}_${tpal}`], pp = IMG[`bg_p_${e.bg}_${tpal}`];
  if (ep && e.bg !== 'distortion') ctx.drawImage(ep, 128 - slide, 56);
  // 相手（中心 x=192、y=50+高さ補正）
  const an = scene.anim;
  // 吸いこまれる時はボールの色に染まりながら縮み、飛び出す時はその色で大きくなってから色が抜ける（battle_display.c）
  const s = SP[st.dex];
  let cx = 192 - slide, cy = 50 + s.y;
  let monScale = 1, monVisible = true, tint = 0, animN = fl((since - MON_ANIM_MS) / BF);
  if (an) {
    const f = fl((t - an.t0 - an.rel) / BF), p = an.plan;
    if (f >= p.shrink) {
      const j = f - p.shrink + 1;
      monScale = Math.max(0, 1 - j / 8);
      monVisible = monScale > 0;
      tint = Math.min(16, j) / 16;
      cy -= Math.min(j, Math.max(0, s.y));
    }
    if (p.pop !== undefined && f >= p.pop) {
      const j = f - p.pop + 1;
      monScale = Math.min(1, j / 8);
      monVisible = true;
      cy = 50 + s.y + (40 - s.ya) * (1 - monScale);
      tint = j <= 8 ? 1 : Math.max(0, 16 - fl((j - 8) / 2)) / 16;
      animN = j - 8;
    }
  }
  if (monVisible) {
    const ps = animN > 0 ? monPose(st.dex, animN) : { frame: 0, x: 0, y: 0, sx: 1, sy: 1, rot: 0, px: 0, py: 0, fade: null };
    const origin = e.msg === 'distortion' && IMG.giratina_o;
    const img = origin ? originSprite(ps.frame, st.shiny) : sprite(st.dex, ps.frame, st.shiny);
    const w = 80 * monScale * ps.sx, h = 80 * monScale * ps.sy;
    const mx = cx + ps.x + (origin ? 1 : 0), my = cy + ps.y - (origin ? 1 : 0);
    const paint = (im) => {
      ctx.save();
      ctx.translate(Math.round(cx + ps.px), Math.round(cy + ps.py));
      ctx.rotate(ps.rot);
      ctx.translate(-Math.round(cx + ps.px), -Math.round(cy + ps.py));
      ctx.translate(Math.round(mx), Math.round(my));
      ctx.scale(Math.sign(w) || 1, Math.sign(h) || 1);
      ctx.drawImage(im, -Math.round(Math.abs(w) / 2), -Math.round(Math.abs(h) / 2), Math.round(Math.abs(w)), Math.round(Math.abs(h)));
      ctx.restore();
    };
    paint(img);
    const key = `${st.dex}_${ps.frame}_${st.shiny}_${origin ? 'o' : ''}`;
    if (tint > 0) {
      ctx.save();
      ctx.globalAlpha = tint;
      paint(tinted(img, BALL_FADE[an.ball] || BALL_FADE.poke, key));
      ctx.restore();
    }
    if (ps.fade) {
      ctx.save();
      ctx.globalAlpha = ps.fade.a;
      paint(tinted(img, ps.fade.col, key));
      ctx.restore();
    }
  }
  let backFrame = -1;
  if (pp) ctx.drawImage(pp, -64 + slide, 120);
  // ボールの光は 3D の層なので、主人公・体力ゲージ・メッセージ窓より下
  if (an) drawEffects(an, fl((t - an.t0 - an.rel) / BF));
  // 主人公（中心 64,112 の 80x80）
  const back = IMG['back_' + (window.__back || game.back)] && game.back ? IMG['back_' + (window.__back || game.back)] : null;
  if (back) {
    let bf = 0;
    if (an) {
      let at = (t - an.t0) / (1000 / 60);
      bf = 7;
      for (const [f, n] of BACK_SEQ) { if (at < n) { bf = f; break; } at -= n; }
      backFrame = bf;
    }
    if (back.height < 160) bf = 0;
    ctx.drawImage(back, 0, bf * 80, 80, 80, 24 + slide, 72, 80, 80);
  }
  if (since > 500) drawHealthbox(c);
  if (IMG.msgbox) ctx.drawImage(IMG.msgbox, 0, 144);
  // メッセージ（ウィンドウ (2,19) マスの位置、メッセージフォント、行の高さ16）
  drawString(ctx, 'msg', scene.msg, 16, 152, [90, 90, 82], [172, 189, 189]);
  if (an) drawBall(t, backFrame);
}

function drawBall(t, backFrame) {
  const an = scene.anim;
  const img = IMG['ball_' + an.ball + '_spr'];
  if (!img) return;
  const p = an.plan;
  const f = fl((t - an.t0 - an.rel) / BF);
  if (cue(an, 'throw', f, 0)) sfx('throw');
  if (cue(an, 'hit', f, p.hit)) sfx('hit');
  for (const [j, se] of Object.entries(BOUNCE_SE)) if (cue(an, 'b' + j, f, p.bounce + +j)) sfx(se);
  p.shakes.forEach((sx, i) => { if (cue(an, 's' + i, f, sx + 4)) sfx('shake'); });
  if (an.caught && cue(an, 'click', f, p.click)) sfx('click');
  if (!an.caught && cue(an, 'open', f, p.pop)) sfx('open');
  if (!an.caught && cue(an, 'cry', f, p.pop + 8 + SP[st.dex].an[2])) cry(st.dex);
  if (cue(an, 'msg', f, p.msg)) finishThrow(t);
  if (an.caught && cue(an, 'jingle', f, p.msg)) sfx('caught');

  let bx, by, fr = 0, rot = 0, open = false, glow = 0;
  if (f < 0) {
    // 手を離すまでは主人公の手の中
    const h = HAND[backFrame];
    if (!h) return;
    bx = 64 + h[0]; by = 112 + h[1];
  } else if (f < 16) {
    // 手元から相手へ 16 コマ。まっすぐ進みながら半円ぶん（高さ 64）持ち上がり、45度ずつ回る
    const i = f + 1;
    bx = 114 + fl(78 * i / 16);
    by = 100 + fl(-44 * i / 16) + Math.round(64 * Math.cos(Math.PI / 2 + Math.PI * i / 16));
    fr = TUMBLE[f % TUMBLE.length];
    rot = an.rot0 + i * Math.PI / 4;
  } else {
    bx = 192; by = 56;
    if (f >= p.squash && f < p.open) fr = 8;
    else if (f >= p.open && f < p.close) open = true;
    if (f >= p.glow && f < p.glow + 12) glow = (1 - Math.abs(f - p.glow - 6) / 6) * 12 / 16;
    if (f >= p.drop) by = 56 + fl(32 * Math.min(10, f - p.drop + 1) / 10);
    const j = f - p.bounce;
    if (j >= 0 && j < BOUNCE.length) {
      for (let k = 0; k <= j; k++) by += BOUNCE[k][0];
      fr = BOUNCE[j][1] ? 8 : 0;
    }
    p.shakes.forEach((sx, i) => {
      const w = f - sx;
      if (w < 0 || w >= WOBBLE[i].length) return;
      let dx = 0;
      for (let k = 0; k <= w; k++) dx += WOBBLE[i][k];
      bx += dx; rot = dx * 2 * Math.PI / 180;
    });
    if (p.pop !== undefined && f >= p.pop) {
      if (f >= p.pop + 10) return;
      open = true;
    }
  }
  ctx.save();
  ctx.translate(Math.round(bx), Math.round(by));
  ctx.rotate(rot);
  const dark = an.caught && f >= p.click;
  if (dark) ctx.filter = `brightness(${1 - Math.min(1, (f - p.click + 1) / 2) * 10 / 16})`;
  const src = open ? [144, 0, 32] : [fr * 16, 0, 16];
  ctx.drawImage(img, src[0], src[1], src[2], src[2], -src[2] / 2, -src[2] / 2, src[2], src[2]);
  if (glow > 0) {
    ctx.filter = 'none';
    ctx.globalAlpha = glow;
    ctx.drawImage(tinted(img, '#ffde00', 'ball' + an.ball), src[0], src[1], src[2], src[2], -src[2] / 2, -src[2] / 2, src[2], src[2]);
  }
  ctx.restore();
}

let last = 0;
function loop(t) {
  last = t;
  if (ATLAS.pt) draw(t);
  if (scene.anim && scene.anim.done && t - scene.anim.doneT > (scene.anim.caught ? 7600 : 1500)) {
    const caught = scene.anim.caught;
    scene.anim = null;
    $('btnThrow').disabled = false;
    if (caught) { scene.introT0 = t; scene.cried = false; setMsg(introMsg()); }
  }
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------- 効果音（日本版プラチナの音源から書き出したもの）
const SFX = { ctx: null, buf: {}, on: false, playing: [] };
try { SFX.on = localStorage.getItem('gen4catch.sfx') === '1'; } catch (e) { /* 保存できない環境 */ }
async function sfxInit() {
  if (SFX.ctx) { if (SFX.ctx.state === 'suspended') SFX.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  SFX.ctx = new AC();
  await Promise.all(Object.keys(A).filter((k) => k.startsWith('sfx_')).map(async (k) => {
    const bin = Uint8Array.from(atob(A[k].split(',')[1]), (ch) => ch.charCodeAt(0));
    SFX.buf[k.slice(4)] = await SFX.ctx.decodeAudioData(bin.buffer);
  }));
}
function sfx(name) {
  playBuf(SFX.buf[name]);
}
function playBuf(buf) {
  if (!SFX.on || !SFX.ctx || !buf) return;
  const src = SFX.ctx.createBufferSource();
  src.buffer = buf;
  const g = SFX.ctx.createGain();
  g.gain.value = 0.55;
  src.connect(g).connect(SFX.ctx.destination);
  src.start();
  SFX.playing.push(src);
}
// 鳴き声（cries/NNN.wav。はじめて鳴らすときに読み込む）
const CRY = {};
function loadCry(dex) {
  if (!SFX.ctx) return null;
  if (!CRY[dex]) {
    CRY[dex] = fetch(`cries/${String(dex).padStart(3, '0')}.wav`).then((r) => r.arrayBuffer())
      .then((b) => SFX.ctx.decodeAudioData(b)).catch(() => null);
  }
  return CRY[dex];
}
function cry(dex) {
  const p = SFX.on && loadCry(dex);
  if (p) p.then(playBuf);
}
function stopSfx() {
  for (const s of SFX.playing) { try { s.stop(); } catch (e) { /* もう止まっている */ } }
  SFX.playing = [];
}
function cue(an, key, at, when) {
  if (at >= when && !an.fired[key]) { an.fired[key] = true; return true; }
  return false;
}

// ---------------------------------------------------------------- メッセージ（日本版プラチナの戦闘メッセージ）
function setMsg(s) { scene.msg = s; $('msgText').textContent = s.replace(/\n/g, ''); }
function introMsg() {
  const e = curEntry();
  const name = SP[st.dex].name;
  if (e.msg === 'distortion') return `やぶれたせかいの\n${name}が　あらわれた！`;
  if (e.msg === 'legend' || e.msg === 'event') return `やせいの\n${name}が　あらわれた！`;
  if (e.method === 'honey') return `あ！　ミツを　ぬった　きから\n${name}が　あらわれた！`;
  return `あ！　やせいの\n${name}が　とびだしてきた！`;
}
const FAIL_MSG = [
  'だめだ！　ポケモンが\nボールから　でてしまった！',
  'ああ！\nつかまえたと　おもったのに！',
  'ざんねん！\nもうすこしで　つかまえられたのに！',
  'おしい！\nあと　ちょっとの　ところだったのに！',
];

function throwBall() {
  if (scene.anim) return;
  const c = ctxNow();
  const r = calc(c, st.ball);
  if (!r) return;
  let k = 0;
  if (r.p >= 1) k = 4;
  else while (k < 4 && Math.random() < r.p1) k++;
  const caught = k === 4;
  stopSfx();
  const visual = caught ? 3 : k;
  scene.anim = { t0: performance.now(), rel: RELEASE_MS, ball: st.ball, k, caught, visual, plan: ballPlan(visual, caught, st.ball),
    rot0: fl(Math.random() * 8) * Math.PI / 4, done: false, fired: {} };
  $('btnThrow').disabled = true;
  const player = GAME[st.game].player;
  setMsg(`${player}は\n${BALL[st.ball].name}ボールを　つかった！`);
}

function finishThrow(t) {
  const an = scene.anim;
  an.done = true;
  an.doneT = t;
  tally.n++;
  if (an.caught) {
    tally.ok++;
    setMsg(`やったー！\n${SP[st.dex].name}を　つかまえたぞ！`);
  } else {
    setMsg(FAIL_MSG[an.k]);
  }
  renderTally();
}
function renderTally() {
  $('tally').textContent = tally.n ? `${tally.n}回投げて${tally.ok}匹（${(tally.ok / tally.n * 100).toFixed(1)}%）` : 'まだ投げていません';
}

// ---------------------------------------------------------------- 画面更新
let ENTRIES = [];
function curEntry() { return ENTRIES[st.entry] || ENTRIES[0]; }

function entryAvailable(e, time) {
  return !e.pct || e.pct[TIMES[time].enc] > 0;
}
function refreshEntries(keepLevel) {
  ENTRIES = entriesFor(st.game, st.dex, st.free);
  if (st.entry >= ENTRIES.length) st.entry = 0;
  const e = curEntry();
  if (!keepLevel || st.level < e.min || st.level > e.max) st.level = e.free ? 50 : e.min;
  if (!entryAvailable(e, st.time)) st.time = [1, 0, 3, 2].find((t) => entryAvailable(e, t)) ?? st.time;
  if (e.safari) st.ball = 'safari';
  else if (e.contest) st.ball = 'sport';
  else if (st.ball === 'safari' || st.ball === 'sport') st.ball = 'ultra';
  if (BALL[st.ball].hgss && !GAME[st.game].hgss) st.ball = 'ultra';
}

function renderGames() {
  const nav = $('games');
  nav.innerHTML = '';
  for (const g of GAMES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'game';
    b.style.setProperty('--c', g.color);
    b.textContent = g.name;
    b.setAttribute('aria-pressed', String(g.id === st.game));
    b.addEventListener('click', () => setGame(g.id));
    nav.append(b);
  }
}

function setGame(id) {
  st.game = id;
  st.free = GAME[id].all ? true : $('optFree').checked;
  $('freeWrap').hidden = !!GAME[id].all;
  st.dex = GAME[id].def;
  st.entry = 0; st.acts = []; st.repeat = false;
  refreshEntries(false);
  renderGames();
  intro();
  renderAll();
}
function setMon(dex) {
  st.dex = dex;
  st.entry = 0; st.acts = [];
  refreshEntries(false);
  intro();
  renderAll();
}
function intro() {
  scene.introT0 = performance.now();
  scene.cried = false;
  if (SFX.on) sfxInit().then(() => loadCry(st.dex));
  scene.anim = null;
  stopSfx();
  $('btnThrow').disabled = false;
  tally.n = tally.ok = 0;
  renderTally();
  setMsg(introMsg());
}

function renderMonField() {
  const s = SP[st.dex];
  $('monInput').value = `${String(st.dex).padStart(3, '0')} ${s.name}`;
  const ic = $('monIcon').getContext('2d');
  ic.clearRect(0, 0, 32, 32);
  if (IMG.icons) ic.drawImage(IMG.icons, ((st.dex - 1) % 32) * 32, fl((st.dex - 1) / 32) * 32, 32, 32, 0, 0, 32, 32);
  const meta = $('monMeta');
  meta.innerHTML = '';
  for (const t of s.types) {
    const b = document.createElement('span');
    b.className = 'type';
    b.style.background = TYPE_COLOR[t];
    b.textContent = t;
    meta.append(b);
  }
  const add = (html) => { const sp = document.createElement('span'); sp.innerHTML = html; meta.append(sp); return sp; };
  add(`捕獲率 <b>${s.rate}</b>`);
  add(`HP種族値 ${s.hp}`);
  if (s.g > 0 && s.g < 254) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pill';
    b.textContent = st.fg === 'm' ? '♂' : '♀';
    b.title = '相手の性別を切り替える';
    b.addEventListener('click', () => { st.fg = st.fg === 'm' ? 'f' : 'm'; renderAll(); });
    meta.append(b);
  }
}

function renderPlaces() {
  const box = $('places');
  box.innerHTML = '';
  $('placeCount').textContent = st.free ? '条件を無視して計算中' : `${ENTRIES.length}件`;
  const te = TIMES[st.time].enc;
  ENTRIES.forEach((e, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'place';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(i === st.entry));
    const lv = e.min === e.max ? `Lv${e.min}` : `Lv${e.min}–${e.max}`;
    let pct = '';
    if (e.pct) {
      const same = e.pct[0] === e.pct[1] && e.pct[1] === e.pct[2];
      pct = `<small>${same ? e.pct[0] + '%' : ['朝', '昼', '夜'].map((n, k) => `${n}${e.pct[k]}`).join(' ')}</small>`;
    }
    b.innerHTML = `${svg(e.icon)}<span class="pn">${e.title}${e.sub ? `<small>${e.sub}</small>` : ''}</span><span class="pr">${lv}${pct}</span>`;
    b.addEventListener('click', () => {
      st.entry = i; st.acts = [];
      refreshEntries(true);
      intro();
      renderAll();
    });
    box.append(b);
  });
}

function renderTimes() {
  const box = $('times');
  box.innerHTML = '';
  const e = curEntry();
  for (const t of TIMES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(st.time === t.id));
    b.disabled = !entryAvailable(e, t.id);
    b.innerHTML = `${t.name}<small>${t.hours}</small>`;
    b.title = b.disabled ? 'この時間帯には出てこない' : '';
    b.addEventListener('click', () => { st.time = t.id; renderAll(); });
    box.append(b);
  }
  $('timeNote').textContent = e.pct && !(e.pct[0] === e.pct[1] && e.pct[1] === e.pct[2]) ? '時間帯で出現率が変わる' : '背景とダークボールに影響';
}

function renderSliders(c) {
  const e = c.entry;
  const lv = $('lvRange');
  lv.min = e.min; lv.max = e.max; lv.value = st.level;
  lv.disabled = e.min === e.max;
  $('lvOut').textContent = 'Lv' + st.level;
  $('ivRange').value = st.iv;
  $('ivOut').textContent = st.iv;
  const hp = $('hpRange');
  hp.max = c.M; hp.value = c.H;
  hp.disabled = !!e.safari;
  $('hpOut').textContent = `${c.H} / ${c.M}`;
  $('hpChips').querySelectorAll('button').forEach((b) => { b.disabled = !!e.safari; });
  $('hpHint').textContent = e.safari ? 'サファリでは攻撃できないので、HPはまんタンのまま' : '画面のHPバーをドラッグしても変えられます';
}

function renderStatus(c) {
  const box = $('statusGrid');
  box.innerHTML = '';
  for (const s of STATUS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'st';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(c.status === s.id));
    b.disabled = !!c.entry.safari && s.id !== 'none';
    b.innerHTML = `<span class="badge" style="background:${s.color}">${s.name}</span><span class="mul">${s.mul}</span>`;
    b.addEventListener('click', () => { st.status = s.id; renderAll(); });
    box.append(b);
  }
  $('stNote').textContent = c.entry.safari ? 'サファリでは変えられません' : '';
}

function pctText(p) {
  if (p >= 1) return '100';
  if (p <= 0) return '0';
  if (p >= 0.9995) return (p * 100).toFixed(2);
  if (p < 0.001) return (p * 100).toFixed(3);
  return (p * 100).toFixed(1);
}

function renderBalls(c) {
  const box = $('ballGrid');
  box.innerHTML = '';
  let best = null, bestP = -1;
  const rows = [];
  for (const b of BALLS) {
    const info = ballInfo(b.id, c);
    if (!info) continue;
    const r = info.off ? null : calc(c, b.id);
    rows.push({ b, info, r });
    if (r && b.id !== 'master' && r.p > bestP + 1e-12) { bestP = r.p; best = b.id; }
  }
  const cur = ballInfo(st.ball, c);
  if (!cur || cur.off) st.ball = rows.find((x) => !x.info.off && x.b.id !== 'master')?.b.id || 'master';
  for (const { b, info, r } of rows) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'ball' + (b.id === best && bestP < 1 && rows.filter((x) => x.r).length > 2 ? ' best' : '');
    el.setAttribute('role', 'radio');
    el.setAttribute('aria-checked', String(st.ball === b.id));
    el.disabled = !!info.off;
    el.title = info.off || '';
    const mul = info.master ? '確定' : info.off ? '—' : info.rate ? `捕獲率${info.rate[0] === 'x' ? '×' + info.rate.slice(1) : info.rate}` : '×' + (info.m / 10).toFixed(1);
    el.innerHTML = `<img src="${A['ball_' + b.id]}" alt=""><span class="bn">${b.name}</span><span class="bm">${mul}</span><span class="bp">${r ? pctText(r.p) + '%' : ''}</span>`;
    el.addEventListener('click', () => { st.ball = b.id; renderAll(); });
    box.append(el);
  }
  $('throwIcon').src = A['ball_' + st.ball];
}

function renderConditions(c) {
  const e = c.entry;
  const g = GAME[st.game];
  $('condTimer').hidden = !!e.safari;
  $('turnRange').value = st.turn;
  $('turnOut').textContent = st.turn >= 31 ? '31ターン目以降' : st.turn + 'ターン目';
  $('condRepeat').hidden = !!e.safari;
  $('optRepeat').checked = st.repeat;
  $('condLead').hidden = !g.hgss || !!e.safari || !!e.contest;
  $('leadLv').value = st.leadLv;
  $('leadLvOut').textContent = 'Lv' + st.leadLv;
  $('optSame').checked = st.same;
  $('genderSel').value = st.gsel;
  $('genderSel').disabled = !st.same || SP[st.dex].g === 255;
  const saf = $('condSafari');
  saf.hidden = !e.safari;
  if (e.safari && c.safari) {
    const s = c.safari;
    $('safariTitle').textContent = g.hgss ? 'サファリゾーンの行動' : 'だいしつげんの行動';
    const btns = $('safariBtns');
    btns.innerHTML = '';
    const mk = (icon, label, fn, cls) => {
      const b = document.createElement('button');
      b.type = 'button';
      if (cls) b.className = cls;
      b.innerHTML = `${svg(icon)}<span>${label}</span>`;
      b.addEventListener('click', () => { fn(); renderAll(); });
      btns.append(b);
    };
    mk('bait', 'エサ', () => st.acts.push('bait'), 'primary');
    mk('mud', 'どろ', () => st.acts.push('mud'), 'primary');
    mk('undo', 'ひとつ戻す', () => st.acts.pop());
    mk('reset', '最初から', () => { st.acts = []; });
    $('safariFactor').textContent = `捕獲率 ${s.rate}`;
    $('mCatch').style.width = (s.c / 12 * 100) + '%';
    $('mCatchV').textContent = `${s.c - 6 >= 0 ? '+' : ''}${s.c - 6}`;
    $('mFlee').style.width = (s.flee * 100) + '%';
    $('mFleeV').textContent = pctText(s.flee) + '%';
    const lab = (x) => `${x.c - 6 >= 0 ? '+' : ''}${x.c - 6}/${x.e - 6 >= 0 ? '+' : ''}${x.e - 6}`;
    $('safariLog').innerHTML = '<li>はじめ<b>±0/±0</b></li>' + s.log.map((x) => `<li>${SAFARI_ACT[x.a]}<b>${lab(x)}</b></li>`).join('');
    const res = solveSafari(c.dex, st.balls);
    $('sbBalls').value = st.balls;
    $('sbBallsOut').textContent = st.balls;
    $('sbNum').innerHTML = `${pctText(res.best)}<small>%</small>`;
    $('sbSub').textContent = `ボールだけ投げ続けると ${pctText(res.only)}%`;
    const steps = [];
    for (const a of res.path) {
      const lastStep = steps[steps.length - 1];
      if (lastStep && lastStep.a === a) lastStep.n++;
      else steps.push({ a, n: 1 });
    }
    $('sbPath').innerHTML = steps.map((x) => `<li class="${x.a === 'ball' ? 'ball' : ''}">${SAFARI_ACT[x.a]}${x.n > 1 ? ' ×' + x.n : ''}</li>`).join('<span class="arr" aria-hidden="true">→</span>') + (res.path.length >= 14 ? '<span class="arr" aria-hidden="true">…</span>' : '');
  }
}

function fmtN(n) {
  if (n == null || !isFinite(n)) return '—';
  return n >= 10000 ? n.toLocaleString('ja-JP') : String(n);
}

function renderResult(c) {
  const sr = series(c, st.ball);
  if (!sr) return;
  const r = sr.base;
  $('pct').innerHTML = `${pctText(r.p)}<small>%</small>`;
  $('kExp').innerHTML = isFinite(sr.exp) ? `${sr.exp < 100 ? sr.exp.toFixed(2) : Math.round(sr.exp).toLocaleString('ja-JP')}<small>個</small>` : '—';
  for (const P of [50, 90, 99]) $('k' + P).innerHTML = sr.need[P] != null ? `${fmtN(sr.need[P])}<small>個</small>` : '—';
  const p1 = r.p1, q = 1 - p1;
  const parts = r.p >= 1 ? [0, 0, 0, 0, 1] : [q, p1 * q, p1 * p1 * q, p1 ** 3 * q, p1 ** 4];
  const cols = ['#c9432f', '#d77a36', '#d6a53a', '#9fae3d', 'var(--accent)'];
  const labels = ['ゆれずに出る', '1回ゆれて出る', '2回ゆれて出る', '3回ゆれて出る', '捕獲'];
  const bar = $('shakeBar');
  bar.innerHTML = '';
  const leg = $('shakeLegend');
  leg.innerHTML = '';
  parts.forEach((p, i) => {
    const sp = document.createElement('span');
    sp.style.width = (p * 100) + '%';
    sp.style.background = cols[i];
    sp.title = `${labels[i]} ${pctText(p)}%`;
    bar.append(sp);
    const li = document.createElement('li');
    li.innerHTML = `<i style="background:${cols[i]}"></i>${labels[i]} <b>${pctText(p)}%</b>`;
    leg.append(li);
  });
  $('shakeNote').textContent = r.p >= 1 ? '判定なしで確定' : '1球ごとに4回判定して、すべて通れば捕獲';
  renderCurve(sr);
  renderFormula(c, r);
}

function renderCurve(sr) {
  const el = $('curve');
  const W = 560, H = 190, L = 40, R = 16, T = 12, B = 30;
  const cum = sr.cum;
  let N = sr.need[99] != null ? sr.need[99] : cum.length;
  N = Math.max(5, Math.min(N, 120, cum.length || 5));
  if (sr.base.p >= 1) N = 5;
  const xs = (i) => L + (i - 1) / Math.max(1, N - 1) * (W - L - R);
  const ys = (p) => T + (1 - p) * (H - T - B);
  const val = (i) => (sr.base.p >= 1 ? 1 : cum[i - 1] ?? 1);
  let s = '';
  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${ys(p)}" y2="${ys(p)}"/><text x="${L - 6}" y="${ys(p) + 4}" text-anchor="end">${p * 100}%</text>`;
  }
  const step = N <= 10 ? 1 : N <= 30 ? 5 : N <= 60 ? 10 : 20;
  for (let i = 1; i <= N; i++) if (i === 1 || i % step === 0) s += `<text x="${xs(i)}" y="${H - 10}" text-anchor="middle">${i}</text>`;
  let d = '';
  for (let i = 1; i <= N; i++) d += (i === 1 ? 'M' : 'L') + xs(i).toFixed(1) + ' ' + ys(val(i)).toFixed(1);
  s += `<path class="area" d="${d}L${xs(N).toFixed(1)} ${ys(0)}L${xs(1).toFixed(1)} ${ys(0)}Z"/><path class="ln" d="${d}"/>`;
  const n90 = sr.need[90];
  if (n90 != null && n90 <= N) {
    s += `<line class="ref" x1="${xs(n90)}" x2="${xs(n90)}" y1="${ys(0)}" y2="${ys(val(n90))}"/><circle class="mk" cx="${xs(n90)}" cy="${ys(val(n90))}" r="4"/>`;
    s += `<text class="mk-t" x="${Math.min(xs(n90) + 8, W - R - 70)}" y="${ys(val(n90)) + 16}">${n90}個で${pctText(val(n90))}%</text>`;
  }
  el.innerHTML = s;
  $('curveNote').textContent = sr.turnDep ? `${st.turn}ターン目から毎ターン1個ずつ投げた場合` : '';
}

function row(k, v) { return `<div class="fx-row"><span class="k">${k}</span><code>${v}</code></div>`; }

function renderFormula(c, r) {
  const bi = r.bi;
  let h = '<div class="fx">';
  if (c.safari) {
    const f = c.safari;
    h += row('捕獲率 C', `⌊${SP[c.dex].rate}×${STAGE[f.c][0]}/${STAGE[f.c][1]}⌋ = <b>${c.rate}</b>（捕まえやすさ ${f.c - 6 >= 0 ? '+' : ''}${f.c - 6}）`);
  } else if (bi.rate) {
    h += row('捕獲率 C', `${SP[c.dex].rate} → ${BALL[st.ball].name}ボールで <b>${r.rate}</b>（${bi.rate[0] === 'x' ? '×' + bi.rate.slice(1) : bi.rate}、1〜255に収める）`);
  } else {
    h += row('捕獲率 C', `<b>${c.rate}</b>`);
  }
  if (r.master) {
    h += row('結果', 'マスターボールは判定せず<b>必ず捕まる</b>');
    $('formula').innerHTML = h + '</div>';
    return;
  }
  h += row('ボール B', `${bi.m}/10（×${(bi.m / 10).toFixed(1)}）`);
  h += row('最大HP M', c.dex === 292 ? 'ヌケニンは常に 1' : `⌊(2×${SP[c.dex].hp}+${st.iv})×${st.level}/100⌋+${st.level}+10 = <b>${c.M}</b>`);
  h += row('のこりHP H', `<b>${c.H}</b>`);
  h += row('a（HP込み）', `⌊⌊C×B/10⌋×(3M−2H)/3M⌋ = ⌊${r.a1}×${3 * c.M - 2 * c.H}/${3 * c.M}⌋ = <b>${r.a2}</b>`);
  h += row('じょうたい', `${STAT[c.status].name} ${r.smul} → a = <b>${r.a3}</b>`);
  if (r.sure) h += row('結果', 'a が 255 以上なので<b>必ず捕まる</b>');
  else if (r.zero) h += row('結果', 'a が 0 のため捕まらない');
  else {
    h += row('ゆれ判定値 b', `⌊1048560/⌊√⌊√⌊16711680/a⌋⌋⌋⌋ = ⌊1048560/⌊√⌊√${r.q}⌋⌋⌋ = ⌊1048560/${r.s2}⌋ = <b>${r.b}</b>`);
    h += row('1回の判定', `乱数(0〜65535) &lt; b となる確率 = ${r.b}/65536 = ${(r.p1 * 100).toFixed(3)}%`);
    h += row('捕獲率', `(b/65536)⁴ = <b>${pctText(r.p)}%</b>`);
  }
  $('formula').innerHTML = h + '</div>';
}

function renderAll() {
  const c = ctxNow();
  renderMonField();
  renderPlaces();
  renderTimes();
  renderSliders(c);
  renderStatus(c);
  renderBalls(c);
  renderConditions(c);
  renderResult(ctxNow());
}

// ---------------------------------------------------------------- 入力
function kata(s) {
  return s.replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60));
}
const combo = { open: false, items: [], idx: 0 };
function openList(q) {
  const list = $('monList');
  const pool = st.free ? Array.from({ length: 493 }, (_, i) => i + 1) : speciesFor(st.game);
  const k = kata(q.trim());
  const num = /^\d+$/.test(q.trim()) ? parseInt(q.trim(), 10) : null;
  combo.items = pool.filter((d) => (num != null ? String(d).startsWith(String(num)) : !k || SP[d].name.includes(k)));
  combo.idx = 0;
  list.innerHTML = '';
  if (!combo.items.length) list.innerHTML = '<li class="empty">見つかりません。' + (st.free ? '' : 'このソフトで出会えないポケモンは「出現条件を無視する」で選べます。') + '</li>';
  combo.items.forEach((d, i) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(i === combo.idx));
    li.innerHTML = `<img src="${iconURL(d)}" alt=""><span class="no">${String(d).padStart(3, '0')}</span><span class="nm">${SP[d].name}</span><span class="rt">捕獲率${SP[d].rate}</span>`;
    li.addEventListener('mousedown', (ev) => { ev.preventDefault(); pick(d); });
    list.append(li);
  });
  list.hidden = false;
  combo.open = true;
  $('monInput').setAttribute('aria-expanded', 'true');
}
function closeList() {
  $('monList').hidden = true;
  combo.open = false;
  $('monInput').setAttribute('aria-expanded', 'false');
}
function pick(d) { closeList(); $('monInput').blur(); setMon(d); }
function moveSel(dv) {
  if (!combo.items.length) return;
  combo.idx = (combo.idx + dv + combo.items.length) % combo.items.length;
  const lis = $('monList').querySelectorAll('li');
  lis.forEach((li, i) => li.setAttribute('aria-selected', String(i === combo.idx)));
  lis[combo.idx]?.scrollIntoView({ block: 'nearest' });
}

function bind() {
  const inp = $('monInput');
  inp.addEventListener('focus', () => { inp.select(); openList(''); });
  inp.addEventListener('input', () => openList(inp.value));
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!combo.open) openList(inp.value); else moveSel(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveSel(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (combo.items[combo.idx]) pick(combo.items[combo.idx]); }
    else if (e.key === 'Escape') { closeList(); inp.blur(); }
  });
  inp.addEventListener('blur', () => { setTimeout(() => { closeList(); renderMonField(); }, 120); });
  $('optFree').addEventListener('change', (e) => {
    st.free = e.target.checked;
    if (!st.free && !speciesFor(st.game).includes(st.dex)) st.dex = GAME[st.game].def;
    st.entry = 0;
    refreshEntries(true);
    intro();
    renderAll();
  });
  $('optShiny').addEventListener('change', (e) => { st.shiny = e.target.checked; });
  $('lvRange').addEventListener('input', (e) => { st.level = +e.target.value; renderAll(); });
  $('ivRange').addEventListener('input', (e) => { st.iv = +e.target.value; renderAll(); });
  $('hpRange').addEventListener('input', (e) => {
    const M = maxHP(st.dex, st.level, st.iv);
    st.hpFrac = +e.target.value <= 1 ? 0 : +e.target.value / M;
    renderAll();
  });
  $('hpChips').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const M = maxHP(st.dex, st.level, st.iv);
    st.hpFrac = { full: 1, half: Math.ceil(M / 2) / M, red: Math.max(1, fl(M * 0.2)) / M, one: 0 }[b.dataset.hp];
    renderAll();
  });
  $('turnRange').addEventListener('input', (e) => { st.turn = +e.target.value; renderAll(); });
  $('optRepeat').addEventListener('change', (e) => { st.repeat = e.target.checked; renderAll(); });
  $('leadLv').addEventListener('input', (e) => { st.leadLv = +e.target.value; renderAll(); });
  $('optSame').addEventListener('change', (e) => { st.same = e.target.checked; renderAll(); });
  $('genderSel').addEventListener('change', (e) => { st.gsel = e.target.value; renderAll(); });
  $('btnThrow').addEventListener('click', () => { sfxInit().then(throwBall); });
  $('optSfx').checked = SFX.on;
  $('sbBalls').addEventListener('input', (e) => { st.balls = +e.target.value; renderAll(); });
  $('optSfx').addEventListener('change', (e) => {
    SFX.on = e.target.checked;
    if (SFX.on) sfxInit();
    else stopSfx();
    try { localStorage.setItem('gen4catch.sfx', SFX.on ? '1' : '0'); } catch (err) { /* 保存できない環境 */ }
  });
  $('btnTallyReset').addEventListener('click', () => { tally.n = tally.ok = 0; renderTally(); });

  const bar = $('hbHit');
  const setFromX = (clientX) => {
    if (curEntry().safari) return;
    const rc = bar.getBoundingClientRect();
    const k = Math.max(0, Math.min(1, (clientX - rc.left) / rc.width));
    const M = maxHP(st.dex, st.level, st.iv);
    const hp = Math.max(1, Math.round(k * M));
    st.hpFrac = hp <= 1 ? 0 : hp / M;
    renderAll();
  };
  bar.addEventListener('pointerdown', (e) => { bar.setPointerCapture(e.pointerId); setFromX(e.clientX); });
  bar.addEventListener('pointermove', (e) => { if (bar.hasPointerCapture(e.pointerId)) setFromX(e.clientX); });
  bar.addEventListener('keydown', (e) => {
    const M = maxHP(st.dex, st.level, st.iv);
    const H = curHP(M);
    let v = null;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') v = H - 1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') v = H + 1;
    if (e.key === 'Home') v = 1;
    if (e.key === 'End') v = M;
    if (v == null || curEntry().safari) return;
    e.preventDefault();
    v = Math.max(1, Math.min(M, v));
    st.hpFrac = v <= 1 ? 0 : v / M;
    renderAll();
  });
}

// ---------------------------------------------------------------- 起動
async function start() {
  renderGames();
  bind();
  const keys = Object.keys(A).filter((k) => !k.startsWith('sfx_') && !k.startsWith('sprites_') && !k.startsWith('font_'));
  const imgs = await Promise.all(keys.map((k) => loadImg(A[k])));
  keys.forEach((k, i) => { IMG[k] = imgs[i]; });
  for (const set of ['dp', 'pt', 'hg']) ATLAS[set] = imgData(await loadImg(A['sprites_' + set]));
  FONT_MSG = imgData(await loadImg(A.font_msg));
  FONT_SYS = imgData(await loadImg(A.font_sys));
  const h = location.hash.slice(1);
  const hit = GAMES.find((g) => g.id.toLowerCase() === h.toLowerCase());
  if (hit) st.game = hit.id;
  if (st.game !== 'Pt') st.dex = GAME[st.game].def;
  setGame(st.game);
  requestAnimationFrame(loop);
}
refreshEntries(true);
start();
// 画面確認用（コンソールから状態を見る・動かす）
window.gen4 = { st, scene, renderAll, setGame, setMon, intro, throwBall, draw, ballPlan, loadCry, sfxInit, monPose };
})();
