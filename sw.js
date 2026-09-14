// キャッシュを更新する際はこのバージョン文字列を必ずインクリメントすること
const VERSION = 'v12';
const CACHE_NAME = `kids-drive-pwa-${VERSION}`;

const CAR_IDS = [
  'race', 'race-future', 'sedan-sports', 'hatchback-sports', 'sedan',
  'suv', 'suv-luxury', 'taxi', 'police', 'tractor-police',
  'ambulance', 'firetruck', 'van', 'delivery', 'delivery-flat',
  'truck', 'truck-flat', 'garbage-truck', 'tractor', 'tractor-shovel',
  'kart-oobi', 'kart-oodi', 'kart-ooli', 'kart-oopi', 'kart-oozi',
];

const TOY_CAR_IDS = [
  'vehicle-drag-racer', 'vehicle-monster-truck', 'vehicle-racer-low', 'vehicle-racer',
  'vehicle-speedster', 'vehicle-suv', 'vehicle-truck', 'vehicle-vintage-racer',
];

const ROAD_TILE_IDS = ['road-straight', 'road-curve-pavement'];

const BUILDING_IDS = [
  'building-a', 'building-b', 'building-c', 'building-d', 'building-e', 'building-f',
  'building-h', 'building-k',
];

const CORE_ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'css/style.css',
  'js/main.js',
  'js/cars.js',
  'js/toyCars.js',
  'js/stages.js',
  'js/track.js',
  'js/cityTrack.js',
  'js/carController.js',
  'lib/three/build/three.module.js',
  'lib/three/examples/jsm/loaders/GLTFLoader.js',
  'lib/three/examples/jsm/utils/BufferGeometryUtils.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-192-maskable.png',
  'icons/icon-512-maskable.png',
  'assets/models/decor/cone.glb',
  'assets/models/cars/Textures/colormap.png',
  'assets/models/decor/Textures/colormap.png',
  'assets/models/toycars/Textures/colormap.png',
  'assets/models/roadtiles/Textures/colormap.png',
  'assets/models/buildings/Textures/colormap.png',
  ...CAR_IDS.map(id => `assets/models/cars/${id}.glb`),
  ...CAR_IDS.map(id => `assets/previews/${id}.png`),
  ...TOY_CAR_IDS.map(id => `assets/models/toycars/${id}.glb`),
  ...TOY_CAR_IDS.map(id => `assets/previews/toycars/${id}.png`),
  ...ROAD_TILE_IDS.map(id => `assets/models/roadtiles/${id}.glb`),
  ...BUILDING_IDS.map(id => `assets/models/buildings/${id}.glb`),
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
        return res;
      }).catch(() => cached);
    })
  );
});
