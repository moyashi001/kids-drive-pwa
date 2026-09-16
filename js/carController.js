import * as THREE from '../lib/three/build/three.module.js';
import { roadOffsetRatio, clampToTrackBounds, sampleTrackHeight } from './track.js';

// Kenney車モデルの正面方向を我々の前進定義(forward = (sin(h),0,cos(h)))に合わせるための補正角。
// Kenney "Car Kit"はモデルの前面が元々+Z方向を向いており0でよいが、
// "Toy Car Kit"はホイールのメッシュ名(wheel-fr/fl が front)のz座標を調べると
// 前輪が-Z側にある(Car Kitとは前後の設計規則が逆)ため、180度补正が必要。
// メッシュ名に"front"が含まれるホイールのzが正なら0、負ならPIを自動判定する。
function detectForwardOffset(gltfScene) {
  let frontZ = null;
  gltfScene.traverse(obj => {
    if (frontZ !== null) return;
    const n = (obj.name || '').toLowerCase();
    if (n.includes('front') || /wheel.*-f[rl]$/.test(n)) frontZ = obj.position.z;
  });
  return frontZ !== null && frontZ < 0 ? Math.PI : 0;
}

const MAX_SPEED = 18;          // units/秒(子供が操作しやすいよう抑えめにしている)
const MAX_REVERSE_SPEED = 7;
const ACCEL = 15;
const BRAKE_DECEL = 34;
const FRICTION = 10;
const TURN_RATE = 2.4;         // rad/秒 (最大)
const OFFROAD_DRAG = 0.45;
const SLOPE_SPEED_FACTOR = 5; // 坂の勾配ぶん、下りは加速・上りは減速させる強さ
const MAX_PITCH = 0.4;         // 車体の傾き(ラジアン)の上限
const GRAVITY_BASE = 30;       // ジャンプ台で飛んだ後の落下加速度(worldScale倍する)
const JUMP_FORCE_BASE = 13;    // ジャンプ台の初速(worldScale倍する)
const SPEED_PAD_MULTIPLIER = 1.35; // スピードパッド踏んでいる間の速度倍率

