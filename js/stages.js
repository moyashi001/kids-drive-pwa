// ステージ定義。
// trackType: 'spline' なら track.js の createTrack()(草原の自動生成コース)、
// 'tile'    なら cityTrack.js の createCityTrack(layout)(タイル道路の街コース)を使う。
// carSet:   'kenney' なら cars.js の25台、'toy' なら toyCars.js の8台を選択肢にする。

// ---- ステージ2: まちなか ストリート (5x3タイルの矩形ループ) ----
const CITY_LAYOUT = {
  groundColor: 0x8d9199,
  groundRadius: 7,
  groundCenter: [2, 1],
  roadWidthRatio: 0.55,
  tiles: [
    // 上辺 (gz=0)
    { type: 'road-bend', gx: 0, gz: 0, rotDeg: 0 },
    { type: 'road-straight', gx: 1, gz: 0, rotDeg: 90 },
    { type: 'road-straight', gx: 2, gz: 0, rotDeg: 90 },
    { type: 'road-straight', gx: 3, gz: 0, rotDeg: 90 },
    { type: 'road-bend', gx: 4, gz: 0, rotDeg: 270 },
    // 右辺 (gx=4)
    { type: 'road-straight', gx: 4, gz: 1, rotDeg: 0 },
    { type: 'road-bend', gx: 4, gz: 2, rotDeg: 180 },
    // 下辺 (gz=2)
    { type: 'road-straight', gx: 3, gz: 2, rotDeg: 90 },
    { type: 'road-straight', gx: 2, gz: 2, rotDeg: 90 },
    { type: 'road-straight', gx: 1, gz: 2, rotDeg: 90 },
    { type: 'road-bend', gx: 0, gz: 2, rotDeg: 90 },
    // 左辺 (gx=0)
    { type: 'road-straight', gx: 0, gz: 1, rotDeg: 0 },
  ],
  path: [
    [0, 0], [1, 0], [2, 0], [3, 0], [4, 0],
    [4, 1], [4, 2], [3, 2], [2, 2], [1, 2], [0, 2],
    [0, 1],
  ],
  buildings: [
    { type: 'building-e', gx: -1.9, gz: -1.3, rotDeg: 20, scale: 0.7 },
    { type: 'building-c', gx: 5.9, gz: -1.3, rotDeg: -20, scale: 0.7 },
    { type: 'building-h', gx: -1.9, gz: 3.3, rotDeg: -15, scale: 0.7 },
    { type: 'building-k', gx: 5.9, gz: 3.3, rotDeg: 15, scale: 0.7 },
    { type: 'building-b', gx: 1.3, gz: -1.9, rotDeg: 0, scale: 0.7 },
    { type: 'building-a', gx: 2.7, gz: -1.9, rotDeg: 0, scale: 0.7 },
    { type: 'building-d', gx: 1.3, gz: 3.9, rotDeg: 180, scale: 0.7 },
    { type: 'building-f', gx: 2.7, gz: 3.9, rotDeg: 180, scale: 0.7 },
  ],
};

