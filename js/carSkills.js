// 車種ごとの「とくぎ」定義。まずは代表的な数車種のみに実装し、
// 動作を確認してから他の車種にも広げる想定。
//
// kind: 'siren'   -> 発動した瞬間、周囲のNPCをまとめて吹き飛ばす(パトカーのサイレン)
// kind: 'boost'   -> 一定時間、自車の最高速度・加速を強化する
// kind: 'agility' -> 一定時間、自車の最高速度と旋回性能を強化する(緊急走行)
export const CAR_SKILLS = {
  police: { icon: '🚨', name: 'サイレン', kind: 'siren', duration: 1.6, radiusMul: 3.5 },
  race: { icon: '🔥', name: 'ブースト', kind: 'boost', duration: 3.0, speedMul: 1.6 },
  'race-future': { icon: '🚀', name: 'ハイパーブースト', kind: 'boost', duration: 2.5, speedMul: 1.8 },
  ambulance: { icon: '🚑', name: 'きゅうこう走行', kind: 'agility', duration: 3.0, speedMul: 1.25, turnMul: 1.8 },
};

export function getCarSkill(carId) {
  return CAR_SKILLS[carId] || null;
}
