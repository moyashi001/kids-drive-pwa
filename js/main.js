import * as THREE from '../lib/three/build/three.module.js';
import { GLTFLoader } from '../lib/three/examples/jsm/loaders/GLTFLoader.js';
import { CARS, getCarById } from './cars.js';
import { TOY_CARS, getToyCarById } from './toyCars.js';
import { createTrack } from './track.js';
import { createCityTrack } from './cityTrack.js';
import { STAGES } from './stages.js';
import { CarController } from './carController.js';
import { getCarSkill } from './carSkills.js';

const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

const screens = {
  loading: document.getElementById('loading-screen'),
  stage: document.getElementById('stage-screen'),
  select: document.getElementById('select-screen'),
  game: document.getElementById('game-screen'),
};

function showScreen(name) {
  for (const key in screens) screens[key].classList.toggle('active', key === name);
}

// ---------- ステージ管理 ----------
let currentStage = STAGES[0];

function getCarSet() {
  return currentStage.carSet === 'toy' ? TOY_CARS : CARS;
}
function getCarMetaById(id) {
  return currentStage.carSet === 'toy' ? getToyCarById(id) : getCarById(id);
}
function getCarModelPath(id) {
  return currentStage.carSet === 'toy' ? `assets/models/toycars/${id}.glb` : `assets/models/cars/${id}.glb`;
}
function getCarPreviewPath(id) {
  return currentStage.carSet === 'toy' ? `assets/previews/toycars/${id}.png` : `assets/previews/${id}.png`;
}

function buildStageGrid() {
  const grid = document.getElementById('stage-grid');
  STAGES.forEach(stage => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'stage-card';
    const emoji = document.createElement('div');
    emoji.className = 'stage-emoji';
    emoji.textContent = stage.emoji;
    const name = document.createElement('div');
    name.className = 'stage-name';
    name.textContent = stage.name;
    const desc = document.createElement('div');
    desc.className = 'stage-desc';
    desc.textContent = stage.description;
    card.appendChild(emoji);
    card.appendChild(name);
    card.appendChild(desc);
    card.addEventListener('click', () => selectStage(stage));
    grid.appendChild(card);
  });
}

function selectStage(stage) {
  if (currentStage !== stage) {
    currentStage = stage;
    trackDirty = true;
    npcs.forEach(npc => scene && scene.remove(npc.controller.group));
    npcs = [];
  }
  buildCarGrid();
  showScreen('select');
}

document.getElementById('stage-back-btn').addEventListener('click', () => {
  showScreen('stage');
});

// ---------- 車選択画面 ----------
let selectedCarId = null;

function buildCarGrid() {
  const grid = document.getElementById('car-grid');
  const startBtn = document.getElementById('start-btn');
  grid.innerHTML = '';
  selectedCarId = null;
  startBtn.disabled = true;
  getCarSet().forEach(car => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'car-card';
    card.dataset.carId = car.id;
    const img = document.createElement('img');
    img.src = getCarPreviewPath(car.id);
    img.alt = car.name;
    img.loading = 'lazy';
    const label = document.createElement('div');
    label.className = 'car-label';
    label.textContent = `${car.emoji} ${car.name}`;
    card.appendChild(img);
    card.appendChild(label);
    card.addEventListener('click', () => {
      grid.querySelectorAll('.car-card.selected').forEach(el => el.classList.remove('selected'));
      card.classList.add('selected');
      selectedCarId = car.id;
      startBtn.disabled = false;
    });
    grid.appendChild(card);
  });

  startBtn.onclick = () => {
    if (!selectedCarId) return;
    startGame(selectedCarId);
  };
}

// ---------- ローディング画面 ----------
function preloadPreviews(onProgress) {
  return new Promise(resolve => {
    const all = [...CARS.map(c => `assets/previews/${c.id}.png`), ...TOY_CARS.map(c => `assets/previews/toycars/${c.id}.png`)];
    let loaded = 0;
    const total = all.length;
    if (total === 0) { resolve(); return; }
    all.forEach(src => {
      const img = new Image();
      const done = () => {
        loaded++;
        onProgress(loaded / total);
        if (loaded >= total) resolve();
      };
      img.onload = done;
      img.onerror = done;
      img.src = src;
    });
  });
}

