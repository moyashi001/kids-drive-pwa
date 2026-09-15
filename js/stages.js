// ステージ定義。
// trackType: 'spline' なら track.js の createTrack()(草原の自動生成コース)、
// 'tile'    なら cityTrack.js の createCityTrack(layout)(タイル道路の街コース)を使う。
// carSet:   'kenney' なら cars.js の25台、'toy' なら toyCars.js の8台を選択肢にする。

// ---- ステージ2: まちなか ストリート ----
// road-bend(歩道なし)とroad-straight(歩道あり)を組み合わせると、直線⇔カーブの
// 継ぎ目で歩道が急に途切れて見えたため、road-straightと同じ「歩道あり」デザインの
// road-curve-pavement(2x2サイズ)をカーブに採用し、白線・歩道の意匠を統一している。
// 接続点はRaycaster+テクスチャ色の実測で判明した値(タイル中心から±0.487、
// ほぼ0.5とみなせる)を使用。回転ごとの接続方向は road-bend と同じ実測法則
// (0:西⇔南 / 90:東⇔南 / 180:東⇔北 / 270:北⇔西)がそのまま当てはまる。
const CITY_LAYOUT = {
  groundColor: 0x8d9199,
  groundRadius: 8,
  groundCenter: [4, 3.5],
  roadWidthRatio: 0.5,
  tiles: [
    // 四隅のカーブ(road-curve-pavementはモデル自体が既に2x2タイル分のサイズなので、
    // 他のタイルと同じ TILE_SCALE 倍のままでよい。ここに scale:2 を追加すると
    // 二重にスケールがかかりモデルが4倍(4タイル分)の大きさになってしまい、
    // 隣接タイルと重なってZ-fighting(縞模様のノイズ)の原因になっていた)
    { type: 'road-curve-pavement', gx: 1, gz: 1, rotDeg: 90 },
    { type: 'road-curve-pavement', gx: 7, gz: 1, rotDeg: 0 },
    { type: 'road-curve-pavement', gx: 7, gz: 6, rotDeg: 270 },
    { type: 'road-curve-pavement', gx: 1, gz: 6, rotDeg: 180 },
    // 上辺 (z=0.513)
    // road-straightは既定(rotDeg:0)で歩道が進行方向と垂直(左右ではなく前後の端)に
    // つく向きのモデルのため、道の向きに合わせるには従来の想定と90度ずらす必要がある
    { type: 'road-straight', gx: 2.5, gz: 0.513, rotDeg: 180 },
    { type: 'road-straight', gx: 3.5, gz: 0.513, rotDeg: 180 },
    { type: 'road-straight', gx: 4.5, gz: 0.513, rotDeg: 180 },
    { type: 'road-straight', gx: 5.5, gz: 0.513, rotDeg: 180 },
    // 右辺 (x=7.487)
    { type: 'road-straight', gx: 7.487, gz: 2.5, rotDeg: 90 },
    { type: 'road-straight', gx: 7.487, gz: 3.5, rotDeg: 90 },
    { type: 'road-straight', gx: 7.487, gz: 4.5, rotDeg: 90 },
    // 下辺 (z=6.487)
    { type: 'road-straight', gx: 2.5, gz: 6.487, rotDeg: 180 },
    { type: 'road-straight', gx: 3.5, gz: 6.487, rotDeg: 180 },
    { type: 'road-straight', gx: 4.5, gz: 6.487, rotDeg: 180 },
    { type: 'road-straight', gx: 5.5, gz: 6.487, rotDeg: 180 },
    // 左辺 (x=0.513)
    { type: 'road-straight', gx: 0.513, gz: 2.5, rotDeg: 90 },
    { type: 'road-straight', gx: 0.513, gz: 3.5, rotDeg: 90 },
    { type: 'road-straight', gx: 0.513, gz: 4.5, rotDeg: 90 },
  ],
  path: [
    [1, 1], [2, 0.513], [6, 0.513],
    [7, 1], [7.487, 2], [7.487, 5],
    [7, 6], [6, 6.487], [2, 6.487],
    [1, 6], [0.513, 5], [0.513, 2],
  ],
  buildings: [
    // 四隅
    { type: 'building-e', gx: -1.5, gz: -0.7, rotDeg: 20, scale: 0.7 },
    { type: 'building-c', gx: 9.5, gz: -0.7, rotDeg: -20, scale: 0.7 },
    { type: 'building-h', gx: -1.5, gz: 7.7, rotDeg: -15, scale: 0.7 },
    { type: 'building-k', gx: 9.5, gz: 7.7, rotDeg: 15, scale: 0.7 },
    // 上辺(密度アップ: 3棟に増量)
    { type: 'building-b', gx: 1.8, gz: -1.7, rotDeg: 0, scale: 0.6 },
    { type: 'building-a', gx: 4, gz: -1.8, rotDeg: 0, scale: 0.7 },
    { type: 'building-f', gx: 6.2, gz: -1.7, rotDeg: 0, scale: 0.6 },
    // 下辺(密度アップ: 3棟に増量)
    { type: 'building-d', gx: 1.8, gz: 8.2, rotDeg: 180, scale: 0.6 },
    { type: 'building-h', gx: 4, gz: 8.3, rotDeg: 180, scale: 0.7 },
    { type: 'building-k', gx: 6.2, gz: 8.2, rotDeg: 180, scale: 0.6 },
    // 左辺(新規)
    { type: 'building-c', gx: -1.8, gz: 1.7, rotDeg: 70, scale: 0.6 },
    { type: 'building-e', gx: -1.9, gz: 3.5, rotDeg: 90, scale: 0.65 },
    { type: 'building-a', gx: -1.8, gz: 5.3, rotDeg: 110, scale: 0.6 },
    // 右辺(新規)
    { type: 'building-f', gx: 9.8, gz: 1.7, rotDeg: -70, scale: 0.6 },
    { type: 'building-b', gx: 9.9, gz: 3.5, rotDeg: -90, scale: 0.65 },
    { type: 'building-d', gx: 9.8, gz: 5.3, rotDeg: -110, scale: 0.6 },
  ],
};

