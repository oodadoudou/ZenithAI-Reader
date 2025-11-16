const CACHE_NAME = 'paperread-shell-v2';
const AUDIO_CACHE_OFFLINE = 'paperread-audio-offline';
const AUDIO_CACHE_ONLINE = 'paperread-audio-online';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/reading.html',
  '/config.json',
  '/manifest.json',
  '/css/main.css',
  '/js/library-page.js',
  '/js/reader-page.js',
  '/js/tts.js',
];

let audioCacheLimitBytes = 200 * 1024 * 1024;
let runtimeConfig = { OFFLINE_TTS_URL: '', ONLINE_TTS_BASE_URL: '' };

self.addEventListener('install', (event) => {
  event.waitUntil(Promise.all([primeConfig(), cacheShell()]).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  const allowedCaches = new Set([CACHE_NAME, AUDIO_CACHE_OFFLINE, AUDIO_CACHE_ONLINE]);
  event.waitUntil(
      caches
          .keys()
          .then((keys) => Promise.all(keys.filter((key) => !allowedCaches.has(key)).map((key) => caches.delete(key))))
          .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (isOfflineMediaRequest(url)) {
    event.respondWith(cacheAudio(request, AUDIO_CACHE_OFFLINE));
    return;
  }
  if (isOnlineMediaRequest(url)) {
    event.respondWith(cacheAudio(request, AUDIO_CACHE_ONLINE));
    return;
  }
  if (shouldServeFromShell(url)) {
    event.respondWith(caches.match(request).then((match) => match || fetch(request)));
  }
});

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};
  if (type === 'DELETE_AUDIO') {
    event.waitUntil(deleteAudioEntries(payload));
  }
});

async function cacheShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(SHELL_ASSETS);
}

async function primeConfig() {
  try {
    const res = await fetch('/config.json', { cache: 'no-cache' });
    if (res.ok) {
      const data = await res.json();
      runtimeConfig = { ...runtimeConfig, ...data };
      if (data.AUDIO_CACHE_LIMIT_MB) {
        audioCacheLimitBytes = data.AUDIO_CACHE_LIMIT_MB * 1024 * 1024;
      }
    }
  } catch (err) {
    // swallow network errors; defaults stand.
  }
}

function shouldServeFromShell(url) {
  return SHELL_ASSETS.includes(url.pathname) || (url.pathname === '/' && SHELL_ASSETS.includes('/'));
}

function isOfflineMediaRequest(url) {
  return url.pathname.startsWith('/media/');
}

function isOnlineMediaRequest(url) {
  if (!runtimeConfig.ONLINE_TTS_BASE_URL) return false;
  return url.href.startsWith(runtimeConfig.ONLINE_TTS_BASE_URL);
}

async function cacheAudio(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request, { credentials: 'omit' });
  cache.put(request, response.clone());
  await trimAudioCache(cache);
  return response;
}

async function trimAudioCache(cache) {
  const entries = await cache.keys();
  let total = 0;
  const sizes = await Promise.all(
      entries.map(async (request) => {
        const response = await cache.match(request);
        const blob = response ? await response.clone().blob() : null;
        const size = blob?.size || 0;
        total += size;
        return { request, size };
      })
  );
  if (total <= audioCacheLimitBytes) return;
  sizes.sort((a, b) => a.size - b.size);
  while (total > audioCacheLimitBytes && sizes.length) {
    const { request, size } = sizes.shift();
    await cache.delete(request);
    total -= size;
  }
}

async function deleteAudioEntries(payload = {}) {
  const offline = Array.isArray(payload.offline) ? payload.offline : [];
  const online = Array.isArray(payload.online) ? payload.online : [];
  const offlineCache = await caches.open(AUDIO_CACHE_OFFLINE);
  await Promise.all(offline.map((url) => offlineCache.delete(url)));
  const onlineCache = await caches.open(AUDIO_CACHE_ONLINE);
  await Promise.all(online.map((url) => onlineCache.delete(url)));
}
