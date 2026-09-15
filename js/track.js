import * as THREE from '../lib/three/build/three.module.js';
import { buildMountainRing, buildClouds, buildBlimp } from './skyDecor.js';

// Kenney "3D Road Tiles" 風のフラットカラーを再現したパレット
export const PALETTE = {
  road: 0x6b6f76,
  roadLine: 0xf5d547,
  curbA: 0xe8e8e8,
  curbB: 0xd94f4f,
  grass: 0x7cb342,
  grassDark: 0x6a9e39,
  dirt: 0xcbb994,
  trunk: 0x8d6748,
  leaves: 0x4caf50,
  sky: 0x8fd4f8,
};

const ROAD_WIDTH = 11;
const CURB_WIDTH = 1.2;

// クローズドループのコース制御点。そうげんループの既定コース。
// 各点は[x, z]または高さ付きの[x, z, y]。1周を約2倍にするため、
// 元の形はそのままに全体を約1.9倍に拡大し、いくつかの点にyを与えて
// なだらかな坂(丘)を作っている。
// 丘の前後には必ず低いyのなだらかな助走点を置くこと: Catmull-Romは
// 「0→高い山→0」のように急に高さが変わる点があると、その手前で
// 実際の高さがマイナスに沈むオーバーシュートを起こす(道が地面より
// 低く見える不具合の原因になった)。山の前後も含め全点を0以上の
// なだらかな傾斜にすることでオーバーシュートを避けている。
const DEFAULT_CONTROL_POINTS = [
  [0, -87.4, 1], [49.4, -95, 2], [91.2, -72.2, 3], [106.4, -26.6, 4], [95, 19, 8],
  [57, 41.8, 17], [57, 76, 21], [19, 98.8, 10], [-34.2, 91.2, 4], [-64.6, 57, 2],
  [-57, 15.2, 4], [-87.4, -7.6, 10], [-102.6, -49.4, 4], [-72.2, -87.4, 2], [-30.4, -95, 1],
];

function buildControlPoints(points) {
  return (points || DEFAULT_CONTROL_POINTS).map(([x, z, y]) => new THREE.Vector3(x, y || 0, z));
}

/**
 * @param {Object} [def]
 * @param {Array<[number,number]>} [def.controlPoints] コースの制御点(XZ)。省略時はそうげんループの既定コース
 * @param {number} [def.overpassU] 立体交差風の装飾(高架橋)をコース上のどの位置(0..1)に置くか。省略時は装飾なし
 */
