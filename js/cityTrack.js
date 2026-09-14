import * as THREE from '../lib/three/build/three.module.js';
import { GLTFLoader } from '../lib/three/examples/jsm/loaders/GLTFLoader.js';

// city-kit-roads / city-kit-industrial (Kenney, CC0) のタイル1個ぶんのワールドサイズ。
// タイル本体は1x1で作られているため、この倍率で拡大してtoy-car-kitの車とスケールを合わせる。
export const TILE_SCALE = 6;

const gltfLoader = new GLTFLoader();
const tileCache = new Map();

function loadModel(path) {
  if (tileCache.has(path)) return Promise.resolve(tileCache.get(path).clone());
  return new Promise((resolve, reject) => {
    gltfLoader.load(path, gltf => {
      tileCache.set(path, gltf.scene);
      resolve(gltf.scene.clone());
    }, undefined, reject);
  });
}

function loadTile(type) {
  return loadModel(`assets/models/roadtiles/${type}.glb`);
}

function loadBuilding(type) {
  return loadModel(`assets/models/buildings/${type}.glb`);
}

// 経路(curve)に沿って、進行方向を指す矢印を一定間隔で並べる。
// タイルの模様だけでは分岐や似た直線区間で進行方向が分かりにくいための視覚ガイド。
function buildDirectionArrows(curve, tileScale) {
  const group = new THREE.Group();
  const length = curve.getLength();
  const spacing = tileScale * 0.9;
  const count = Math.max(6, Math.round(length / spacing));
  const geo = new THREE.ConeGeometry(tileScale * 0.14, tileScale * 0.4, 3);
  geo.rotateX(Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffd54f, transparent: true, opacity: 0.9 });
  for (let i = 0; i < count; i++) {
    const u = i / count;
    const point = curve.getPointAt(u);
    const tangent = curve.getTangentAt(u);
    const angle = Math.atan2(tangent.x, tangent.z);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(point);
    mesh.position.y = 0.06;
    mesh.rotation.y = angle;
    group.add(mesh);
  }
  return group;
}

/**
 * タイル配置と装飾物からステージ(コース)を組み立てる。
 * 戻り値はtrack.jsのcreateTrack()と同じ形(group/curve/centerPts/roadWidth/decorGroup/
 * startPosition/startAngle)にしているので、main.js側のcarController/NPC/カメラ等は
 * トラックの種類を意識せずそのまま使い回せる。
 *
 * @param {Object} def
 * @param {Array<{type:string, gx:number, gz:number, rotDeg?:number}>} def.tiles タイル配置
 * @param {Array<{type:string, gx:number, gz:number, rotDeg?:number, scale?:number}>} def.buildings 建物配置
 * @param {Array<[number,number]>} def.path 走行経路(グリッド座標の中心を結ぶ折れ線、閉ループ)
 * @param {number} [def.groundColor] 地面(舗装)の色
 * @param {number} [def.groundRadius] 地面円の半径(グリッド単位)
 */
export async function createCityTrack(def) {
  const group = new THREE.Group();
  const roadGroup = new THREE.Group();
  group.add(roadGroup);

  for (const t of def.tiles) {
    const mesh = await loadTile(t.type);
    mesh.scale.setScalar(TILE_SCALE);
    mesh.position.set(t.gx * TILE_SCALE, 0, t.gz * TILE_SCALE);
    mesh.rotation.y = THREE.MathUtils.degToRad(t.rotDeg || 0);
    mesh.traverse(o => { if (o.isMesh) { o.receiveShadow = true; o.castShadow = false; } });
    roadGroup.add(mesh);
  }

  // 地面(タイルの下地。舗装/地面色の大きな円)
  const groundRadius = (def.groundRadius || 6) * TILE_SCALE;
  const groundGeo = new THREE.CircleGeometry(groundRadius, 48);
  const groundMat = new THREE.MeshLambertMaterial({ color: def.groundColor || 0x8d9199 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(def.groundCenter ? def.groundCenter[0] * TILE_SCALE : 0, -0.02, def.groundCenter ? def.groundCenter[1] * TILE_SCALE : 0);
  ground.receiveShadow = true;
  group.add(ground);

  const decorGroup = new THREE.Group();
  group.add(decorGroup);
  for (const b of def.buildings || []) {
    const mesh = await loadBuilding(b.type);
    mesh.scale.setScalar(TILE_SCALE * (b.scale || 1));
    mesh.position.set(b.gx * TILE_SCALE, 0, b.gz * TILE_SCALE);
    mesh.rotation.y = THREE.MathUtils.degToRad(b.rotDeg || 0);
    mesh.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    decorGroup.add(mesh);
  }

  // 走行経路: タイル配置に沿ったグリッド座標の折れ線から閉曲線を作る
  const pathPoints = def.path.map(([gx, gz]) => new THREE.Vector3(gx * TILE_SCALE, 0, gz * TILE_SCALE));
  const curve = new THREE.CatmullRomCurve3(pathPoints, true, 'catmullrom', 0.1);

  const SEGMENTS = 360;
  const centerPts = [];
  for (let i = 0; i <= SEGMENTS; i++) centerPts.push(curve.getPointAt(i / SEGMENTS));

  // 道路タイルの模様だけでは「どちらに進むか」が分かりにくいため、
  // 経路に沿って進行方向を示す黄色い矢印を一定間隔で浮かべる
  const arrowGroup = buildDirectionArrows(curve, TILE_SCALE);
  group.add(arrowGroup);

  const startPosition = centerPts[0].clone();
  const startTangent = curve.getTangentAt(0);
  const startAngle = Math.atan2(startTangent.x, startTangent.z);

  return {
    group,
    curve,
    centerPts,
    roadWidth: TILE_SCALE * (def.roadWidthRatio || 0.55),
    decorGroup,
    startPosition,
    startAngle,
  };
}