// ---- ステージ3: こうじょう ちたい (L字/クランク型のコース。まちなかと形を変え、
// 道路で囲まれた内側の広いスペースに工場施設をまとめて置けるようにしている) ----
const INDUSTRIAL_LAYOUT = {
  groundColor: 0x7d7f7a,
  groundRadius: 8,
  groundCenter: [2.5, 2.5],
  roadWidthRatio: 0.55,
  tiles: [
    // 上辺 (gz=0), gx=0..5
    { type: 'road-bend', gx: 0, gz: 0, rotDeg: 0 },
    { type: 'road-straight', gx: 1, gz: 0, rotDeg: 90 },
    { type: 'road-straight', gx: 2, gz: 0, rotDeg: 90 },
    { type: 'road-straight', gx: 3, gz: 0, rotDeg: 90 },
    { type: 'road-straight', gx: 4, gz: 0, rotDeg: 90 },
    { type: 'road-bend', gx: 5, gz: 0, rotDeg: 270 },
    // 右辺上半分 (gx=5), gz=1..2
    { type: 'road-straight', gx: 5, gz: 1, rotDeg: 0 },
    { type: 'road-straight', gx: 5, gz: 2, rotDeg: 0 },
    { type: 'road-bend', gx: 5, gz: 3, rotDeg: 180 },
    // 中段の横道 (gz=3), gx=3..4 (右側から中央へ切り込む)
    { type: 'road-straight', gx: 4, gz: 3, rotDeg: 90 },
    { type: 'road-bend', gx: 3, gz: 3, rotDeg: 0 },
    // 中央の縦道 (gx=3), gz=4
    { type: 'road-straight', gx: 3, gz: 4, rotDeg: 0 },
    { type: 'road-bend', gx: 3, gz: 5, rotDeg: 180 },
    // 下辺 (gz=5), gx=0..2
    { type: 'road-straight', gx: 2, gz: 5, rotDeg: 90 },
    { type: 'road-straight', gx: 1, gz: 5, rotDeg: 90 },
    { type: 'road-bend', gx: 0, gz: 5, rotDeg: 90 },
    // 左辺 (gx=0), gz=1..4
    { type: 'road-straight', gx: 0, gz: 1, rotDeg: 0 },
    { type: 'road-straight', gx: 0, gz: 2, rotDeg: 0 },
    { type: 'road-straight', gx: 0, gz: 3, rotDeg: 0 },
    { type: 'road-straight', gx: 0, gz: 4, rotDeg: 0 },
  ],
  path: [
    [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0],
    [5, 1], [5, 2], [5, 3],
    [4, 3], [3, 3],
    [3, 4], [3, 5],
    [2, 5], [1, 5], [0, 5],
    [0, 4], [0, 3], [0, 2], [0, 1],
  ],
  buildings: [
    // 道路で囲まれた内側(クランクの凹み)にまとめて配置
    { type: 'water-tower', gx: 1.8, gz: 2.3, rotDeg: 0 },
    { type: 'chimney-large', gx: 1.1, gz: 2.3, rotDeg: 0 },
    { type: 'chimney-medium', gx: 2.5, gz: 1.5, rotDeg: 0 },
    { type: 'shipping-container-a', gx: 1.3, gz: 3.3, rotDeg: 10 },
    { type: 'shipping-container-b', gx: 2.2, gz: 3.6, rotDeg: -10 },
    // 外周の外側に飾り
    { type: 'windmill', gx: -1.6, gz: -1, rotDeg: 30 },
    { type: 'windmill-low', gx: 6.6, gz: -1, rotDeg: -20 },
    { type: 'building-n', gx: -1.6, gz: 5.8, rotDeg: -20, scale: 0.7 },
    { type: 'building-q', gx: 6.6, gz: 1.2, rotDeg: 20, scale: 0.7 },
  ],
};

export const STAGES = [
  {
    id: 'grassland',
    name: 'そうげん ループ',
    emoji: '🌳',
    description: 'いつもの コース。ひろい そうげんを ぐるっと いっしゅう！',
    trackType: 'spline',
    carSet: 'kenney',
    worldScale: 1,
    npcIds: ['taxi', 'van', 'suv-luxury', 'police'],
  },
  {
    id: 'city',
    name: 'まちなか ストリート',
    emoji: '🏙️',
    description: '街の なかを はしる コース。たてものに ぶつからないように！',
    trackType: 'tile',
    carSet: 'toy',
    worldScale: 0.24,
    layout: CITY_LAYOUT,
    npcIds: ['vehicle-suv', 'vehicle-truck'],
  },
  {
    id: 'industrial',
    name: 'こうじょう ちたい',
    emoji: '🏭',
    description: '大きな こうじょうの まわりを はしる、ひろい コース！',
    trackType: 'tile',
    carSet: 'toy',
    worldScale: 0.24,
    layout: INDUSTRIAL_LAYOUT,
    npcIds: ['vehicle-truck', 'vehicle-monster-truck', 'vehicle-suv'],
  },
];

export function getStageById(id) {
  return STAGES.find(s => s.id === id) || STAGES[0];
}
