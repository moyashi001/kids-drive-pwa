// ステージ定義。
// trackType: 'spline' なら track.js の createTrack()(草原の自動生成コース)、
// 'tile'    なら cityTrack.js の createCityTrack(layout)(タイル道路の街コース)を使う。
// carSet:   'kenney' なら cars.js の25台、'toy' なら toyCars.js の8台を選択肢にする。

// タイル系ステージ(まちなか/サイバー)共通のループ生成ヘルパー。
// road-straight/road-curve-pavementの接続ルール(実測済み、下記コメント参照)を
// そのまま使い回せるよう、四隅のカーブ中心座標(x0,y0)-(x1,y1)から
// タイル配置と走行経路を機械的に組み立てる。1周を約2倍にする際、座標を
// 手打ちし直すのではなくこの関数で生成することで、接続バグの再発を防いでいる。
//
// road-bend(歩道なし)とroad-straight(歩道あり)を組み合わせると、直線⇔カーブの
// 継ぎ目で歩道が急に途切れて見えたため、road-straightと同じ「歩道あり」デザインの
// road-curve-pavement(2x2サイズ)をカーブに採用し、白線・歩道の意匠を統一している。
// 接続点はRaycaster+テクスチャ色の実測で判明した値(タイル中心から±0.487、
// ほぼ0.5とみなせる)を使用。回転ごとの接続方向は road-bend と同じ実測法則
// (0:西⇔南 / 90:東⇔南 / 180:東⇔北 / 270:北⇔西)がそのまま当てはまる。
// road-straightは既定(rotDeg:0)で歩道が進行方向と垂直(左右ではなく前後の端)に
// つく向きのモデルのため、道の向きに合わせるには90度ずらす必要がある。
function buildRectLoopLayout(x0, y0, x1, y1) {
  const tiles = [
    { type: 'road-curve-pavement', gx: x0, gz: y0, rotDeg: 90 },
    { type: 'road-curve-pavement', gx: x1, gz: y0, rotDeg: 0 },
    { type: 'road-curve-pavement', gx: x1, gz: y1, rotDeg: 270 },
    { type: 'road-curve-pavement', gx: x0, gz: y1, rotDeg: 180 },
  ];
  for (let gx = x0 + 1.5; gx <= x1 - 1.5 + 1e-6; gx++) {
    tiles.push({ type: 'road-straight', gx, gz: y0 - 0.487, rotDeg: 180 });
    tiles.push({ type: 'road-straight', gx, gz: y1 + 0.487, rotDeg: 180 });
  }
  for (let gz = y0 + 1.5; gz <= y1 - 1.5 + 1e-6; gz++) {
    tiles.push({ type: 'road-straight', gx: x0 - 0.487, gz, rotDeg: 90 });
    tiles.push({ type: 'road-straight', gx: x1 + 0.487, gz, rotDeg: 90 });
  }
  const path = [
    [x0, y0], [x0 + 1, y0 - 0.487], [x1 - 1, y0 - 0.487],
    [x1, y0], [x1 + 0.487, y0 + 1], [x1 + 0.487, y1 - 1],
    [x1, y1], [x1 - 1, y1 + 0.487], [x0 + 1, y1 + 0.487],
    [x0, y1], [x0 - 0.487, y1 - 1], [x0 - 0.487, y0 + 1],
  ];
  return { tiles, path };
}

// 矩形ループの4辺+四隅に、指定したtypeを順番に(密度高めで)並べる汎用ビル配置。
// extraProps(共通のscale/glowColor等)とperCorner(四隅だけ強調したい場合の上書き)を
// 指定できるようにして、まちなか/サイバー両方の見た目差をここで吸収する。
function buildEdgeDecor(x0, y0, x1, y1, types, opts = {}) {
  const items = [];
  const outset = opts.outset ?? 1.8;
  const cornerOutset = opts.cornerOutset ?? 0.8;
  let typeIndex = 0;
  const nextType = () => types[typeIndex++ % types.length];

  // 四隅
  const corners = [
    { gx: x0 - cornerOutset - 0.6, gz: y0 - cornerOutset - 0.6, rot: 20 },
    { gx: x1 + cornerOutset + 0.6, gz: y0 - cornerOutset - 0.6, rot: -20 },
    { gx: x1 + cornerOutset + 0.6, gz: y1 + cornerOutset + 0.6, rot: -160 },
    { gx: x0 - cornerOutset - 0.6, gz: y1 + cornerOutset + 0.6, rot: 160 },
  ];
  for (const c of corners) {
    items.push({ type: nextType(), gx: c.gx, gz: c.gz, rotDeg: c.rot, scale: opts.scale || 0.7, ...opts.extraProps, ...(opts.cornerProps || {}) });
  }

  const edgeStep = opts.edgeStep ?? 2;
  for (let gx = x0 + 1.2; gx <= x1 - 1.2 + 1e-6; gx += edgeStep) {
    items.push({ type: nextType(), gx, gz: y0 - outset, rotDeg: 0, scale: opts.scale || 0.65, ...opts.extraProps });
    items.push({ type: nextType(), gx, gz: y1 + outset, rotDeg: 180, scale: opts.scale || 0.65, ...opts.extraProps });
  }
  for (let gz = y0 + 1.2; gz <= y1 - 1.2 + 1e-6; gz += edgeStep) {
    items.push({ type: nextType(), gx: x0 - outset, gz, rotDeg: 90, scale: opts.scale || 0.65, ...opts.extraProps });
    items.push({ type: nextType(), gx: x1 + outset, gz, rotDeg: -90, scale: opts.scale || 0.65, ...opts.extraProps });
  }
  return items;
}