// ---------- Three.js セットアップ ----------
let renderer, scene, camera;
let hemiLight, sunLight;
let track;
let trackDirty = true; // ステージが変わったらtrackを作り直す必要がある
let carController = null;
let currentModel = null;
const gltfLoader = new GLTFLoader();
const gltfCache = new Map();

function initScene() {
  const canvas = document.getElementById('game-canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fd4f8);
  scene.fog = new THREE.Fog(0x8fd4f8, 120, 220);

  camera = new THREE.PerspectiveCamera(60, 1, 0.1, 500);

  hemiLight = new THREE.HemisphereLight(0xffffff, 0x6a9e39, 0.9);
  scene.add(hemiLight);
  sunLight = new THREE.DirectionalLight(0xffffff, 1.1);
  sunLight.position.set(60, 90, 40);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.left = -120;
  sunLight.shadow.camera.right = 120;
  sunLight.shadow.camera.top = 120;
  sunLight.shadow.camera.bottom = -120;
  sunLight.shadow.camera.far = 250;
  scene.add(sunLight);

  window.addEventListener('resize', onResize);
  onResize();
}

// 昼の草原/街コース向けの既定の空気感。ステージ側でthemeを指定しない場合はこれを使う
const DEFAULT_THEME = {
  sky: 0x8fd4f8, fogNear: 120, fogFar: 220,
  hemiSky: 0xffffff, hemiGround: 0x6a9e39, hemiIntensity: 0.9,
  sunColor: 0xffffff, sunIntensity: 1.1,
};

function applyStageTheme(stage) {
  const theme = stage.theme || DEFAULT_THEME;
  scene.background = new THREE.Color(theme.sky);
  scene.fog = new THREE.Fog(theme.sky, theme.fogNear, theme.fogFar);
  hemiLight.color.set(theme.hemiSky);
  hemiLight.groundColor.set(theme.hemiGround);
  hemiLight.intensity = theme.hemiIntensity;
  sunLight.color.set(theme.sunColor);
  sunLight.intensity = theme.sunIntensity;
}

async function ensureTrack() {
  if (!trackDirty && track) return;
  if (track) scene.remove(track.group);
  applyStageTheme(currentStage);
  track = currentStage.trackType === 'tile'
    ? await createCityTrack(currentStage.layout)
    : createTrack(currentStage.layout);
  scene.add(track.group);
  trackDirty = false;
}

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function loadCarModel(path) {
  if (gltfCache.has(path)) {
    return Promise.resolve(gltfCache.get(path).clone());
  }
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      path,
      gltf => {
        gltfCache.set(path, gltf.scene);
        resolve(gltf.scene.clone());
      },
      undefined,
      reject
    );
  });
}

// ---------- 入力 ----------
const input = { steer: 0, throttle: 0 };
const keyState = new Set();

function updateInputFromKeys() {
  let steer = 0;
  let throttle = 0;
  if (keyState.has('ArrowLeft') || keyState.has('KeyA')) steer -= 1;
  if (keyState.has('ArrowRight') || keyState.has('KeyD')) steer += 1;
  if (keyState.has('ArrowUp') || keyState.has('KeyW')) throttle += 1;
  if (keyState.has('ArrowDown') || keyState.has('KeyS')) throttle -= 1;
  input.steer = steer;
  input.throttle = throttle;
}

const CONTROL_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);

window.addEventListener('keydown', e => {
  if (CONTROL_KEYS.has(e.code)) e.preventDefault();
  keyState.add(e.code);
  updateInputFromKeys();
});
window.addEventListener('keyup', e => {
  if (CONTROL_KEYS.has(e.code)) e.preventDefault();
  keyState.delete(e.code);
  updateInputFromKeys();
});
// タブが非アクティブになる等でkeyupを取り逃すとキーが押しっぱなし扱いのまま
// 固着するため、フォーカスが外れたら入力状態を必ずリセットする
window.addEventListener('blur', () => {
  keyState.clear();
  updateInputFromKeys();
});

