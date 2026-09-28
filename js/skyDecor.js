import * as THREE from '../lib/three/build/three.module.js';

// 遠景の山なみ。低ポリの四角錐をリング状にランダム配置して、
// 空だけだった背景に奥行きを出す。
export function buildMountainRing(radius, count, color) {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color });
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
    const r = radius + (Math.random() - 0.5) * radius * 0.15;
    const height = radius * 0.22 + Math.random() * radius * 0.16;
    const width = radius * 0.18 + Math.random() * radius * 0.12;
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(width, height, 4), mat);
    mesh.position.set(Math.cos(angle) * r, height / 2 - radius * 0.02, Math.sin(angle) * r);
    mesh.rotation.y = Math.random() * Math.PI;
    group.add(mesh);
  }
  return group;
}

// 空に浮かぶ雲。球をいくつか寄せ集めた簡易的なもこもこ雲をランダムに散らす。
export function buildClouds(radius, count) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = radius * (0.35 + Math.random() * 0.65);
    const height = radius * 0.28 + Math.random() * radius * 0.18;
    const cloud = new THREE.Group();
    const blobCount = 3 + Math.floor(Math.random() * 3);
    const scale = radius / 180;
    for (let b = 0; b < blobCount; b++) {
      const s = (2.6 + Math.random() * 2.6) * scale;
      const blob = new THREE.Mesh(new THREE.SphereGeometry(s, 7, 6), mat);
      blob.position.set((Math.random() - 0.5) * 7 * scale, (Math.random() - 0.5) * 1.4 * scale, (Math.random() - 0.5) * 3.5 * scale);
      cloud.add(blob);
    }
    cloud.position.set(Math.cos(angle) * r, height, Math.sin(angle) * r);
    group.add(cloud);
  }
  return group;
}

// ふんわりした円形グラデーションのテクスチャ(太陽/月の発光表現に使う)
function buildGlowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.7)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// 空に浮かぶ太陽(昼間ステージ)/月(サイバーシティなど夜ステージ)。
// 常にカメラの方を向くスプライトなので、コースのどこから見ても丸く見える。
export function buildSun(color, radius) {
  const mat = new THREE.SpriteMaterial({
    map: buildGlowTexture(), color, transparent: true, opacity: 0.95,
    depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.setScalar(radius * 0.3);
  return sprite;
}

// マリオカート風の飛行船(単純な楕円体+尾翼+ゴンドラ)。
// scaleで街コース(小さめ)/草原コース(大きめ)のサイズ差に合わせる。
export function buildBlimp(bodyColor, finColor, scale = 1) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });
  const body = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 10), bodyMat);
  body.scale.set(1, 0.85, 2.2);
  g.add(body);
  const finMat = new THREE.MeshLambertMaterial({ color: finColor });
  [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([sx, sy]) => {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.2, 2.2), finMat);
    fin.position.set(sx * 1.5, sy * 1.5, -7.6);
    g.add(fin);
  });
  const gondola = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 3), new THREE.MeshLambertMaterial({ color: 0x333333 }));
  gondola.position.set(0, -3.6, 0);
  g.add(gondola);
  g.scale.setScalar(scale);
  return g;
}