// 遠景のシルエット(高層ビル等)をコース中心の周りにリング状に配置する。
function buildSkylineRing(centerGx, centerGz, radius, count, types, tint, baseScale) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    items.push({
      type: types[i % types.length],
      gx: centerGx + radius * Math.cos(angle),
      gz: centerGz + radius * Math.sin(angle),
      rotDeg: (angle * 180) / Math.PI,
      scale: baseScale + (i % 3) * 0.1,
      tint,
    });
  }
  return items;
}

// タイル系コースの四隅(カーブ中心)座標。1周を約2倍にするため、
// 元(1,1)-(7,6)の矩形から(1,1)-(14,11)へ拡大した(周長でおよそ2倍)。
const TILE_LOOP_X0 = 1, TILE_LOOP_Y0 = 1, TILE_LOOP_X1 = 14, TILE_LOOP_Y1 = 11;
const TILE_LOOP_CENTER = [(TILE_LOOP_X0 + TILE_LOOP_X1) / 2, (TILE_LOOP_Y0 + TILE_LOOP_Y1) / 2];
const TILE_LOOP_GROUND_RADIUS = Math.max(TILE_LOOP_X1 - TILE_LOOP_X0, TILE_LOOP_Y1 - TILE_LOOP_Y0) / 2 + 5;
const { tiles: TILE_LOOP_TILES, path: TILE_LOOP_PATH } = buildRectLoopLayout(TILE_LOOP_X0, TILE_LOOP_Y0, TILE_LOOP_X1, TILE_LOOP_Y1);

// ---- ステージ2: まちなか ストリート ----
// road-bend(歩道なし)とroad-straight(歩道あり)を組み合わせると、直線⇔カーブの
// 継ぎ目で歩道が急に途切れて見えたため、road-straightと同じ「歩道あり」デザインの
// road-curve-pavement(2x2サイズ)をカーブに採用し、白線・歩道の意匠を統一している。
// 接続点はRaycaster+テクスチャ色の実測で判明した値(タイル中心から±0.487、
// ほぼ0.5とみなせる)を使用。回転ごとの接続方向は road-bend と同じ実測法則
// (0:西⇔南 / 90:東⇔南 / 180:東⇔北 / 270:北⇔西)がそのまま当てはまる。
const CITY_BUILDING_TYPES = ['building-a', 'building-b', 'building-c', 'building-d', 'building-e', 'building-f', 'building-h', 'building-k'];
const CITY_LAYOUT = {
  groundColor: 0x8d9199,
  groundRadius: TILE_LOOP_GROUND_RADIUS,
  groundCenter: TILE_LOOP_CENTER,
  roadWidthRatio: 0.5,
  showClouds: true,
  blimpColor: 0xffd23f,
  tiles: TILE_LOOP_TILES,
  path: TILE_LOOP_PATH,
  buildings: [
    ...buildEdgeDecor(TILE_LOOP_X0, TILE_LOOP_Y0, TILE_LOOP_X1, TILE_LOOP_Y1, CITY_BUILDING_TYPES, { scale: 0.65 }),
    // 遠景のビル群(奥行きを出すため、少し霞んだ色に落として一回り大きく配置)
    ...buildSkylineRing(TILE_LOOP_CENTER[0], TILE_LOOP_CENTER[1], TILE_LOOP_GROUND_RADIUS - 2, 10, CITY_BUILDING_TYPES, 0xa9b0b8, 1.3),
  ],
};

