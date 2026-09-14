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
    { type: 'building-e', gx: -1.5, gz: -0.7, rotDeg: 20, scale: 0.7 },
    { type: 'building-c', gx: 9.5, gz: -0.7, rotDeg: -20, scale: 0.7 },
    { type: 'building-h', gx: -1.5, gz: 7.7, rotDeg: -15, scale: 0.7 },
    { type: 'building-k', gx: 9.5, gz: 7.7, rotDeg: 15, scale: 0.7 },
    { type: 'building-b', gx: 3, gz: -1.7, rotDeg: 0, scale: 0.7 },
    { type: 'building-a', gx: 5, gz: -1.7, rotDeg: 0, scale: 0.7 },
    { type: 'building-d', gx: 3, gz: 8.2, rotDeg: 180, scale: 0.7 },
    { type: 'building-f', gx: 5, gz: 8.2, rotDeg: 180, scale: 0.7 },
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
  buildings: [
    // 四隅にひときわ目立つ大型ビジョン
    { type: 'cyberpunk/tv-1.gltf', gx: -1.3, gz: -0.8, rotDeg: 35, scale: 1.1, glowIntensity: 1.4 },
    { type: 'cyberpunk/tv-1.gltf', gx: 9.3, gz: -0.8, rotDeg: -35, scale: 1.1, glowIntensity: 1.4 },
    { type: 'cyberpunk/tv-1.gltf', gx: -1.3, gz: 7.8, rotDeg: -35, scale: 1.1, glowIntensity: 1.4 },
    { type: 'cyberpunk/tv-1.gltf', gx: 9.3, gz: 7.8, rotDeg: 35, scale: 1.1, glowIntensity: 1.4 },
    // 上辺沿い
    { type: 'cyberpunk/sign-1.gltf', gx: 2.2, gz: -1.0, rotDeg: 0, scale: 0.9 },
    { type: 'cyberpunk/light-street-1.gltf', gx: 3.6, gz: -0.9, rotDeg: 0, scale: 1 },
    { type: 'cyberpunk/antenna-1.gltf', gx: 4.6, gz: -0.9, rotDeg: 0, scale: 1 },
    { type: 'cyberpunk/sign-corner-hazard.gltf', gx: 6.0, gz: -1.0, rotDeg: 10, scale: 0.9 },
    // 下辺沿い
    { type: 'cyberpunk/sign-1.gltf', gx: 2.2, gz: 7.9, rotDeg: 180, scale: 0.9 },
    { type: 'cyberpunk/light-street-2.gltf', gx: 3.6, gz: 8.0, rotDeg: 180, scale: 1 },
    { type: 'cyberpunk/antenna-2.gltf', gx: 4.6, gz: 8.0, rotDeg: 180, scale: 1 },
    { type: 'cyberpunk/ac-stacked.gltf', gx: 6.0, gz: 7.9, rotDeg: 180, scale: 0.9 },
    // 左辺沿い
    { type: 'cyberpunk/light-street-1.gltf', gx: -0.9, gz: 2.2, rotDeg: 90, scale: 1 },
    { type: 'cyberpunk/sign-1.gltf', gx: -1.0, gz: 4.0, rotDeg: 90, scale: 0.9 },
    // 右辺沿い
    { type: 'cyberpunk/light-street-2.gltf', gx: 8.4, gz: 2.2, rotDeg: -90, scale: 1 },
    { type: 'cyberpunk/ac-stacked.gltf', gx: 8.5, gz: 4.0, rotDeg: -90, scale: 0.9 },
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
    npcIds: ['taxi', 'van', 'suv-luxury', 'police', 'ambulance', 'firetruck', 'delivery'],
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
];

export function getStageById(id) {
  return STAGES.find(s => s.id === id) || STAGES[0];
}