function setupTouchControls() {
  const touchControls = document.getElementById('touch-controls');
  if (!isTouchDevice) {
    touchControls.classList.add('hidden-controls');
    return;
  }
  const bindHold = (id, onDown, onUp) => {
    const el = document.getElementById(id);
    const start = ev => { ev.preventDefault(); onDown(); };
    const end = ev => { ev.preventDefault(); onUp(); };
    el.addEventListener('pointerdown', start);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointerleave', end);
    el.addEventListener('pointercancel', end);
  };
  const touchState = { left: false, right: false, accel: false, brake: false };
  const applyTouch = () => {
    let steer = 0;
    if (touchState.left) steer -= 1;
    if (touchState.right) steer += 1;
    let throttle = 0;
    if (touchState.accel) throttle += 1;
    if (touchState.brake) throttle -= 1;
    input.steer = steer;
    input.throttle = throttle;
  };
  bindHold('btn-left', () => { touchState.left = true; applyTouch(); }, () => { touchState.left = false; applyTouch(); });
  bindHold('btn-right', () => { touchState.right = true; applyTouch(); }, () => { touchState.right = false; applyTouch(); });
  bindHold('btn-accel', () => { touchState.accel = true; applyTouch(); }, () => { touchState.accel = false; applyTouch(); });
  bindHold('btn-brake', () => { touchState.brake = true; applyTouch(); }, () => { touchState.brake = false; applyTouch(); });
}

// ---------- サウンド(簡易エンジン音) ----------
let audioCtx = null;
let engineOsc = null;
let engineGain = null;
let soundOn = true;

function ensureAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  engineOsc = audioCtx.createOscillator();
  engineOsc.type = 'sawtooth';
  engineGain = audioCtx.createGain();
  engineGain.gain.value = 0;
  engineOsc.connect(engineGain).connect(audioCtx.destination);
  engineOsc.frequency.value = 60;
  engineOsc.start();
}

function updateEngineSound(speedRatio) {
  if (!audioCtx || !soundOn) return;
  const freq = 60 + Math.abs(speedRatio) * 140;
  engineOsc.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.05);
  engineGain.gain.setTargetAtTime(0.05 + Math.abs(speedRatio) * 0.05, audioCtx.currentTime, 0.05);
}

function setSoundEnabled(enabled) {
  soundOn = enabled;
  const btn = document.getElementById('sound-btn');
  btn.textContent = enabled ? '🔊' : '🔇';
  if (audioCtx) {
    if (enabled) audioCtx.resume();
    else audioCtx.suspend();
  }
}

// ---------- ゲーム開始 ----------
let gameStarted = false;

async function startGame(carId) {
  // 選択画面のボタンにフォーカスが残ったままだと、ブラウザによっては
  // 矢印キー入力がフォーカス移動/スクロールに奪われてしまうため外しておく
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();

  if (!renderer) initScene();
  await ensureTrack();
  showScreen('game');

  if (currentModel && carController) {
    carController.group.parent && carController.group.parent.remove(carController.group);
  }

  const carMeta = getCarMetaById(carId);
  document.getElementById('car-name-badge').textContent = `${carMeta.emoji} ${carMeta.name}`;

  const modelScene = await loadCarModel(getCarModelPath(carId));
  currentModel = modelScene;
  carController = new CarController(modelScene, carMeta, currentStage.worldScale || 1);
  carController.setPosition(track.startPosition, track.startAngle);
  scene.add(carController.group);
  cameraSnapPending = true; // 前回のカメラ位置から滑らかに動くのではなく、開始位置に即座に合わせる

  currentSkill = getCarSkill(carId);
  skillGauge = 0;
  skillActive = false;
  skillTimer = 0;
  updateSkillButton();

  setAutoMode(false, true);
  setupTouchControls();
  ensureAudio();

  if (npcs.length === 0) {
    await initNpcs();
  }

  if (!gameStarted) {
    gameStarted = true;
    requestAnimationFrame(loop);
  }
}

document.getElementById('back-btn').addEventListener('click', () => {
  showScreen('select');
  input.steer = 0;
  input.throttle = 0;
});

let autoMode = false;
function setAutoMode(enabled, silent) {
  autoMode = enabled;
  if (carController) carController.setAutoMode(enabled, track);
  const modeBtn = document.getElementById('mode-btn');
  const modeIcon = document.getElementById('mode-icon');
  modeBtn.classList.toggle('mode-auto', enabled);
  modeBtn.classList.toggle('mode-manual', !enabled);
  modeIcon.textContent = enabled ? '🤖' : '🕹️';
  if (!silent) {
    const banner = document.getElementById('mode-banner');
    banner.textContent = enabled ? 'オートモード' : 'マニュアルモード';
    banner.classList.add('show');
    clearTimeout(setAutoMode._t);
    setAutoMode._t = setTimeout(() => banner.classList.remove('show'), 1400);
  }
}