// ---- ステージ3: サイバーシティ ナイト ----
// タイル配置・接続はCITY_LAYOUTと全く同じ形(実測済みの回転値をそのまま使い回し、
// タイルの繋がりに関する不具合を再発させないため)。地面色・夜空・建物だけを
// Quaternius "Cyberpunk Game Kit"(CC0)のネオン看板/アンテナ/TV等に差し替えている。
const CYBER_LAYOUT = {
  groundColor: 0x24243a,
  groundRadius: 8,
  groundCenter: [4, 3.5],
  roadWidthRatio: 0.5,
  tiles: [
    { type: 'road-curve-pavement', gx: 1, gz: 1, rotDeg: 90 },
    { type: 'road-curve-pavement', gx: 7, gz: 1, rotDeg: 0 },
    { type: 'road-curve-pavement', gx: 7, gz: 6, rotDeg: 270 },
    { type: 'road-curve-pavement', gx: 1, gz: 6, rotDeg: 180 },
    { type: 'road-straight', gx: 2.5, gz: 0.513, rotDeg: 180 },
    { type: 'road-straight', gx: 3.5, gz: 0.513, rotDeg: 180 },
    { type: 'road-straight', gx: 4.5, gz: 0.513, rotDeg: 180 },
    { type: 'road-straight', gx: 5.5, gz: 0.513, rotDeg: 180 },
    { type: 'road-straight', gx: 7.487, gz: 2.5, rotDeg: 90 },
    { type: 'road-straight', gx: 7.487, gz: 3.5, rotDeg: 90 },
    { type: 'road-straight', gx: 7.487, gz: 4.5, rotDeg: 90 },
    { type: 'road-straight', gx: 2.5, gz: 6.487, rotDeg: 180 },
    { type: 'road-straight', gx: 3.5, gz: 6.487, rotDeg: 180 },
    { type: 'road-straight', gx: 4.5, gz: 6.487, rotDeg: 180 },
    { type: 'road-straight', gx: 5.5, gz: 6.487, rotDeg: 180 },
    { type: 'road-straight', gx: 0.513, gz: 2.5, rotDeg: 90 },
    { type: 'road-straight', gx: 0.513, gz: 3.5, rotDeg: 90 },
    { type: 'road-straight', gx: 0.513, gz: 4.5, rotDeg: 90 },
  ],
  path: [
    [1, 1], [2, 0.513], [6, 0.513],
    [7, 1], [7.487, 2], [7.487, 5],
    [7, 6], [6, 6.487], [2, 6.487],
    [1, 6], [0.513, 5], [0.513, 2],
  ],
  // glowColor: 発光色(白一色だと単調なので看板ごとに色を変える)。
  // light: 実際にその色で周囲を照らす点光源(distanceの範囲内だけ、軽量に)
  buildings: [
    // 四隅にひときわ目立つ大型ビジョン(シアン)
    { type: 'cyberpunk/tv-1.gltf', gx: -1.3, gz: -0.8, rotDeg: 35, scale: 1.1, glowIntensity: 1.6, glowColor: 0x00e5ff, light: { color: 0x00e5ff, intensity: 2.2, distance: 16 } },
    { type: 'cyberpunk/tv-1.gltf', gx: 9.3, gz: -0.8, rotDeg: -35, scale: 1.1, glowIntensity: 1.6, glowColor: 0xff2d95, light: { color: 0xff2d95, intensity: 2.2, distance: 16 } },
    { type: 'cyberpunk/tv-1.gltf', gx: -1.3, gz: 7.8, rotDeg: -35, scale: 1.1, glowIntensity: 1.6, glowColor: 0xff2d95, light: { color: 0xff2d95, intensity: 2.2, distance: 16 } },
    { type: 'cyberpunk/tv-1.gltf', gx: 9.3, gz: 7.8, rotDeg: 35, scale: 1.1, glowIntensity: 1.6, glowColor: 0x00e5ff, light: { color: 0x00e5ff, intensity: 2.2, distance: 16 } },
    // 上辺沿い
    { type: 'cyberpunk/sign-1.gltf', gx: 2.2, gz: -1.0, rotDeg: 0, scale: 0.9, glowColor: 0xff2d95, light: { color: 0xff2d95, intensity: 1.8, distance: 13 } },
    { type: 'cyberpunk/light-street-1.gltf', gx: 3.6, gz: -0.9, rotDeg: 0, scale: 1, glowColor: 0xffd166, light: { color: 0xffd166, intensity: 1.5, distance: 11 } },
    { type: 'cyberpunk/antenna-1.gltf', gx: 4.6, gz: -0.9, rotDeg: 0, scale: 1, glowColor: 0xa855f7 },
    { type: 'cyberpunk/sign-corner-hazard.gltf', gx: 6.0, gz: -1.0, rotDeg: 10, scale: 0.9, glowColor: 0x39ff88, light: { color: 0x39ff88, intensity: 1.8, distance: 13 } },
    // 下辺沿い
    { type: 'cyberpunk/sign-1.gltf', gx: 2.2, gz: 7.9, rotDeg: 180, scale: 0.9, glowColor: 0x00e5ff, light: { color: 0x00e5ff, intensity: 1.8, distance: 13 } },
    { type: 'cyberpunk/light-street-2.gltf', gx: 3.6, gz: 8.0, rotDeg: 180, scale: 1, glowColor: 0xffd166, light: { color: 0xffd166, intensity: 1.5, distance: 11 } },
    { type: 'cyberpunk/antenna-2.gltf', gx: 4.6, gz: 8.0, rotDeg: 180, scale: 1, glowColor: 0xa855f7 },
    { type: 'cyberpunk/ac-stacked.gltf', gx: 6.0, gz: 7.9, rotDeg: 180, scale: 0.9, glowColor: 0x39ff88 },
    // 左辺沿い
    { type: 'cyberpunk/light-street-1.gltf', gx: -0.9, gz: 2.2, rotDeg: 90, scale: 1, glowColor: 0xffd166, light: { color: 0xffd166, intensity: 1.5, distance: 11 } },
    { type: 'cyberpunk/sign-1.gltf', gx: -1.0, gz: 4.0, rotDeg: 90, scale: 0.9, glowColor: 0xff2d95, light: { color: 0xff2d95, intensity: 1.8, distance: 13 } },
    // 右辺沿い
    { type: 'cyberpunk/light-street-2.gltf', gx: 8.4, gz: 2.2, rotDeg: -90, scale: 1, glowColor: 0x39ff88, light: { color: 0x39ff88, intensity: 1.5, distance: 11 } },
    { type: 'cyberpunk/ac-stacked.gltf', gx: 8.5, gz: 4.0, rotDeg: -90, scale: 0.9, glowColor: 0xa855f7 },
    // 追加のネオン(密度アップ)
    { type: 'cyberpunk/antenna-1.gltf', gx: 1.0, gz: -1.2, rotDeg: 15, scale: 0.85, glowColor: 0xff2d95 },
    { type: 'cyberpunk/antenna-2.gltf', gx: 7.2, gz: 8.3, rotDeg: 200, scale: 0.85, glowColor: 0x00e5ff },
    { type: 'cyberpunk/ac-stacked.gltf', gx: -1.1, gz: 5.8, rotDeg: 100, scale: 0.8, glowColor: 0xffd166 },
    { type: 'cyberpunk/sign-corner-hazard.gltf', gx: 8.6, gz: 1.0, rotDeg: -100, scale: 0.85, glowColor: 0x39ff88, light: { color: 0x39ff88, intensity: 1.6, distance: 12 } },
    // 遠景のビル群(既定色を暗紺色に染めて、ネオンの手前に沈むシルエットにする)
    { type: 'building-a', gx: 4 + 7 * Math.cos(0), gz: 3.5 + 7 * Math.sin(0), rotDeg: 0, scale: 1.3, tint: 0x1a1a2e },
    { type: 'building-b', gx: 4 + 7 * Math.cos(Math.PI / 4), gz: 3.5 + 7 * Math.sin(Math.PI / 4), rotDeg: 45, scale: 1.4, tint: 0x1a1a2e },
    { type: 'building-c', gx: 4 + 7 * Math.cos(Math.PI / 2), gz: 3.5 + 7 * Math.sin(Math.PI / 2), rotDeg: 90, scale: 1.3, tint: 0x1a1a2e },
    { type: 'building-d', gx: 4 + 7 * Math.cos(3 * Math.PI / 4), gz: 3.5 + 7 * Math.sin(3 * Math.PI / 4), rotDeg: 135, scale: 1.5, tint: 0x1a1a2e },
    { type: 'building-e', gx: 4 + 7 * Math.cos(Math.PI), gz: 3.5 + 7 * Math.sin(Math.PI), rotDeg: 180, scale: 1.3, tint: 0x1a1a2e },
    { type: 'building-f', gx: 4 + 7 * Math.cos(5 * Math.PI / 4), gz: 3.5 + 7 * Math.sin(5 * Math.PI / 4), rotDeg: 225, scale: 1.4, tint: 0x1a1a2e },
    { type: 'building-h', gx: 4 + 7 * Math.cos(3 * Math.PI / 2), gz: 3.5 + 7 * Math.sin(3 * Math.PI / 2), rotDeg: 270, scale: 1.3, tint: 0x1a1a2e },
    { type: 'building-k', gx: 4 + 7 * Math.cos(7 * Math.PI / 4), gz: 3.5 + 7 * Math.sin(7 * Math.PI / 4), rotDeg: 315, scale: 1.5, tint: 0x1a1a2e },
  ],
};

