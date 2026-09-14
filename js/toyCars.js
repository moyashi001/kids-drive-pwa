// 車種データ: Kenney "Toy Car Kit" (CC0) のモデルを使用。
// city-kit-roads(タイル道路)のスケールに合わせて作られた小さめの車で、
// タイルベースのステージ(まちなか/こうじょう)で使用する。
export const TOY_CARS = [
  { id: "vehicle-racer",         name: "レーサー",           emoji: "🏎️", speed: 1.2,  turn: 1.05 },
  { id: "vehicle-racer-low",     name: "ローレーサー",       emoji: "🏁", speed: 1.25, turn: 1.1 },
  { id: "vehicle-drag-racer",    name: "ドラッグレーサー",   emoji: "🚀", speed: 1.3,  turn: 0.9 },
  { id: "vehicle-speedster",     name: "スピードスター",     emoji: "🚗", speed: 1.15, turn: 1.1 },
  { id: "vehicle-vintage-racer", name: "クラシックカー",     emoji: "🚙", speed: 1.0,  turn: 1.0 },
  { id: "vehicle-suv",           name: "トイSUV",           emoji: "🚙", speed: 0.95, turn: 0.95 },
  { id: "vehicle-truck",         name: "トイトラック",       emoji: "🚚", speed: 0.85, turn: 0.8 },
  { id: "vehicle-monster-truck", name: "モンスタートラック", emoji: "🚜", speed: 0.9,  turn: 0.85 },
];

export function getToyCarById(id) {
  return TOY_CARS.find(c => c.id === id) || TOY_CARS[0];
}