export function createTrack(def = {}) {
  const group = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(buildControlPoints(def.controlPoints), true, 'catmullrom', 0.55);

  const SEGMENTS = 400;
  const uSamples = [];
  for (let i = 0; i <= SEGMENTS; i++) uSamples.push(i / SEGMENTS);
  const centerPts = uSamples.map(u => curve.getPointAt(u));

  // コースの大まかな広がり(原点からの最大距離)。山・雲・木の配置を
  // コースの規模に自動で合わせるための基準値として使う。
  let maxReach = 0;
  for (const p of centerPts) maxReach = Math.max(maxReach, Math.hypot(p.x, p.z));

  // ---- 道路メッシュ (帯状のリボン) ----
  const roadPositions = [];
  const roadIndices = [];
  const curbLPositions = [];
  const curbRPositions = [];
  const curbIndicesTemplate = [];

  const up = new THREE.Vector3(0, 1, 0);
  const leftEdge = [];
  const rightEdge = [];
  const curbLOuter = [];
  const curbROuter = [];

  for (let i = 0; i < centerPts.length; i++) {
    const p = centerPts[i];
    const pNext = centerPts[(i + 1) % centerPts.length];
    const pPrev = centerPts[(i - 1 + centerPts.length) % centerPts.length];
    const tangent = pNext.clone().sub(pPrev).normalize();
    const side = new THREE.Vector3().crossVectors(up, tangent).normalize();

    const l = p.clone().addScaledVector(side, ROAD_WIDTH / 2);
    const r = p.clone().addScaledVector(side, -ROAD_WIDTH / 2);
    const lOuter = p.clone().addScaledVector(side, ROAD_WIDTH / 2 + CURB_WIDTH);
    const rOuter = p.clone().addScaledVector(side, -(ROAD_WIDTH / 2 + CURB_WIDTH));

    leftEdge.push(l);
    rightEdge.push(r);
    curbLOuter.push(lOuter);
    curbROuter.push(rOuter);
  }

  // yOffsetは各点自身の高さ(坂道用)に上乗せする微小オフセット。
  // 以前は固定Yで平坦前提だったが、坂道対応のため点ごとの高さを使うよう変更。
  function ribbon(edgeA, edgeB, yOffset = 0.01) {
    const positions = [];
    const indices = [];
    for (let i = 0; i < edgeA.length; i++) {
      positions.push(edgeA[i].x, edgeA[i].y + yOffset, edgeA[i].z);
      positions.push(edgeB[i].x, edgeB[i].y + yOffset, edgeB[i].z);
    }
    const count = edgeA.length;
    for (let i = 0; i < count - 1; i++) {
      const a = i * 2, b = i * 2 + 1, c = (i + 1) * 2, d = (i + 1) * 2 + 1;
      indices.push(a, c, b, b, c, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  const roadGeo = ribbon(leftEdge, rightEdge, 0.02);
  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.road, side: THREE.DoubleSide });
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.receiveShadow = true;
  group.add(roadMesh);

  const curbLGeo = ribbon(curbLOuter, leftEdge, 0.03);
  const curbRGeo = ribbon(rightEdge, curbROuter, 0.03);
  const curbMatA = new THREE.MeshLambertMaterial({ color: PALETTE.curbA, side: THREE.DoubleSide });
  group.add(new THREE.Mesh(curbLGeo, curbMatA));
  group.add(new THREE.Mesh(curbRGeo, curbMatA.clone()));

  // ---- ガードレール(縁石のすぐ外側に沿わせる。道が寂しく見えないようにする) ----
  group.add(buildFence(curbLOuter));
  group.add(buildFence(curbROuter));

  // ---- 盛り土(坂で道が高くなった区間の下に、地面までのスロープを張って
  // 道が宙に浮いて見えないようにする。平坦な区間ではほぼ薄いだけで目立たない) ----
  const dirtMat = new THREE.MeshLambertMaterial({ color: PALETTE.dirt, side: THREE.DoubleSide });
  const embankL = curbLOuter.map(p => new THREE.Vector3(p.x, Math.min(p.y - 0.4, -1.5), p.z));
  const embankR = curbROuter.map(p => new THREE.Vector3(p.x, Math.min(p.y - 0.4, -1.5), p.z));
  group.add(new THREE.Mesh(ribbon(curbLOuter, embankL, 0), dirtMat));
  group.add(new THREE.Mesh(ribbon(curbROuter, embankR, 0), dirtMat.clone()));

  // ---- センターライン (破線) ----
  const dashGeo = new THREE.BoxGeometry(0.5, 0.03, 1.6);
  const dashMat = new THREE.MeshBasicMaterial({ color: PALETTE.roadLine });
  const dashMesh = new THREE.InstancedMesh(dashGeo, dashMat, Math.ceil(centerPts.length / 4));
  let dashCount = 0;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < centerPts.length; i += 4) {
    const p = centerPts[i];
    const pNext = centerPts[(i + 1) % centerPts.length];
    const angle = Math.atan2(pNext.x - p.x, pNext.z - p.z);
    dummy.position.set(p.x, p.y + 0.05, p.z);
    dummy.rotation.set(0, angle, 0);
    dummy.updateMatrix();
    dashMesh.setMatrixAt(dashCount++, dummy.matrix);
  }
  dashMesh.count = dashCount;
  group.add(dashMesh);

  // ---- 地面(草) ----
  // 半径はフォグの終端より大きくして、地面の縁がフォグの手前で
  // 途切れて空との境界線が見えてしまわないようにする。コースが大きい
  // ステージ(maxReachが大きい)では地面もそれに応じて広げる。
  const groundRadius = Math.max(300, maxReach * 3.2);
  const groundGeo = new THREE.CircleGeometry(groundRadius, 48);
  const groundMat = new THREE.MeshLambertMaterial({ color: PALETTE.grass });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  group.add(ground);

  // うっすら模様(芝生のブロック感)
  const patchGeo = new THREE.RingGeometry(30, groundRadius, 48, 6);
  const patchMat = new THREE.MeshBasicMaterial({ color: PALETTE.grassDark, transparent: true, opacity: 0.18, side: THREE.DoubleSide });
  const patch = new THREE.Mesh(patchGeo, patchMat);
  patch.rotation.x = -Math.PI / 2;
  patch.position.y = -0.01;
  group.add(patch);

  // ---- スタート/ゴール ゲート ----
  const startP = centerPts[0];
  const startNext = centerPts[1];
  const startAngle = Math.atan2(startNext.x - startP.x, startNext.z - startP.z);
  const gate = buildStartGate();
  gate.position.copy(startP);
  gate.rotation.y = startAngle;
  group.add(gate);

  // ---- 立体交差風の装飾(高架橋。実際に道は分岐しないが、見た目だけ立体交差に見せる) ----
  if (def.overpassU !== undefined) {
    const opP = curve.getPointAt(def.overpassU);
    const opNext = curve.getPointAt((def.overpassU + 0.01) % 1);
    const opAngle = Math.atan2(opNext.x - opP.x, opNext.z - opP.z);
    const overpass = buildOverpass();
    overpass.position.copy(opP);
    overpass.rotation.y = opAngle + Math.PI / 2; // 道と垂直に橋を渡す
    group.add(overpass);
  }

  // ---- コーン(コース外側のデコレーション) ----
  const decorGroup = new THREE.Group();
  group.add(decorGroup);

  // ---- 簡易な木(デコレーション、外周にぐるっと配置) ----
  // 本数はコースの規模(周長)に応じて増減させ、大きいコースでもスカスカに
  // 見えないようにする
  const TREE_COUNT = Math.round(42 * Math.max(1, maxReach / 62));
  const treeRadiusBase = maxReach * 1.62;
  const treeRadiusVar = maxReach * 0.3;
  for (let i = 0; i < TREE_COUNT; i++) {
    const angle = (i / TREE_COUNT) * Math.PI * 2;
    const radius = treeRadiusBase + Math.sin(i * 3.1) * treeRadiusVar;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const tree = buildTree();
    tree.position.set(x, 0, z);
    const s = 0.8 + Math.random() * 0.6;
    tree.scale.set(s, s, s);
    group.add(tree);
  }

  // ---- 道路脇の茂み・岩(ガードレールのすぐ外側。道が寂しく見えないよう密度を稼ぐ) ----
  group.add(scatterRoadside(centerPts, curbLOuter));
  group.add(scatterRoadside(centerPts, curbROuter));

  // ---- 背景の奥行き(遠景の山・雲・飛行船。コースの規模に合わせて配置半径を決める。
  // フォグの範囲内に収まるよう、ステージ側のtheme.fogFarと合わせて調整すること) ----
  group.add(buildMountainRing(maxReach * 2.0, Math.round(22 * Math.max(1, maxReach / 62)), def.mountainColor || 0x6b7d5a));
  group.add(buildClouds(maxReach * 1.7, 11));
  const blimp = buildBlimp(def.blimpColor || 0xe0483e, 0xffffff, 2.2);
  blimp.position.set(-maxReach * 0.6, maxReach * 0.5, -maxReach * 1.7);
  blimp.rotation.y = Math.PI / 5;
  group.add(blimp);

  return {
    group,
    curve,
    centerPts,
    roadWidth: ROAD_WIDTH,
    // ガードレール(縁石の外側)の位置。carController側でこの半径より外に
    // 出られないようクランプする(すり抜け防止)。タイル系ステージには
    // ガードレールが無いのでこのフィールド自体を返さない。
    fenceRadius: ROAD_WIDTH / 2 + CURB_WIDTH,
    decorGroup,
    startPosition: centerPts[0].clone(),
    startAngle,
  };
}