document.getElementById('mode-btn').addEventListener('click', () => {
  setAutoMode(!autoMode);
});

document.getElementById('sound-btn').addEventListener('click', () => {
  setSoundEnabled(!soundOn);
});

// ---------- カメラ視点切り替え ----------
const CAMERA_MODES = ['follow', 'top'];
const CAMERA_MODE_ICON = { follow: '🎥', top: '🛰️' };
let cameraMode = 'follow';
let cameraSnapPending = false; // 切替直後は1フレームだけ即座にカメラを合わせる(ふわっと動くのを防ぐ)

function cycleCameraMode() {
  const idx = CAMERA_MODES.indexOf(cameraMode);
  cameraMode = CAMERA_MODES[(idx + 1) % CAMERA_MODES.length];
  cameraSnapPending = true;
  document.getElementById('camera-icon').textContent = CAMERA_MODE_ICON[cameraMode];
}

document.getElementById('camera-btn').addEventListener('click', cycleCameraMode);

// ---------- NPC車(コース上を自動走行し、ぶつかると爆発する) ----------
const COLLISION_DIST_BY_TYPE = { spline: 2.4, tile: 3.2 };
const EXPLODE_DURATION = 1.0;
const EXPLODE_RESPAWN_DELAY = 0.6;

let npcs = [];
const explosionParticles = [];

function placeOnCurve(controller, u) {
  const point = track.curve.getPointAt(u);
  const tangent = track.curve.getTangentAt(u);
  const heading = Math.atan2(tangent.x, tangent.z);
  controller.setPosition(point, heading);
}

async function initNpcs() {
  const ids = currentStage.npcIds || [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const phase = (i + 0.5) / ids.length;
    const meta = getCarMetaById(id);
    const modelScene = await loadCarModel(getCarModelPath(id));
    const controller = new CarController(modelScene, meta, currentStage.worldScale || 1);
    controller.autoMode = true;
    controller.autoU = phase;
    placeOnCurve(controller, phase);
    scene.add(controller.group);
    npcs.push({
      controller,
      state: 'driving',
      timer: 0,
      velocity: new THREE.Vector3(),
      angVel: new THREE.Vector3(),
    });
  }
}

function spawnExplosionBurst(position) {
  const s = currentStage.worldScale || 1;
  const count = 10;
  for (let i = 0; i < count; i++) {
    const geo = new THREE.BoxGeometry(0.35 * s, 0.35 * s, 0.35 * s);
    const color = Math.random() < 0.5 ? 0xff9800 : 0xffeb3b;
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
    mesh.position.copy(position).add(new THREE.Vector3(0, 0.8 * s, 0));
    const angle = Math.random() * Math.PI * 2;
    const speed = (4 + Math.random() * 5) * s;
    const vel = new THREE.Vector3(Math.cos(angle) * speed, (5 + Math.random() * 5) * s, Math.sin(angle) * speed);
    scene.add(mesh);
    explosionParticles.push({ mesh, vel, life: 0, maxLife: 0.7 + Math.random() * 0.3 });
  }
}

function updateExplosionParticles(dt) {
  const s = currentStage.worldScale || 1;
  for (let i = explosionParticles.length - 1; i >= 0; i--) {
    const p = explosionParticles[i];
    p.life += dt;
    p.vel.y -= 20 * s * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mesh.rotation.x += dt * 10;
    p.mesh.rotation.y += dt * 8;
    const t = p.life / p.maxLife;
    p.mesh.scale.setScalar(Math.max(0, 1 - t));
    if (p.life >= p.maxLife) {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
      explosionParticles.splice(i, 1);
    }
  }
}

function playExplosionSound() {
  if (!audioCtx || !soundOn) return;
  const bufferSize = Math.floor(audioCtx.sampleRate * 0.3);
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.5;
  noise.connect(gain).connect(audioCtx.destination);
  noise.start();
}