// ---- ステージ3: サイバーシティ ナイト ----
// タイル配置・接続はCITY_LAYOUTと全く同じ形(実測済みの回転値をそのまま使い回し、
// タイルの繋がりに関する不具合を再発させないため)。地面色・夜空・建物だけを
// Quaternius "Cyberpunk Game Kit"(CC0)のネオン看板/アンテナ/TV等に差し替えている。
// ネオン看板は白一色だと単調なので、順番に色を割り当てる(密度アップで
// 数が増えたため、点光源は3個おきにだけ付けて描画負荷を抑えている)。
const CYBERPUNK_DECOR_TYPES = [
  'cyberpunk/tv-1.gltf', 'cyberpunk/sign-1.gltf', 'cyberpunk/light-street-1.gltf',
  'cyberpunk/antenna-1.gltf', 'cyberpunk/sign-corner-hazard.gltf', 'cyberpunk/light-street-2.gltf',
  'cyberpunk/antenna-2.gltf', 'cyberpunk/ac-stacked.gltf',
];
const CYBER_GLOW_COLORS = [0x00e5ff, 0xff2d95, 0xffd166, 0x39ff88, 0xa855f7];
function withCyberGlow(items) {
  return items.map((item, i) => {
    const glowColor = CYBER_GLOW_COLORS[i % CYBER_GLOW_COLORS.length];
    const withLight = i % 3 === 0 ? { light: { color: glowColor, intensity: 1.8, distance: 13 } } : {};
    return { ...item, glowColor, glowIntensity: item.type === 'cyberpunk/tv-1.gltf' ? 1.6 : 1.1, ...withLight };
  });
}

const CYBER_LAYOUT = {
  groundColor: 0x24243a,
  groundRadius: TILE_LOOP_GROUND_RADIUS,
  groundCenter: TILE_LOOP_CENTER,
  blimpColor: 0x00e5ff,
  blimpScale: 0.6,
  roadWidthRatio: 0.5,
  tiles: TILE_LOOP_TILES,
  path: TILE_LOOP_PATH,
  buildings: [
    ...withCyberGlow(buildEdgeDecor(TILE_LOOP_X0, TILE_LOOP_Y0, TILE_LOOP_X1, TILE_LOOP_Y1, CYBERPUNK_DECOR_TYPES, { scale: 0.85, edgeStep: 2.5 })),
    // 遠景のビル群(既定色を暗紺色に染めて、ネオンの手前に沈むシルエットにする)
    ...buildSkylineRing(TILE_LOOP_CENTER[0], TILE_LOOP_CENTER[1], TILE_LOOP_GROUND_RADIUS - 2, 10, CITY_BUILDING_TYPES, 0x1a1a2e, 1.3),
  ],
};

// ---- ステージ4: ワインディング キャニオン ----
// track.jsのcreateTrack()は制御点さえ渡せば任意の形のクローズドループを
// 生成できる汎用実装のため、そうげんループより蛇行の激しい制御点を新たに設計し、
// 立体交差風の高架橋(overpassU、実際には繋がっていない見た目だけの演出)を追加した。
// 1周を約2倍にするため元の形を1.9倍に拡大し、坂道(キャニオンらしい起伏)として
// 各点に高さ(3つ目の値)を持たせている。山の前後もなだらかな助走点にして
// Catmull-Romのオーバーシュート(道が地面より低く沈む不具合)を防いでいる。
const WINDING_CONTROL_POINTS = [
  [0, -123.5, 1], [66.5, -114, 9], [104.5, -66.5, 18], [66.5, -38, 10], [104.5, 9.5, 14],
  [123.5, 66.5, 28], [66.5, 85.5, 14], [19, 47.5, 5], [19, 114, 7], [-38, 123.5, 14],
  [-95, 85.5, 8], [-57, 38, 5], [-114, 9.5, 8], [-123.5, -47.5, 5], [-66.5, -66.5, 3],
  [-76, -114, 2],
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
      fogNear: 45,
      fogFar: 205,
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
    layout: { controlPoints: WINDING_CONTROL_POINTS, overpassU: 0.28, mountainColor: 0xad6b4a, blimpColor: 0xf0a020 },
    npcIds: ['sedan-sports', 'hatchback-sports', 'suv', 'garbage-truck', 'tractor', 'pet-fox', 'pet-tiger'],
    theme: {
      sky: 0xffab73,
      fogNear: 220,
      fogFar: 380,
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
