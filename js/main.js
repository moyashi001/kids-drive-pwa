import * as THREE from '../lib/three/build/three.module.js';
import { GLTFLoader } from '../lib/three/examples/jsm/loaders/GLTFLoader.js';
import { CARS, getCarById } from './cars.js';
import { createTrack } from './track.js';
import { CarController } from './carController.js';

const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

const screens = {
  loading: document.getElementById('loading-screen'),
  select: document.getElementById('select-screen'),
  game: document.getElementById('game-screen'),
};

function showScreen(name) {
  for (const key in screens) screens[key].classList.toggle('active', key === name);
}

// ---------- 車選択画面 ----------
let selectedCarId = null;

function buildCarGrid() {
  const grid = document.getElementById('car-grid');
  const startBtn = document.getElementById('start-btn');
  CARS.forEach(car => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'car-card';
    card.dataset.carId = car.id;
    const img = document.createElement('img');
    img.src = `assets/previews/${car.id}.png`;
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

  startBtn.addEventListener('click', () => {
    if (!selectedCarId) return;
    startGame(selectedCarId);
  });
}

// ---------- ローディング画面 ----------
function preloadPreviews(onProgress) {
  return new Promise(resolve => {
    let loaded = 0;
    const total = CARS.length;
    if (total === 0) { resolve(); return; }
    CARS.forEach(car => {
      const img = new Image();
      const done = () => {
        loaded++;
        onProgress(loaded / total);
        if (loaded >= total) resolve();
      };
      img.onload = done;
      img.onerror = done;
      img.src = `assets/previews/${car.id}.png`;
    });
  });
}

// ---------- Three.js セットアップ ----------
let renderer, scene, camera;
let track;
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

  const hemi = new THREE.HemisphereLight(0xffffff, 0x6a9e39, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(60, 90, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -120;
  sun.shadow.camera.right = 120;
  sun.shadow.camera.top = 120;
  sun.shadow.camera.bottom = -120;
  sun.shadow.camera.far = 250;
  scene.add(sun);

  track = createTrack();
  scene.add(track.group);

  window.addEventListener('resize', onResize);
  onResize();
}

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function loadCarModel(carId) {
  if (gltfCache.has(carId)) {
    return Promise.resolve(gltfCache.get(carId).clone());
  }
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      `assets/models/cars/${carId}.glb`,
      gltf => {
        gltfCache.set(carId, gltf.scene);
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
  showScreen('game');

  if (currentModel) {
    carController.group.parent && carController.group.parent.remove(carController.group);
  }

  const carMeta = getCarById(carId);
  document.getElementById('car-name-badge').textContent = `${carMeta.emoji} ${carMeta.name}`;

  const modelScene = await loadCarModel(carId);
  currentModel = modelScene;
  carController = new CarController(modelScene, carMeta);
  carController.setPosition(track.startPosition, track.startAngle);
  scene.add(carController.group);

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

// ---------- NPC車(コース上を自動走行し、ぶつかると爆発する) ----------
const NPC_DEFS = [
  { id: 'taxi', phase: 0.12 },
  { id: 'van', phase: 0.37 },
  { id: 'suv-luxury', phase: 0.62 },
  { id: 'police', phase: 0.85 },
];
const COLLISION_DIST = 2.4;
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
  for (const def of NPC_DEFS) {
    const meta = getCarById(def.id);
    const modelScene = await loadCarModel(def.id);
    const controller = new CarController(modelScene, meta);
    controller.autoMode = true;
    controller.autoU = def.phase;
    placeOnCurve(controller, def.phase);
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
  const count = 10;
  for (let i = 0; i < count; i++) {
    const geo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const color = Math.random() < 0.5 ? 0xff9800 : 0xffeb3b;
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
    mesh.position.copy(position).add(new THREE.Vector3(0, 0.8, 0));
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 5;
    const vel = new THREE.Vector3(Math.cos(angle) * speed, 5 + Math.random() * 5, Math.sin(angle) * speed);
    scene.add(mesh);
    explosionParticles.push({ mesh, vel, life: 0, maxLife: 0.7 + Math.random() * 0.3 });
  }
}

function updateExplosionParticles(dt) {
  for (let i = explosionParticles.length - 1; i >= 0; i--) {
    const p = explosionParticles[i];
    p.life += dt;
    p.vel.y -= 20 * dt;
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
  const away = npc.controller.group.position.clone().sub(carController.group.position);
  away.y = 0;
  if (away.lengthSq() < 0.0001) away.set(Math.random() - 0.5, 0, Math.random() - 0.5);
  away.normalize();
  npc.velocity.copy(away).multiplyScalar(9).add(new THREE.Vector3(0, 11, 0));
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
        if (dist < COLLISION_DIST) explodeNpc(npc);
      }
    } else {
      npc.timer += dt;
      npc.velocity.y -= 26 * dt;
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

// ---------- カメラ追従 ----------
const camOffset = new THREE.Vector3();
const camTarget = new THREE.Vector3();
const lookTarget = new THREE.Vector3();

function updateCamera(dt) {
  if (!carController) return;
  const forward = carController.forwardVector();
  const carPos = carController.group.position;

  camOffset.copy(forward).multiplyScalar(-9).add(new THREE.Vector3(0, 4.5, 0));
  camTarget.copy(carPos).add(camOffset);
  camera.position.lerp(camTarget, Math.min(1, dt * 4));

  lookTarget.copy(carPos).add(new THREE.Vector3(0, 1.2, 0)).addScaledVector(forward, 3);
  camera.lookAt(lookTarget);
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
    updateCamera(dt);
    updateEngineSound(carController.speed / 26);
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
  buildCarGrid();
  const bar = document.getElementById('loading-bar');
  await preloadPreviews(ratio => { bar.style.width = `${Math.round(ratio * 100)}%`; });
  showScreen('select');
}

boot();