export class CarController {
  // worldScale: ステージ(コース)のスケールに合わせて速度感を調整する係数。
  // 草原ステージ(道幅11ユニット)を基準の1とし、タイル街コース(TILE_SCALE=6の
  // 小さめの街ブロック)ではコース全体が小さいぶん値を下げて使う。
  constructor(gltfScene, carMeta, worldScale = 1) {
    this.meta = carMeta;
    this.worldScale = worldScale;
    this.group = new THREE.Group();
    this.model = gltfScene;
    this.model.rotation.y = detectForwardOffset(gltfScene);

    this.model.traverse(obj => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = false;
      }
    });

    this.group.add(this.model);

    this.heading = 0;      // ラジアン。forward = (sin(h), 0, cos(h))
    this.speed = 0;        // units/秒 (前進が正)
    this.position = new THREE.Vector3();

    // 操作入力 (-1..1)
    this.steerInput = 0;
    this.throttleInput = 0;

    this.autoMode = false;
    this.autoU = 0; // コース上の進行度 (0..1)

    // とくぎ発動中に一時的に強化するための倍率(main.jsのcarSkillsから操作する)
    this.boostMultiplier = 1;
    this.turnBoostMultiplier = 1;

    // ジャンプ台(空中にいる間は坂の高さ追従を止めて自由落下させる)
    this.airborne = false;
    this.velocityY = 0;

    // スピードパッド(踏んでいる間だけ速度アップ)
    this.padBoostTimer = 0;
  }

  // ジャンプ台に触れた時にmain.jsから呼ぶ
  triggerJump(forceMul = 1) {
    if (this.airborne) return;
    this.airborne = true;
    this.velocityY = JUMP_FORCE_BASE * this.worldScale * forceMul;
  }

  // スピードパッドに触れた時にmain.jsから呼ぶ
  triggerSpeedPad(duration = 1.2) {
    this.padBoostTimer = Math.max(this.padBoostTimer, duration);
  }

  setPosition(vec3, heading) {
    this.position.copy(vec3);
    this.heading = heading;
    this.syncTransform();
  }

  forwardVector() {
    return new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
  }

  syncTransform() {
    this.group.position.copy(this.position);
    this.group.rotation.y = this.heading;
  }

  setAutoMode(enabled, track) {
    if (enabled === this.autoMode) return;
    if (enabled) {
      // 現在位置に一番近いコース上の進行度を探す(粗い探索)
      this.autoU = findNearestU(track, this.position);
    }
    this.autoMode = enabled;
  }

  update(dt, track) {
    if (this.autoMode) {
      this.updateAuto(dt, track);
    } else {
      this.updateManual(dt, track);
    }
    this.syncTransform();
  }

  updateAuto(dt, track) {
    // オートモードは常にコースの中心線をそのままなぞるため、ジャンプ台の
    // 空中物理は使わない。手動モードに切り替えた時に、ジャンプ台を踏んだまま
    // 残った古いairborne状態が残って急に飛び上がらないようにリセットしておく。
    this.airborne = false;
    this.velocityY = 0;
    const AUTO_SPEED = 14 * this.worldScale * (this.meta.speed || 1); // units/秒 (車種係数を反映した巡航速度)
    const length = track.curve.getLength();
    this.autoU = (this.autoU + (AUTO_SPEED * dt) / length + 1) % 1;
    const point = track.curve.getPointAt(this.autoU);
    const tangent = track.curve.getTangentAt(this.autoU);
    const targetHeading = Math.atan2(tangent.x, tangent.z);
    this.heading = smoothAngle(this.heading, targetHeading, 6, dt);
    this.position.copy(point); // curveが3D(坂道つき)なら高さも自動で追従する
    this.speed = AUTO_SPEED;

    const pitch = Math.atan2(tangent.y, Math.hypot(tangent.x, tangent.z));
    this.model.rotation.x = THREE.MathUtils.clamp(-pitch, -MAX_PITCH, MAX_PITCH);
  }

  updateManual(dt, track) {
    if (this.padBoostTimer > 0) this.padBoostTimer -= dt;
    const padMul = this.padBoostTimer > 0 ? SPEED_PAD_MULTIPLIER : 1;
    const totalBoost = this.boostMultiplier * padMul;

    const offRoadRatio = roadOffsetRatio(track, this.position);
    const offRoad = offRoadRatio > 1;
    const dragMul = offRoad ? OFFROAD_DRAG : 1;
    const s = this.worldScale;

    const maxSpeed = MAX_SPEED * s * this.meta.speed * dragMul * totalBoost;
    const maxReverse = MAX_REVERSE_SPEED * s * dragMul;

    if (this.throttleInput > 0.01) {
      this.speed += ACCEL * s * this.meta.speed * dragMul * totalBoost * dt * this.throttleInput;
    } else if (this.throttleInput < -0.01) {
      if (this.speed > 0) {
        this.speed -= BRAKE_DECEL * s * dt * -this.throttleInput;
      } else {
        this.speed -= ACCEL * s * 0.7 * dragMul * dt * -this.throttleInput;
      }
    } else {
      // 自然減速
      const dec = Math.sign(this.speed) * FRICTION * s * dt;
      if (Math.abs(dec) > Math.abs(this.speed)) this.speed = 0;
      else this.speed -= dec;
    }

    this.speed = THREE.MathUtils.clamp(this.speed, -maxReverse, maxSpeed);

    // 速度に応じた旋回 (止まっている時は曲がらない)
    const speedRatio = THREE.MathUtils.clamp(Math.abs(this.speed) / (MAX_SPEED * s * 0.4), 0, 1);
    const turnDir = this.speed >= 0 ? 1 : -1;
    this.heading -= this.steerInput * TURN_RATE * this.meta.turn * this.turnBoostMultiplier * speedRatio * turnDir * dt;

    const forward = this.forwardVector();
    this.position.addScaledVector(forward, this.speed * dt);

    // ガードレールがあるステージでは、外側に出ようとした位置を縁でクランプし、
    // すり抜けられないようにする。ぶつかった時はしっかり減速させ、道路の
    // 真ん中寄りまで押し戻す強めの跳ね返りにして、壁に張り付いたままに
    // ならないようにする。
    const wallHit = clampToTrackBounds(track, this.position);
    if (wallHit) {
      this.speed *= 0.4;
      const fenceR = track.fenceRadius;
      const centerX = this.position.x - wallHit.nx * fenceR;
      const centerZ = this.position.z - wallHit.nz * fenceR;
      const bounceDist = fenceR * 0.45;
      this.position.x = centerX + wallHit.nx * bounceDist;
      this.position.z = centerZ + wallHit.nz * bounceDist;
      const inward = Math.atan2(-wallHit.nx, -wallHit.nz);
      this.heading = smoothAngle(this.heading, inward, 6, dt);
    }

    const { y: targetY, pitch } = sampleTrackHeight(track, this.position);
    if (this.airborne) {
      // ジャンプ台で飛んでいる間は坂の高さ追従を止め、自由落下させる
      this.velocityY -= GRAVITY_BASE * s * dt;
      this.position.y += this.velocityY * dt;
      this.model.rotation.x = THREE.MathUtils.clamp(-this.velocityY * 0.02, -MAX_PITCH * 1.5, MAX_PITCH * 1.5);
      if (this.position.y <= targetY) {
        this.position.y = targetY;
        this.airborne = false;
        this.velocityY = 0;
      }
    } else {
      // 坂道: コース上の高さに追従させ、上りは減速・下りは加速。車体も勾配ぶん傾ける。
      const heightDelta = targetY - this.position.y;
      this.speed -= heightDelta * SLOPE_SPEED_FACTOR * s;
      this.position.y = targetY;
      this.model.rotation.x = THREE.MathUtils.clamp(-pitch, -MAX_PITCH, MAX_PITCH);
    }
  }
}

function shortestAngleDiff(from, to) {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function smoothAngle(current, target, rate, dt) {
  const diff = shortestAngleDiff(current, target);
  const t = Math.min(1, rate * dt);
  return current + diff * t;
}

function findNearestU(track, position) {
  const pts = track.centerPts;
  let bestI = 0;
  let bestDist = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const d = pts[i].distanceToSquared(position);
    if (d < bestDist) { bestDist = d; bestI = i; }
  }
  return bestI / pts.length;
}
