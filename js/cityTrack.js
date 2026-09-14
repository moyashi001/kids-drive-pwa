import * as THREE from '../lib/three/build/three.module.js';
import { GLTFLoader } from '../lib/three/examples/jsm/loaders/GLTFLoader.js';

// city-kit-roads / city-kit-industrial (Kenney, CC0) のタイル1個ぶんのワールドサイズ。
// タイル本体は1x1で作られているため、この倍率で拡大してtoy-car-kitの車とスケールを合わせる。
export const TILE_SCALE = 6;

const gltfLoader = new GLTFLoader();
const tileCache = new Map();

// Kenneyのタイル/建物テクスチャは色帯を敷き詰めた小さなパレット画像で、
// 色の境界がくっきりしているため、通常のミップマップ生成(バイリニア縮小)を
// 適用すると隣接する色帯が混ざり合い、道路を真上や斜め上から見た際に
// 実在しない明るい縞模様(モアレ)が見えてしまう。ミップマップを無効化して防ぐ。
function fixPaletteTextureFiltering(scene) {
  scene.traverse(obj => {
    if (obj.isMesh && obj.material && obj.material.map) {
      const tex = obj.material.map;
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
    }
  });
}

function loadModel(path) {
  if (tileCache.has(path)) return Promise.resolve(tileCache.get(path).clone());
  return new Promise((resolve, reject) => {
    gltfLoader.load(path, gltf => {
      fixPaletteTextureFiltering(gltf.scene);
      tileCache.set(path, gltf.scene);
      resolve(gltf.scene.clone());
    }, undefined, reject);
  });
}

function loadTile(type) {
  return loadModel(`assets/models/roadtiles/${type}.glb`);
}

function loadBuilding(type) {
  // "cyberpunk/xxx" のように拡張子付きのtypeを渡された場合はそのまま使う(Quaternius製の
  // .gltfをbuildingsフォルダのサブディレクトリに置いているため)。それ以外は従来通り.glb。
  const path = type.endsWith('.gltf') ? type : `${type}.glb`;
  return loadModel(`assets/models/buildings/${path}`);
}

// サイバーパンク調のネオン看板/機材はテクスチャ色をそのまま自発光させることで、
// 夜のステージで光っているように見せる(Quaternius素材はemissiveを持たないベタ色PBRのため)。
function applyEmissiveGlow(scene, intensity) {
  scene.traverse(obj => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat.isMeshStandardMaterial) continue;
      mat.emissive = mat.map ? new THREE.Color(0xffffff) : mat.color.clone();
      mat.emissiveMap = mat.map || null;
      mat.emissiveIntensity = intensity;
    }
  });
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
    mesh.scale.setScalar(TILE_SCALE * (t.scale || 1));
    mesh.position.set(t.gx * TILE_SCALE, 0, t.gz * TILE_SCALE);
    mesh.rotation.y = THREE.MathUtils.degToRad(t.rotDeg || 0);
    // receiveShadow=falseにしている理由: sun(DirectionalLight)のshadow cameraは
    // 草原ステージ(±120の広い範囲)向けに設定されており、まちなかステージの
    // 小さなタイル(1マス6ユニット)に対しては1px相当のワールド距離が粗すぎ、
    // シャドウアクネ(縞模様のノイズ)が道路面に出てしまう。実害の大きい
    // ノイズを避けるため、タイル面では影を受けないようにする。
    mesh.traverse(o => { if (o.isMesh) { o.receiveShadow = false; o.castShadow = false; } });
    roadGroup.add(mesh);
  }

  // 地面(タイルの下地。舗装/地面色の大きな円)
  const groundRadius = (def.groundRadius || 6) * TILE_SCALE;
  const groundGeo = new THREE.CircleGeometry(groundRadius, 48);
  const groundMat = new THREE.MeshLambertMaterial({ color: def.groundColor || 0x8d9199 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(def.groundCenter ? def.groundCenter[0] * TILE_SCALE : 0, -0.02, def.groundCenter ? def.groundCenter[1] * TILE_SCALE : 0);
  ground.receiveShadow = false;
  group.add(ground);

  const decorGroup = new THREE.Group();
  group.add(decorGroup);
  for (const b of def.buildings || []) {
    const mesh = await loadBuilding(b.type);
    mesh.scale.setScalar(TILE_SCALE * (b.scale || 1));
    mesh.position.set(b.gx * TILE_SCALE, 0, b.gz * TILE_SCALE);
    mesh.rotation.y = THREE.MathUtils.degToRad(b.rotDeg || 0);
    mesh.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    if (b.type.startsWith('cyberpunk/')) applyEmissiveGlow(mesh, b.glowIntensity || 1.1);
    decorGroup.add(mesh);
  }

  // 走行経路: タイル配置に沿ったグリッド座標の折れ線から閉曲線を作る
  const pathPoints = def.path.map(([gx, gz]) => new THREE.Vector3(gx * TILE_SCALE, 0, gz * TILE_SCALE));
  const curve = new THREE.CatmullRomCurve3(pathPoints, true, 'catmullrom', 0.1);

  const SEGMENTS = 360;
  const centerPts = [];
  for (let i = 0; i <= SEGMENTS; i++) centerPts.push(curve.getPointAt(i / SEGMENTS));

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