function buildStartGate() {
  const g = new THREE.Group();
  const postMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const bannerMat = new THREE.MeshLambertMaterial({ color: 0xff7043 });
  const postGeo = new THREE.CylinderGeometry(0.35, 0.35, 7, 8);
  const left = new THREE.Mesh(postGeo, postMat);
  left.position.set(-ROAD_WIDTH / 2 - 0.5, 3.5, 0);
  const right = left.clone();
  right.position.x = ROAD_WIDTH / 2 + 0.5;
  const banner = new THREE.Mesh(new THREE.BoxGeometry(ROAD_WIDTH + 2, 1.4, 0.3), bannerMat);
  banner.position.set(0, 6.6, 0);
  g.add(left, right, banner);
  return g;
}

// 実際には繋がっていない、見た目だけの高架道路(立体交差風の演出)。
// 支柱2本+橋桁+橋の上を通るダミーの道路(短い区間)で構成する
function buildOverpass() {
  const g = new THREE.Group();
  const DECK_Y = 8.5;
  const SPAN = ROAD_WIDTH + 26; // 下の道をまたいで左右に張り出す長さ

  const pillarMat = new THREE.MeshLambertMaterial({ color: 0xb0b0b8 });
  const pillarGeo = new THREE.CylinderGeometry(0.9, 1.1, DECK_Y, 8);
  [-1, 1].forEach(side => {
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(side * (ROAD_WIDTH / 2 + 3), DECK_Y / 2, 0);
    g.add(pillar);
  });

  const deckMat = new THREE.MeshLambertMaterial({ color: 0x8a8d93 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(6, 1, SPAN), deckMat);
  deck.position.set(0, DECK_Y, 0);
  g.add(deck);

  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.road });
  const roadDeck = new THREE.Mesh(new THREE.BoxGeometry(5, 0.15, SPAN), roadMat);
  roadDeck.position.set(0, DECK_Y + 0.58, 0);
  g.add(roadDeck);

  const railMat = new THREE.MeshLambertMaterial({ color: 0xe0e0e0 });
  [-1, 1].forEach(side => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, SPAN), railMat);
    rail.position.set(side * 2.6, DECK_Y + 0.95, 0);
    g.add(rail);
  });

  return g;
}

