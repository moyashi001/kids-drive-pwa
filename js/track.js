import * as THREE from '../lib/three/build/three.module.js';

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

// クローズドループのコース制御点(XZ平面、Yは常に0)。そうげんループの既定コース
const DEFAULT_CONTROL_POINTS = [
  [0, -46], [26, -50], [48, -38], [56, -14], [50, 10],
  [30, 22], [30, 40], [10, 52], [-18, 48], [-34, 30],
  [-30, 8], [-46, -4], [-54, -26], [-38, -46], [-16, -50],
];

function buildControlPoints(points) {
  return (points || DEFAULT_CONTROL_POINTS).map(([x, z]) => new THREE.Vector3(x, 0, z));
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

  function ribbon(edgeA, edgeB, y = 0.01) {
    const positions = [];
    const indices = [];
    for (let i = 0; i < edgeA.length; i++) {
      positions.push(edgeA[i].x, y, edgeA[i].z);
      positions.push(edgeB[i].x, y, edgeB[i].z);
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
    dummy.position.set(p.x, 0.05, p.z);
    dummy.rotation.set(0, angle, 0);
    dummy.updateMatrix();
    dashMesh.setMatrixAt(dashCount++, dummy.matrix);
  }
  dashMesh.count = dashCount;
  group.add(dashMesh);

  // ---- 地面(草) ----
  // 半径はフォグの終端(240)より大きくして、地面の縁がフォグの手前で
  // 途切れて空との境界線が見えてしまわないようにする
  const groundGeo = new THREE.CircleGeometry(300, 48);
  const groundMat = new THREE.MeshLambertMaterial({ color: PALETTE.grass });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  group.add(ground);

  // うっすら模様(芝生のブロック感)
  const patchGeo = new THREE.RingGeometry(30, 300, 48, 6);
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

  // ---- 簡易な木(デコレーション) ----
  for (let i = 0; i < 26; i++) {
    const angle = (i / 26) * Math.PI * 2;
    const radius = 95 + Math.sin(i * 3.1) * 18;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const tree = buildTree();
    tree.position.set(x, 0, z);
    const s = 0.8 + Math.random() * 0.6;
    tree.scale.set(s, s, s);
    group.add(tree);
  }

  return {
    group,
    curve,
    centerPts,
    roadWidth: ROAD_WIDTH,
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