// ---- ステージ4: ワインディング キャニオン ----
// track.jsのcreateTrack()は制御点さえ渡せば任意の形のクローズドループを
// 生成できる汎用実装のため、そうげんループより蛇行の激しい制御点を新たに設計し、
// 立体交差風の高架橋(overpassU、実際には繋がっていない見た目だけの演出)を追加した。
const WINDING_CONTROL_POINTS = [
  [0, -65], [35, -60], [55, -35], [35, -20], [55, 5],
  [65, 35], [35, 45], [10, 25], [10, 60], [-20, 65],
  [-50, 45], [-30, 20], [-60, 5], [-65, -25], [-35, -35],
  [-40, -60],
];

export const STAGES = [
  {
    id: 'grassland',
    name: 'そうげん ループ',
    emoji: '🌳',
    description: 'いつもの コース。ひろい そうげんを ぐるっと いっしゅう！',
    trackType: 'spline',
    carSet: 'kenney',
    worldScale: 1,
    npcIds: ['taxi', 'van', 'suv-luxury', 'police', 'ambulance', 'firetruck', 'delivery', 'pet-dog', 'pet-fox'],
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
    npcIds: ['vehicle-suv', 'vehicle-truck', 'vehicle-monster-truck', 'vehicle-racer', 'vehicle-speedster'],
  },
  {
    id: 'cyber',
    name: 'サイバーシティ ナイト',
    emoji: '🌃',
    description: 'ネオンひかる よるの まち。ひかる かんばんに ちゅうい！',
    trackType: 'tile',
    carSet: 'toy',
    worldScale: 0.24,
    layout: CYBER_LAYOUT,
    npcIds: ['vehicle-suv', 'vehicle-truck', 'vehicle-racer', 'vehicle-speedster', 'vehicle-monster-truck'],
    theme: {
      sky: 0x0d0221,
      fogNear: 30,
      fogFar: 140,
      hemiSky: 0x5b6dff,
      hemiGround: 0x1a0a2e,
      hemiIntensity: 0.55,
      sunColor: 0x8899ff,
      sunIntensity: 0.5,
    },
  },
  {
    id: 'winding',
    name: 'ワインディング キャニオン',
    emoji: '🏜️',
    description: 'カーブが つづく やまみち コース。りったいこうさの したも とおるよ！',
    trackType: 'spline',
    carSet: 'kenney',
    worldScale: 1,
    layout: { controlPoints: WINDING_CONTROL_POINTS, overpassU: 0.28 },
    npcIds: ['sedan-sports', 'hatchback-sports', 'suv', 'garbage-truck', 'tractor', 'pet-fox', 'pet-tiger'],
    theme: {
      sky: 0xffab73,
      fogNear: 100,
      fogFar: 210,
      hemiSky: 0xffd8a8,
      hemiGround: 0x8a5a3a,
      hemiIntensity: 0.95,
      sunColor: 0xffcc88,
      sunIntensity: 1.2,
    },
  },
];

export function getStageById(id) {
  return STAGES.find(s => s.id === id) || STAGES[0];
}
