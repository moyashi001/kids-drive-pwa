// 車種ごとの「とくぎ」定義。1台ずつ個別設計はせず、車種の系統ごとに
// おおまかにグループ分けして割り当てている。
//
// kind: 'siren'   -> 発動した瞬間、周囲のNPCをまとめて吹き飛ばす(パトカー/消防車などの緊急車両)
// kind: 'boost'   -> 一定時間、自車の最高速度・加速を強化する(レース系・カート系)
// kind: 'agility' -> 一定時間、自車の最高速度と旋回性能を強化する(乗用車系)
// kind: 'ram'     -> 一定時間ブーストしながら、体当たりした範囲のNPCを吹き飛ばす(トラック・重機系)
const DURATION = 5.0; // すべてのとくぎに共通の効果時間(秒)

export const CAR_SKILLS = {
  // ---- 緊急車両: サイレン(即時に周囲のNPCを吹き飛ばす) ----
  police: { icon: '🚨', name: 'サイレン', kind: 'siren', duration: DURATION, radiusMul: 3.5 },
  'tractor-police': { icon: '🚨', name: 'けいこく', kind: 'siren', duration: DURATION, radiusMul: 3.2 },
  firetruck: { icon: '🚒', name: 'ほうすい', kind: 'siren', duration: DURATION, radiusMul: 3.2 },

  // ---- レース系・カート系: ブースト ----
  race: { icon: '🔥', name: 'ブースト', kind: 'boost', duration: DURATION, speedMul: 1.6 },
  'race-future': { icon: '🚀', name: 'ハイパーブースト', kind: 'boost', duration: DURATION, speedMul: 1.8 },
  'sedan-sports': { icon: '💨', name: 'スポーツダッシュ', kind: 'boost', duration: DURATION, speedMul: 1.45 },
  'hatchback-sports': { icon: '💨', name: 'スポーツダッシュ', kind: 'boost', duration: DURATION, speedMul: 1.45 },
  'kart-oobi': { icon: '🏁', name: 'カートダッシュ', kind: 'boost', duration: DURATION, speedMul: 1.5 },
  'kart-oodi': { icon: '🏁', name: 'カートダッシュ', kind: 'boost', duration: DURATION, speedMul: 1.5 },
  'kart-ooli': { icon: '🏁', name: 'カートダッシュ', kind: 'boost', duration: DURATION, speedMul: 1.5 },
  'kart-oopi': { icon: '🏁', name: 'カートダッシュ', kind: 'boost', duration: DURATION, speedMul: 1.5 },
  'kart-oozi': { icon: '🏁', name: 'カートダッシュ', kind: 'boost', duration: DURATION, speedMul: 1.5 },
  'vehicle-racer': { icon: '🔥', name: 'ブースト', kind: 'boost', duration: DURATION, speedMul: 1.5 },
  'vehicle-racer-low': { icon: '🔥', name: 'ブースト', kind: 'boost', duration: DURATION, speedMul: 1.55 },
  'vehicle-drag-racer': { icon: '🚀', name: 'ダッシュ', kind: 'boost', duration: DURATION, speedMul: 1.7 },
  'vehicle-speedster': { icon: '💨', name: 'スピードアップ', kind: 'boost', duration: DURATION, speedMul: 1.5 },

  // ---- 乗用車系: きゅうこう走行(速度+旋回アップ) ----
  ambulance: { icon: '🚑', name: 'きゅうこう走行', kind: 'agility', duration: DURATION, speedMul: 1.25, turnMul: 1.8 },
  sedan: { icon: '✨', name: 'ドライブモード', kind: 'agility', duration: DURATION, speedMul: 1.2, turnMul: 1.5 },
  suv: { icon: '✨', name: 'ドライブモード', kind: 'agility', duration: DURATION, speedMul: 1.2, turnMul: 1.5 },
  'suv-luxury': { icon: '✨', name: 'ドライブモード', kind: 'agility', duration: DURATION, speedMul: 1.2, turnMul: 1.5 },
  taxi: { icon: '💴', name: 'きゅうこう配車', kind: 'agility', duration: DURATION, speedMul: 1.25, turnMul: 1.6 },
  van: { icon: '✨', name: 'ドライブモード', kind: 'agility', duration: DURATION, speedMul: 1.2, turnMul: 1.5 },
  'vehicle-vintage-racer': { icon: '✨', name: 'ドライブモード', kind: 'agility', duration: DURATION, speedMul: 1.2, turnMul: 1.5 },
  'vehicle-suv': { icon: '✨', name: 'ドライブモード', kind: 'agility', duration: DURATION, speedMul: 1.2, turnMul: 1.5 },

  // ---- トラック・重機系: 体当たり(ブースト+接触したNPCを吹き飛ばす) ----
  delivery: { icon: '💥', name: 'たいあたり', kind: 'ram', duration: DURATION, speedMul: 1.3, radiusMul: 1.8 },
  'delivery-flat': { icon: '💥', name: 'たいあたり', kind: 'ram', duration: DURATION, speedMul: 1.3, radiusMul: 1.8 },
  truck: { icon: '💥', name: 'たいあたり', kind: 'ram', duration: DURATION, speedMul: 1.25, radiusMul: 2.0 },
  'truck-flat': { icon: '💥', name: 'たいあたり', kind: 'ram', duration: DURATION, speedMul: 1.25, radiusMul: 2.0 },
  'garbage-truck': { icon: '💥', name: 'パワフル収集', kind: 'ram', duration: DURATION, speedMul: 1.2, radiusMul: 2.0 },
  tractor: { icon: '💥', name: 'たいあたり', kind: 'ram', duration: DURATION, speedMul: 1.2, radiusMul: 1.8 },
  'tractor-shovel': { icon: '💥', name: 'なぎはらい', kind: 'ram', duration: DURATION, speedMul: 1.2, radiusMul: 2.2 },
  'vehicle-truck': { icon: '💥', name: 'たいあたり', kind: 'ram', duration: DURATION, speedMul: 1.25, radiusMul: 1.8 },
  'vehicle-monster-truck': { icon: '💥', name: 'モンスターアタック', kind: 'ram', duration: DURATION, speedMul: 1.3, radiusMul: 2.2 },

  // ---- ペット: ダッシュ(アイテムボックスでも使えるよう、車と同じくboost系にする) ----
  'pet-dog': { icon: '🐾', name: 'わんこダッシュ', kind: 'boost', duration: DURATION, speedMul: 1.35 },
  'pet-cat': { icon: '🐾', name: 'ねこダッシュ', kind: 'boost', duration: DURATION, speedMul: 1.4 },
  'pet-fox': { icon: '🐾', name: 'きつねダッシュ', kind: 'boost', duration: DURATION, speedMul: 1.4 },
  'pet-bunny': { icon: '🐾', name: 'ぴょんぴょんダッシュ', kind: 'boost', duration: DURATION, speedMul: 1.45 },
  'pet-panda': { icon: '🐾', name: 'パンダダッシュ', kind: 'boost', duration: DURATION, speedMul: 1.2 },
  'pet-tiger': { icon: '🐾', name: 'とらダッシュ', kind: 'boost', duration: DURATION, speedMul: 1.35 },
  'pet-lion': { icon: '🐾', name: 'ライオンダッシュ', kind: 'boost', duration: DURATION, speedMul: 1.3 },
  'pet-elephant': { icon: '🐾', name: 'ぞうダッシュ', kind: 'boost', duration: DURATION, speedMul: 1.15 },
};

export function getCarSkill(carId) {
  return CAR_SKILLS[carId] || null;
}
