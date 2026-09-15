// 車種データ: Kenney "Cube Pets" (CC0) のモデルを使用。
// 車ではなく動物だが、CarControllerの仕組み(前進ベクトルに沿って移動するだけ)は
// 見た目を問わないため、車と同じ扱いで「のりもの」として選べる/NPCとして走らせられる。
export const PETS = [
  { id: "pet-dog",      name: "いぬ",     emoji: "🐶", speed: 1.05, turn: 1.1, folder: "pets" },
  { id: "pet-cat",      name: "ねこ",     emoji: "🐱", speed: 1.1,  turn: 1.15, folder: "pets" },
  { id: "pet-fox",      name: "きつね",   emoji: "🦊", speed: 1.15, turn: 1.1, folder: "pets" },
  { id: "pet-bunny",    name: "うさぎ",   emoji: "🐰", speed: 1.25, turn: 1.2, folder: "pets" },
  { id: "pet-panda",    name: "パンダ",   emoji: "🐼", speed: 0.85, turn: 0.85, folder: "pets" },
  { id: "pet-tiger",    name: "とら",     emoji: "🐯", speed: 1.1,  turn: 0.95, folder: "pets" },
  { id: "pet-lion",     name: "らいおん", emoji: "🦁", speed: 1.05, turn: 0.9, folder: "pets" },
  { id: "pet-elephant", name: "ぞう",     emoji: "🐘", speed: 0.7,  turn: 0.7, folder: "pets" },
];

export function getPetById(id) {
  return PETS.find(p => p.id === id) || PETS[0];
}