function explodeNpc(npc) {
  if (npc.state === 'exploding') return;
  npc.state = 'exploding';
  npc.timer = 0;
  const s = currentStage.worldScale || 1;
  const away = npc.controller.group.position.clone().sub(carController.group.position);
  away.y = 0;
  if (away.lengthSq() < 0.0001) away.set(Math.random() - 0.5, 0, Math.random() - 0.5);
  away.normalize();
  npc.velocity.copy(away).multiplyScalar(9 * s).add(new THREE.Vector3(0, 11 * s, 0));
  npc.angVel.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
  spawnExplosionBurst(npc.controller.group.position);
  playExplosionSound();
}

function respawnNpc(npc) {
  npc.state = 'driving';
  npc.controller.group.scale.setScalar(1);
  const u = Math.random();
  npc.controller.autoU = u;
  placeOnCurve(npc.controller, u);
}

function updateNpcs(dt) {
  for (const npc of npcs) {
    if (npc.state === 'driving') {
      npc.controller.update(dt, track);
      if (carController) {
        const dist = npc.controller.group.position.distanceTo(carController.group.position);
        const threshold = COLLISION_DIST_BY_TYPE[currentStage.trackType] || 2.4;
        if (dist < threshold) explodeNpc(npc);
      }
    } else {
      npc.timer += dt;
      npc.velocity.y -= 26 * (currentStage.worldScale || 1) * dt;
      npc.controller.group.position.addScaledVector(npc.velocity, dt);
      npc.controller.group.rotation.x += npc.angVel.x * dt;
      npc.controller.group.rotation.y += npc.angVel.y * dt;
      npc.controller.group.rotation.z += npc.angVel.z * dt;
      const t = Math.min(1, npc.timer / EXPLODE_DURATION);
      npc.controller.group.scale.setScalar(Math.max(0, 1 - t));
      if (npc.timer > EXPLODE_DURATION + EXPLODE_RESPAWN_DELAY) respawnNpc(npc);
    }
  }
}

// ---------- とくぎ(車種ごとの必殺技) ----------
// 走行距離に応じてゲージが溜まり、満タンでボタンが発動可能になる。
// kind: 'siren'   -> 発動と同時に周囲のNPCをまとめて吹き飛ばす
// kind: 'boost'   -> 一定時間、最高速度・加速を強化する
// kind: 'agility' -> 一定時間、最高速度と旋回性能を強化する
// kind: 'ram'     -> 一定時間ブーストしながら、触れたNPCを継続的に吹き飛ばす
const SKILL_GAUGE_DISTANCE = 220; // これだけ走るとゲージが満タンになる(units)
const SKILL_SPARKLE_COLORS = [0xffd700, 0xffffff, 0x00e5ff, 0xff4fa3];
let currentSkill = null;
let skillGauge = 0;   // 0..1
let skillActive = false;
let skillTimer = 0;
let skillSparkleTimer = 0;
const sirenRings = [];
const skillSparkles = [];

function updateSkillButton() {
  const btn = document.getElementById('skill-btn');
  const icon = document.getElementById('skill-icon');
  if (!currentSkill) {
    btn.classList.add('skill-hidden');
    return;
  }
  btn.classList.remove('skill-hidden');
  icon.textContent = currentSkill.icon;
  const pct = skillActive ? 100 : Math.round(skillGauge * 100);
  btn.style.setProperty('--skill-pct', `${pct}%`);
  btn.classList.toggle('skill-ready', skillGauge >= 1 && !skillActive);
}

function spawnSirenRing(center, radius, delay) {
  const geo = new THREE.CircleGeometry(1, 32);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xff1744, transparent: true, opacity: 0.5,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.copy(center);
  mesh.position.y = 0.05;
  scene.add(mesh);
  sirenRings.push({ mesh, radius, duration: 1.1, life: -delay });
}

function updateSirenRings(dt) {
  for (let i = sirenRings.length - 1; i >= 0; i--) {
    const r = sirenRings[i];
    r.life += dt;
    if (r.life < 0) { r.mesh.visible = false; continue; }
    r.mesh.visible = true;
    const t = Math.min(1, r.life / r.duration);
    const scale = Math.max(0.001, r.radius * t);
    r.mesh.scale.set(scale, scale, scale);
    r.mesh.material.opacity = 0.5 * (1 - t);
    if (t >= 1) {
      scene.remove(r.mesh);
      r.mesh.geometry.dispose();
      r.mesh.material.dispose();
      sirenRings.splice(i, 1);
    }
  }
}