// 縁石の外側に沿わせるガードレール。支柱(InstancedMesh)+2段の帯(チューブ)で
// 構成し、道路脇が寂しく見えないようにする。edgePointsは縁石外周のサンプル点列。
function buildFence(edgePoints) {
  const g = new THREE.Group();

  const postMat = new THREE.MeshLambertMaterial({ color: 0xd8d8d8 });
  const postGeo = new THREE.CylinderGeometry(0.09, 0.11, 1.0, 6);
  const step = 5; // サンプル点はcenterPtsと同密度(400分割)なので5点おき≒約1.4ユニット間隔
  const count = Math.ceil(edgePoints.length / step) + 1;
  const postMesh = new THREE.InstancedMesh(postGeo, postMat, count);
  const dummy = new THREE.Object3D();
  let idx = 0;
  for (let i = 0; i < edgePoints.length; i += step) {
    const p = edgePoints[i];
    dummy.position.set(p.x, p.y + 0.5, p.z);
    dummy.updateMatrix();
    postMesh.setMatrixAt(idx++, dummy.matrix);
  }
  postMesh.count = idx;
  g.add(postMesh);

  const railMat = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 });
  [0.85, 0.45].forEach(h => {
    const railCurve = new THREE.CatmullRomCurve3(
      edgePoints.map(p => new THREE.Vector3(p.x, p.y + h, p.z)), true, 'catmullrom', 0.55
    );
    const railGeo = new THREE.TubeGeometry(railCurve, edgePoints.length, 0.05, 6, true);
    g.add(new THREE.Mesh(railGeo, railMat));
  });

  return g;
}

// 縁石のさらに外側(ガードレールの外)に茂み・岩をランダムに散らして、道路脇の
// 密度を上げる。centerPts/edgePointsは同じインデックスで対応しているので、
// 「縁石点 - 中心点」の方向をそのまま外向き法線として使える。
function scatterRoadside(centerPts, edgePoints) {
  const group = new THREE.Group();
  const bushMat = new THREE.MeshLambertMaterial({ color: PALETTE.leaves });
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x9e9e9e });
  const step = 9;
  for (let i = 0; i < edgePoints.length; i += step) {
    if (Math.random() < 0.4) continue; // 隙間も残して単調な壁にならないようにする
    const edge = edgePoints[i];
    const center = centerPts[i];
    const outward = edge.clone().sub(center).normalize();
    const pos = edge.clone().addScaledVector(outward, 1.4 + Math.random() * 2.2);
    const isRock = Math.random() < 0.35;
    const mesh = isRock
      ? new THREE.Mesh(new THREE.DodecahedronGeometry(0.45 + Math.random() * 0.35, 0), rockMat)
      : new THREE.Mesh(new THREE.SphereGeometry(0.55 + Math.random() * 0.45, 6, 5), bushMat);
    mesh.position.copy(pos);
    mesh.position.y = edge.y + (isRock ? 0.25 : 0.5);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    group.add(mesh);
  }
  return group;
}

function buildTree() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.45, 2.2, 6),
    new THREE.MeshLambertMaterial({ color: PALETTE.trunk })
  );
  trunk.position.y = 1.1;
  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(1.8, 3.4, 8),
    new THREE.MeshLambertMaterial({ color: PALETTE.leaves })
  );
  leaves.position.y = 3.4;
  const leaves2 = new THREE.Mesh(
    new THREE.ConeGeometry(1.3, 2.4, 8),
    new THREE.MeshLambertMaterial({ color: PALETTE.leaves })
  );
  leaves2.position.y = 4.8;
  g.add(trunk, leaves, leaves2);
  return g;
}

