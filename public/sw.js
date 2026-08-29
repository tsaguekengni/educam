/* EduCam service worker (v2).
 * Only ever registered in a PRODUCTION build with NEXT_PUBLIC_OFFLINE_ENABLED=true
 * (see sw-register.js), so it is completely inert during `next dev` testing.
 *
 * What it does:
 *  - Serves the HTML document (navigations) NETWORK-FIRST: always fresh when
 *    online, cache fallback when offline. This prevents ever serving a stale
 *    shell that points at chunks from a previous deploy (which would hang the
 *    app or loop reloads).
 *  - Caches Next static assets (chunks/css/fonts) stale-while-revalidate — they
 *    are content-hashed in production, so a cached one is always valid.
 *  - Runtime-caches lesson images from the public Supabase `lesson-images`
 *    bucket (cache-first) so already-seen images survive an outage.
 *  - Leaves Supabase data (lessons/timetable/auth) to the app's IndexedDB layer;
 *    the SW does NOT intercept those API calls.
 *
 * Versioning: bump CACHE_VERSION on any SW change. `activate` deletes old caches
 * and takes control immediately, so a new deploy never gets stuck behind a stale
 * worker.
 */
const CACHE_VERSION = "educam-v2";
const SHELL_CACHE = CACHE_VERSION + "-shell";
const IMG_CACHE = CACHE_VERSION + "-img";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// Let the page tell the worker to activate immediately after an update.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isNavigationRequest(req) {
  return req.mode === "navigate" ||
    (req.method === "GET" && (req.headers.get("accept") || "").includes("text/html"));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // Lesson images (public bucket, cross-origin) → cache-first.
  if (url.pathname.includes("/storage/v1/object/public/lesson-images/")) {
    event.respondWith(cacheFirst(req, IMG_CACHE));
    return;
  }

  // Never touch Supabase API / auth / data — the app handles those via IndexedDB.
  if (url.hostname.endsWith(".supabase.co")) return;

  if (url.origin === self.location.origin) {
    // The HTML document itself → network-first (never serve a stale shell).
    if (isNavigationRequest(req)) {
      event.respondWith(networkFirst(req, SHELL_CACHE));
      return;
    }
    // Hashed static assets (chunks/css/fonts) → stale-while-revalidate.
    event.respondWith(staleWhileRevalidate(req, SHELL_CACHE));
  }
});

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res && res.ok && (res.type === "basic" || res.type === "default")) {
      cache.put(req, res.clone());
    }
    return res;
  } catch (_) {
    return (await cache.match(req)) || (await cache.match("/")) || Response.error();
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    // Cache normal (200) and opaque cross-origin (no-cors <img>) responses.
    if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
    return res;
  } catch (_) {
    return hit || Response.error();
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const network = fetch(req)
    .then((res) => {
      if (res && res.ok && (res.type === "basic" || res.type === "default")) {
        cache.put(req, res.clone());
      }
      return res;
    })
    .catch(() => hit);
  return hit || network;
}