// 発動時のキラキラ演出。とくぎの種類によらず、派手さを出すために共通で呼ぶ
function spawnSkillSparkles(position, count, spread, s) {
  for (let i = 0; i < count; i++) {
    const size = (0.12 + Math.random() * 0.2) * s;
    const geo = new THREE.OctahedronGeometry(size, 0);
    const color = SKILL_SPARKLE_COLORS[Math.floor(Math.random() * SKILL_SPARKLE_COLORS.length)];
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position).add(new THREE.Vector3(
      (Math.random() - 0.5) * spread,
      (0.3 + Math.random() * 1.2) * s,
      (Math.random() - 0.5) * spread
    ));
    scene.add(mesh);
    const angle = Math.random() * Math.PI * 2;
    const speed = (1.5 + Math.random() * 3.5) * s;
    const vel = new THREE.Vector3(Math.cos(angle) * speed, (2 + Math.random() * 3.5) * s, Math.sin(angle) * speed);
    skillSparkles.push({ mesh, vel, life: 0, maxLife: 0.6 + Math.random() * 0.5, spin: (Math.random() - 0.5) * 12 });
  }
}

function updateSkillSparkles(dt) {
  for (let i = skillSparkles.length - 1; i >= 0; i--) {
    const p = skillSparkles[i];
    p.life += dt;
    p.vel.y -= 6 * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mesh.rotation.x += p.spin * dt;
    p.mesh.rotation.y += p.spin * dt * 0.7;
    const t = p.life / p.maxLife;
    p.mesh.material.opacity = Math.max(0, 1 - t);
    p.mesh.scale.setScalar(1 + Math.sin(t * Math.PI * 6) * 0.2); // きらきら明滅させる
    if (t >= 1) {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
      skillSparkles.splice(i, 1);
    }
  }
}

function flashSkillScreen() {
  const flash = document.getElementById('skill-flash');
  flash.classList.remove('flash');
  void flash.offsetWidth; // リフローを挟んでアニメーションを再始動させる
  flash.classList.add('flash');
}

function explodeNpcsAround(center, radius) {
  for (const npc of npcs) {
    if (npc.state === 'driving' && npc.controller.group.position.distanceTo(center) <= radius) {
      explodeNpc(npc);
    }
  }
}

function activateSkill() {
  if (!currentSkill || !carController || skillActive || skillGauge < 1) return;
  skillGauge = 0;
  skillActive = true;
  skillTimer = currentSkill.duration;
  skillSparkleTimer = 0;

  const s = currentStage.worldScale || 1;
  const carPos = carController.group.position;
  spawnSkillSparkles(carPos, 22, 2.4 * s, s);
  flashSkillScreen();

  if (currentSkill.kind === 'siren') {
    const threshold = COLLISION_DIST_BY_TYPE[currentStage.trackType] || 2.4;
    const radius = threshold * currentSkill.radiusMul;
    explodeNpcsAround(carPos, radius);
    spawnSirenRing(carPos, radius, 0);
    spawnSirenRing(carPos, radius * 0.7, 0.15);
  } else if (currentSkill.kind === 'boost') {
    carController.boostMultiplier = currentSkill.speedMul;
  } else if (currentSkill.kind === 'agility') {
    carController.boostMultiplier = currentSkill.speedMul;
    carController.turnBoostMultiplier = currentSkill.turnMul;
  } else if (currentSkill.kind === 'ram') {
    carController.boostMultiplier = currentSkill.speedMul;
    const threshold = COLLISION_DIST_BY_TYPE[currentStage.trackType] || 2.4;
    explodeNpcsAround(carPos, threshold * currentSkill.radiusMul);
    spawnSirenRing(carPos, threshold * currentSkill.radiusMul, 0);
  }

  updateSkillButton();
}

document.getElementById('skill-btn').addEventListener('click', activateSkill);
window.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    e.preventDefault();
    activateSkill();
  }
});