// 現在位置がコース(道路)上にどれくらい近いかを粗く判定 (0=中心, 1=道路端)
export function roadOffsetRatio(track, position) {
  let minDist = Infinity;
  const pts = track.centerPts;
  const step = 2; // 粗いサンプリングで十分高速
  for (let i = 0; i < pts.length; i += step) {
    const d = pts[i].distanceToSquared(position);
    if (d < minDist) minDist = d;
  }
  const dist = Math.sqrt(minDist);
  return dist / (track.roadWidth / 2);
}

// 現在位置に一番近いcenterPtsのindexを返す(XZ平面のみで判定)。
// ジャンプ台/スピードパッドの「コース上のどのあたりを走っているか」判定など、
// 弧長ベースの位置判定に使う。
export function nearestCenterIndex(track, position) {
  const pts = track.centerPts;
  let bestI = 0;
  let bestDist = Infinity;
  const step = 2;
  for (let i = 0; i < pts.length; i += step) {
    const dx = pts[i].x - position.x;
    const dz = pts[i].z - position.z;
    const d = dx * dx + dz * dz;
    if (d < bestDist) { bestDist = d; bestI = i; }
  }
  return bestI;
}

// 線分a-b上に position をXZ平面で投影し、区間内の位置(0..1)における
// 高さを線形補間して返す。centerPtsは離散的な点の並びなので、一番近い
// 点の高さをそのまま使うと坂道でカクカクした段差(車体がバウンドして
// 見える原因)になってしまうため、区間内で滑らかに繋ぐために使う。
function projectHeightOnSegment(a, b, position) {
  const abx = b.x - a.x;
  const abz = b.z - a.z;
  const apx = position.x - a.x;
  const apz = position.z - a.z;
  const lenSq = abx * abx + abz * abz || 1;
  let t = (apx * abx + apz * abz) / lenSq;
  if (t < 0) t = 0; else if (t > 1) t = 1;
  const px = a.x + abx * t;
  const pz = a.z + abz * t;
  const dx = position.x - px;
  const dz = position.z - pz;
  return { distSq: dx * dx + dz * dz, y: a.y + (b.y - a.y) * t };
}

// 現在位置に一番近いコース上の高さと、その付近の勾配(ピッチ角)を返す。
// 坂道で車のY座標・傾きを追従させるために使う。
export function sampleTrackHeight(track, position) {
  const pts = track.centerPts;
  const n = pts.length;
  const bestI = nearestCenterIndex(track, position);
  const prevI = (bestI - 1 + n) % n;
  const nextI = (bestI + 1) % n;

  // 前後どちらの区間に位置しているかを判定し、その区間内で高さを補間する
  const segPrev = projectHeightOnSegment(pts[prevI], pts[bestI], position);
  const segNext = projectHeightOnSegment(pts[bestI], pts[nextI], position);
  const y = segPrev.distSq <= segNext.distSq ? segPrev.y : segNext.y;

  const spread = 4;
  const next = pts[(bestI + spread) % n];
  const prev = pts[(bestI - spread + n) % n];
  const horizDist = Math.hypot(next.x - prev.x, next.z - prev.z) || 1;
  const pitch = Math.atan2(next.y - prev.y, horizDist);
  return { y, pitch };
}

// ガードレール(fenceRadius)より外に出ないよう位置をクランプする。
// ガードレールが無いステージ(track.fenceRadiusが未定義、タイル系コースなど)では
// 何もしない。衝突した場合は壁の外向き法線{nx, nz}を返す(軽く跳ね返す演出に使う)。
// 衝突していなければnullを返す。
export function clampToTrackBounds(track, position) {
  if (!track.fenceRadius) return null;
  const pts = track.centerPts;
  let bestI = 0;
  let bestDist = Infinity;
  const step = 2;
  for (let i = 0; i < pts.length; i += step) {
    const d = pts[i].distanceToSquared(position);
    if (d < bestDist) { bestDist = d; bestI = i; }
  }
  const center = pts[bestI];
  const dx = position.x - center.x;
  const dz = position.z - center.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= track.fenceRadius) return null;
  const nx = dx / dist;
  const nz = dz / dist;
  position.x = center.x + nx * track.fenceRadius;
  position.z = center.z + nz * track.fenceRadius;
  return { nx, nz };
}
