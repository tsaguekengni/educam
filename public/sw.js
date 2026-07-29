/* EduCam service worker (v1).
 * Only ever registered when NEXT_PUBLIC_OFFLINE_ENABLED=true (see sw-register.js),
 * so it is completely inert during current testing.
 *
 * What it does:
 *  - Caches the app shell (Next static assets + visited pages) so the app opens
 *    with no connection — stale-while-revalidate, same origin only.
 *  - Runtime-caches lesson images from the public Supabase `lesson-images` bucket
 *    (cache-first) so already-seen images survive an outage.
 *  - Leaves Supabase data (lessons/timetable/auth) to the app's IndexedDB layer —
 *    the SW does NOT intercept those API calls.
 *
 * Versioning: bump CACHE_VERSION on any SW change. `activate` deletes old caches
 * and takes control immediately, so a new Vercel deploy never gets stuck behind
 * a stale worker.
 */
const CACHE_VERSION = "educam-v1";
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

  // Same-origin app shell (document, Next chunks, css, fonts) → stale-while-revalidate.
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(req, SHELL_CACHE));
  }
});

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