function updateSkill(dt) {
  if (!carController || !currentSkill) return;

  if (skillActive) {
    skillTimer -= dt;

    // ram中は継続的に周囲を巻き込む。boost/agilityは走行中にきらきらの尾を引かせる
    const s = currentStage.worldScale || 1;
    if (currentSkill.kind === 'ram') {
      const threshold = COLLISION_DIST_BY_TYPE[currentStage.trackType] || 2.4;
      explodeNpcsAround(carController.group.position, threshold * currentSkill.radiusMul);
    }
    if (currentSkill.kind !== 'siren') {
      skillSparkleTimer += dt;
      if (skillSparkleTimer >= 0.06) {
        skillSparkleTimer = 0;
        spawnSkillSparkles(carController.group.position, 2, 0.8 * s, s);
      }
    }

    if (skillTimer <= 0) {
      skillActive = false;
      carController.boostMultiplier = 1;
      carController.turnBoostMultiplier = 1;
    }
  } else if (skillGauge < 1) {
    skillGauge = Math.min(1, skillGauge + Math.abs(carController.speed) * dt / SKILL_GAUGE_DISTANCE);
  }

  updateSkillButton();
}

// ---------- カメラ追従 ----------
// toy-car-kitの車はKenney Car Kitの車の1/3ほどのサイズなので、
// カメラの追従距離・注視点オフセットもcarSetに応じて縮める
const CAMERA_RIG_BY_CAR_SET = {
  kenney: { back: 9, up: 4.5, lookUp: 1.2, lookAhead: 3, topHeight: 30 },
  toy: { back: 3.2, up: 1.7, lookUp: 0.5, lookAhead: 1.2, topHeight: 12 },
};
const camOffset = new THREE.Vector3();
const camTarget = new THREE.Vector3();
const lookTarget = new THREE.Vector3();

function updateCamera(dt) {
  if (!carController) return;
  const forward = carController.forwardVector();
  const carPos = carController.group.position;
  const rig = CAMERA_RIG_BY_CAR_SET[currentStage.carSet] || CAMERA_RIG_BY_CAR_SET.kenney;
  // 切替直後はlerpをかけず即座にカメラを合わせる(ふわっと移動する違和感を防ぐ)
  const lerpT = cameraSnapPending ? 1 : Math.min(1, dt * 4);
  cameraSnapPending = false;

  if (cameraMode === 'top') updateCameraTop(carPos, rig, lerpT);
  else updateCameraFollow(carPos, forward, rig, lerpT);
}

function updateCameraFollow(carPos, forward, rig, lerpT) {
  camera.up.set(0, 1, 0);
  camOffset.copy(forward).multiplyScalar(-rig.back).add(new THREE.Vector3(0, rig.up, 0));
  camTarget.copy(carPos).add(camOffset);
  camera.position.lerp(camTarget, lerpT);

  lookTarget.copy(carPos).add(new THREE.Vector3(0, rig.lookUp, 0)).addScaledVector(forward, rig.lookAhead);
  camera.lookAt(lookTarget);
}

function updateCameraTop(carPos, rig, lerpT) {
  // 真上から見下ろす視点。up を進行方向の目安(-Z)にしておかないとlookAtで映像が回転してしまう
  camera.up.set(0, 0, -1);
  camTarget.copy(carPos).add(new THREE.Vector3(0, rig.topHeight, 0));
  camera.position.lerp(camTarget, lerpT);
  camera.lookAt(carPos);
}

// ---------- メインループ ----------
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (carController) {
    if (!autoMode) {
      carController.throttleInput = input.throttle;
      carController.steerInput = input.steer;
    }
    carController.update(dt, track);
    updateNpcs(dt);
    updateExplosionParticles(dt);
    updateSirenRings(dt);
    updateSkillSparkles(dt);
    updateSkill(dt);
    updateCamera(dt);
    updateEngineSound(carController.speed / (26 * (currentStage.worldScale || 1)));
  }

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

// ---------- PWAインストール ----------
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('install-toast').classList.remove('hidden');
});
document.getElementById('install-btn').addEventListener('click', async () => {
  document.getElementById('install-toast').classList.add('hidden');
  if (deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  }
});
document.getElementById('install-dismiss').addEventListener('click', () => {
  document.getElementById('install-toast').classList.add('hidden');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// ---------- 起動 ----------
async function boot() {
  buildStageGrid();
  const bar = document.getElementById('loading-bar');
  await preloadPreviews(ratio => { bar.style.width = `${Math.round(ratio * 100)}%`; });
  showScreen('stage');
}

boot();
