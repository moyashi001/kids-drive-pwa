// 車種データ: Kenney "Car Kit" (CC0) のモデルを使用
// scale / speedFactor は見た目とプレイ感を車種ごとに少し変えるための調整値
export const CARS = [
  { id: "race",            name: "レーシングカー",   emoji: "🏎️", speed: 1.25, turn: 1.05 },
  { id: "race-future",     name: "未来のレースカー", emoji: "🚀", speed: 1.3,  turn: 1.1 },
  { id: "sedan-sports",    name: "スポーツセダン",   emoji: "🚗", speed: 1.15, turn: 1.0 },
  { id: "hatchback-sports",name: "スポーツカー",     emoji: "🚙", speed: 1.15, turn: 1.05 },
  { id: "sedan",           name: "セダン",           emoji: "🚘", speed: 1.0,  turn: 1.0 },
  { id: "suv",             name: "SUV",              emoji: "🚙", speed: 0.95, turn: 0.95 },
  { id: "suv-luxury",      name: "高級SUV",          emoji: "🚙", speed: 0.95, turn: 0.95 },
  { id: "taxi",            name: "タクシー",         emoji: "🚕", speed: 1.0,  turn: 1.0 },
  { id: "police",          name: "パトカー",         emoji: "🚓", speed: 1.1,  turn: 1.0 },
  { id: "tractor-police",  name: "パトロールカー",   emoji: "🚨", speed: 1.0,  turn: 0.95 },
  { id: "ambulance",       name: "救急車",           emoji: "🚑", speed: 1.0,  turn: 0.9 },
  { id: "firetruck",       name: "消防車",           emoji: "🚒", speed: 0.9,  turn: 0.85 },
  { id: "van",             name: "バン",             emoji: "🚐", speed: 0.95, turn: 0.9 },
  { id: "delivery",        name: "配達トラック",     emoji: "🚚", speed: 0.9,  turn: 0.85 },
  { id: "delivery-flat",   name: "配達バン",         emoji: "🚚", speed: 0.9,  turn: 0.85 },
  { id: "truck",           name: "トラック",         emoji: "🚛", speed: 0.85, turn: 0.8 },
  { id: "truck-flat",      name: "大型トラック",     emoji: "🚛", speed: 0.85, turn: 0.8 },
  { id: "garbage-truck",   name: "ごみ収集車",       emoji: "🗑️", speed: 0.8,  turn: 0.8 },
  { id: "tractor",         name: "トラクター",       emoji: "🚜", speed: 0.75, turn: 0.75 },
  { id: "tractor-shovel",  name: "ショベルカー",     emoji: "🚜", speed: 0.7,  turn: 0.7 },
  { id: "kart-oobi",       name: "ゴーカート(あお)", emoji: "🏁", speed: 1.2,  turn: 1.15 },
  { id: "kart-oodi",       name: "ゴーカート(みどり)", emoji: "🏁", speed: 1.2,  turn: 1.15 },
  { id: "kart-ooli",       name: "ゴーカート(きいろ)", emoji: "🏁", speed: 1.2,  turn: 1.15 },
  { id: "kart-oopi",       name: "ゴーカート(あか)", emoji: "🏁", speed: 1.2,  turn: 1.15 },
  { id: "kart-oozi",       name: "ゴーカート(オレンジ)", emoji: "🏁", speed: 1.2, turn: 1.15 },
];

export function getCarById(id) {
  return CARS.find(c => c.id === id) || CARS[0];
}
