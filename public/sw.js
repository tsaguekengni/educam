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
 *  - PRECACHES the app shell and its hashed JS/CSS at install time, so offline
 *    works from the FIRST launch rather than the second. See the install
 *    handler for why this is not optional.
 *
 * Versioning: bump SHELL_CACHE on any change to the shell handling. `activate`
 * deletes any educam-* cache no longer listed in CURRENT_CACHES and takes
 * control immediately, so a new deploy never gets stuck behind a stale worker.
 */
// Cache names are versioned INDEPENDENTLY, on purpose.
//
// Bumping the shell forces a clean rebuild of the app code. The image cache is
// deliberately NOT bumped with it: lesson images are expensive to re-download
// on a weak line, and IndexedDB still lists those lessons as "downloaded" — so
// silently dropping the images would leave a teacher with a lesson that claims
// to be available offline and renders blank.
const SHELL_CACHE = "educam-v3-shell";
const IMG_CACHE = "educam-v2-img";
const CURRENT_CACHES = [SHELL_CACHE, IMG_CACHE];

// The app shell. Kept as a constant so the fallback below and the precache
// below agree on exactly one URL (the manifest's start_url is "/", scope "/").
const SHELL_URL = "/";

/**
 * ⚠️ PRECACHE AT INSTALL — do not remove this.
 *
 * Without it, offline only ever worked from the SECOND launch onward, and that
 * was never noticed because testing always reloaded at least once.
 *
 * Why: on a first visit the browser fetches the document BEFORE this worker is
 * installed and controlling. Nothing passes through `fetch` below, so nothing
 * is cached. A teacher who installs the app, logs in, and closes it has an
 * EMPTY cache — and reopening it offline shows the browser's own "cannot
 * connect" error page, because there is no shell to fall back to.
 * (Verified on the live site, 2026-09-13: first visit → 0 caches; second
 * visit → shell cached.)
 *
 * Caching the HTML alone is not enough either: a shell whose JavaScript is
 * missing cannot boot. So we read the shell we just fetched, pull out the
 * hashed `/_next/static/*` files it references, and cache those too. Reading
 * them out of the HTML keeps this self-maintaining — no build step, and no
 * hand-written list of filenames to fall out of date.
 */
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(SHELL_CACHE);
      const res = await fetch(SHELL_URL, { cache: "reload" });
      if (res && res.ok) {
        await cache.put(SHELL_URL, res.clone());
        const html = await res.text();
        const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) || [])];
        await Promise.all(assets.map(async (url) => {
          try {
            const r = await fetch(url, { cache: "reload" });
            if (r && r.ok) await cache.put(url, r.clone());
          } catch (_) { /* one missing asset must not fail the install */ }
        }));
      }
    } catch (_) {
      // Precaching is best-effort: a failure here must NEVER block activation,
      // or a bad network on first run would leave the app with no worker at all.
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith("educam-") && !CURRENT_CACHES.includes(k))
        .map((k) => caches.delete(k))
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
    return (await cache.match(req)) || (await cache.match(SHELL_URL)) || Response.error();
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
