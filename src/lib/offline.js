// EduCam offline layer. Every export is a no-op / passthrough when
// OFFLINE_ENABLED is false, so nothing here changes behaviour during testing.
import { OFFLINE_ENABLED, OFFLINE_UNLOCK_DAYS } from "./flags";
import { supabase } from "./supabase";

// ---------- IndexedDB (lesson bundles + small key/value cache) ----------
const DB_NAME = "educam-offline";
// v1 → v2 (2026-09-13): adds the `outbox` store — the queue of writes made
// while offline. Upgrades are additive and guarded by `contains()`, so an
// existing database keeps its lessons and kv contents untouched.
const DB_VERSION = 2;

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no-idb"));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("lessons")) db.createObjectStore("lessons");
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      // The outbox carries its own id, so the key lives inside the record.
      if (!db.objectStoreNames.contains("outbox")) {
        db.createObjectStore("outbox", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(store, key, val) {
  try {
    const db = await openDB();
    await new Promise((res, rej) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(val, key);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    return true;
  } catch (_) { return false; }
}

async function idbGet(store, key) {
  try {
    const db = await openDB();
    return await new Promise((res) => {
      const tx = db.transaction(store, "readonly");
      const r = tx.objectStore(store).get(key);
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(undefined);
    });
  } catch (_) { return undefined; }
}

// Keyed stores (outbox): the record carries its own key via keyPath.
async function idbPut(store, val) {
  try {
    const db = await openDB();
    await new Promise((res, rej) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(val);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    return true;
  } catch (_) { return false; }
}

async function idbAll(store) {
  try {
    const db = await openDB();
    return await new Promise((res) => {
      const tx = db.transaction(store, "readonly");
      const r = tx.objectStore(store).getAll();
      r.onsuccess = () => res(r.result || []);
      r.onerror = () => res([]);
    });
  } catch (_) { return []; }
}

async function idbDel(store, key) {
  try {
    const db = await openDB();
    await new Promise((res, rej) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    return true;
  } catch (_) { return false; }
}

// ---------- The outbox: writes made while offline ----------
//
// Everything a teacher does offline lands here first and is replayed against
// Supabase when the network comes back. This is what makes "you can work
// without a signal" true rather than a slogan.
//
// Two properties make replay safe, both verified against the live schema:
//   · `daily_results` is UNIQUE (student_id, lesson_id, result_date)
//   · `lessons_taught` is UNIQUE (teacher_id, lesson_id)
// so an upsert replayed twice produces the same row — never a duplicate.
//
// ⚠️ Every entry carries `clientTs`, the REAL moment of the action, and the
// payload writes that time explicitly. Without it a lesson taught on Monday
// and synced on Thursday would be recorded as Thursday, which would silently
// corrupt the activity log and mis-fire the anti-gaming checks.

function newId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch (_) {}
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Add one write to the outbox. Returns the stored entry. */
export async function enqueue(entry) {
  const row = {
    id: newId(),
    createdAt: Date.now(),
    clientTs: new Date().toISOString(),
    attempts: 0,
    lastError: null,
    ...entry,
  };
  await idbPut("outbox", row);
  // Let any screen showing a "N en attente" counter update immediately —
  // results entry lives in a different component from the offline banner.
  try {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("educam:queued"));
  } catch (_) {}
  return row;
}

/** Everything waiting, oldest first — the order the teacher did it in. */
export async function listQueue() {
  const all = await idbAll("outbox");
  return all.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

/** Remove one entry (after it has been accepted by the server). */
export function dequeue(id) { return idbDel("outbox", id); }

/** How many writes are still waiting — drives the "N en attente" indicator. */
export async function queueCount() { return (await idbAll("outbox")).length; }

/** Record a failed attempt so a poison entry cannot block the queue forever. */
export async function markAttempt(entry, message) {
  const next = { ...entry, attempts: (entry.attempts || 0) + 1, lastError: String(message || "") };
  await idbPut("outbox", next);
  return next;
}

// ---------- Is the app itself ready to open offline? ----------
//
// ⚠️ Must match SHELL_CACHE in public/sw.js. If you bump it there, bump it here.
const SHELL_CACHE_NAME = "educam-v3-shell";

/**
 * True only when the service worker has actually precached the app shell.
 *
 * This exists because "Hors ligne prêt" used to be based ONLY on how many
 * lessons were downloaded — so it could announce "ready" while the app was
 * still incapable of opening without a network, which is the worst possible
 * moment to inspire confidence. (Cost a failed test on 2026-09-13; would cost
 * a teacher her first lesson in October.)
 */
export async function isShellCached() {
  try {
    if (typeof caches === "undefined") return false;
    if (!(await caches.has(SHELL_CACHE_NAME))) return false;
    const cache = await caches.open(SHELL_CACHE_NAME);
    return !!(await cache.match("/"));
  } catch (_) { return false; }
}

// ---------- Cache-aside for list queries (timetable / topics / lessons) ----------
// fetcher must return a Supabase query (thenable → {data, error}).
export async function cachedQuery(key, fetcher) {
  if (!OFFLINE_ENABLED) {
    const { data } = await fetcher();
    return data;
  }
  try {
    const { data, error } = await fetcher();
    if (error) throw error;
    if (data) await idbSet("kv", key, data);
    return data;
  } catch (_) {
    return await idbGet("kv", key);
  }
}

// ---------- Lesson content bundle (the cacheable part of a lesson) ----------
// Content only — teacher-specific readiness/feedback stay online.
export async function fetchLessonBundle(lessonId) {
  const { data: lesson, error } = await supabase.from("lessons").select("*").eq("id", lessonId).single();
  if (error) throw error;
  const { data: sections } = await supabase.from("lesson_sections").select("*").eq("lesson_id", lessonId).order("section_order");
  const { data: exercises } = await supabase.from("exercises").select("*").eq("lesson_id", lessonId).order("exercise_order");
  const sectionIds = (sections || []).map((s) => s.id);
  const blocksBySection = {};
  let blocks = [];
  if (sectionIds.length > 0) {
    const r = await supabase.from("section_blocks").select("*").in("section_id", sectionIds).order("block_order");
    blocks = r.data || [];
    blocks.forEach((b) => {
      if (!blocksBySection[b.section_id]) blocksBySection[b.section_id] = [];
      blocksBySection[b.section_id].push(b);
    });
  }
  return { lesson, sections: sections || [], exercises: exercises || [], blocksBySection, blocks };
}

export function saveLessonBundle(id, bundle) { return idbSet("lessons", id, bundle); }
export function loadLessonBundle(id) { return idbGet("lessons", id); }

// ---------- Which lessons are downloaded (for the "hors ligne" badge) ----------
export async function getCachedLessonIds() {
  if (!OFFLINE_ENABLED) return [];
  return (await idbGet("kv", "cachedLessonIds")) || [];
}

// A content signature so re-download can skip lessons that haven't changed.
// (There's no updated_at on lessons, so we compare the actual content.)
function bundleSignature(b) {
  try {
    return JSON.stringify({
      t: b.lesson && [b.lesson.title, b.lesson.objective, b.lesson.duration, b.lesson.theme],
      s: (b.sections || []).map((x) => [x.section_type, x.title, x.icon, x.section_order]),
      b: (b.blocks || []).map((x) => [x.block_type, x.text_content, x.media_url, x.caption, x.block_order]),
      e: (b.exercises || []).map((x) => [x.question, x.answer, x.options, x.exercise_type, x.exercise_order]),
    });
  } catch (_) { return String(Date.now()); }
}

// ---------- Download this week's lessons (videos excluded) ----------
// "Refresh only what changed": fetch the (small) lesson JSON, compare its
// signature to what's cached; only NEW or CHANGED lessons re-download images.
export async function downloadWeek(lessonIds, onProgress) {
  let done = 0, fresh = 0, updated = 0, uptodate = 0, failed = 0;
  const cached = [];
  for (const id of lessonIds) {
    try {
      const bundle = await fetchLessonBundle(id);
      const prev = await loadLessonBundle(id);
      const changed = !prev || bundleSignature(prev) !== bundleSignature(bundle);
      if (changed) {
        await saveLessonBundle(id, bundle);
        // (Re)download images for new/changed lessons; skip video media.
        for (const b of bundle.blocks) {
          if (b.block_type === "image" && b.media_url) {
            try { await fetch(b.media_url, { mode: "no-cors", cache: "reload" }); } catch (_) {}
          }
        }
        if (prev) updated++; else fresh++;
      } else {
        uptodate++; // unchanged → no image re-download, no data spent
      }
      cached.push(id);
    } catch (_) { failed++; }
    done++;
    if (onProgress) onProgress(done, lessonIds.length);
  }
  const prevIds = (await idbGet("kv", "cachedLessonIds")) || [];
  const merged = Array.from(new Set(prevIds.concat(cached)));
  await idbSet("kv", "cachedLessonIds", merged);
  return { total: lessonIds.length, fresh, updated, uptodate, failed };
}

// ---------- Durable storage + a ceiling on boot-path network calls ----------

// Two budgets, because giving up costs something different in each case.
//
// SHORT — used when a valid grant has ALREADY put the teacher on the dashboard.
// Nothing on screen is waiting, so we only want to stop dangling. Cheap to hit.
export const BOOT_NETWORK_TIMEOUT_MS = 2500;
//
// LONG — used when there is NO grant and the user is still looking at the
// loading screen. Here, giving up means showing a LOGIN FORM to someone who may
// well be validly signed in — so we must be far more patient than above. This
// is deliberately generous: a slow connection is not a reason to log someone
// out, and without a grant they cannot work offline anyway.
export const SESSION_RESTORE_TIMEOUT_MS = 8000;

/**
 * Ask the system to treat our storage as durable.
 *
 * By default a browser may EVICT a site's IndexedDB and localStorage when the
 * disk fills up. Today that would cost the cached lessons — irritating. Once
 * the write queue exists it would cost a teacher's whole day of unsent results.
 * An installed desktop app is usually granted persistence automatically;
 * asking explicitly is the difference between "usually" and "yes".
 *
 * Fire-and-forget: never throws, never blocks, safe to call on every boot.
 */
export async function requestPersistentStorage() {
  try {
    if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch (_) { return false; }
}

/**
 * Race a promise against a short timer.
 *
 * ⚠️ This exists because `navigator.onLine` LIES. It reports only that a
 * network interface is up — NOT that the internet is reachable. A school
 * router that is powered on with a dead uplink answers "online", and requests
 * made in that state do not fail fast: they HANG. Any such call left on the
 * path to the first paint freezes the app on its loading screen.
 *
 * So every boot-time network call is time-boxed. Rejecting here does not
 * cancel the underlying request — it just means we stop waiting for it.
 */
export function withTimeout(promise, ms = BOOT_NETWORK_TIMEOUT_MS) {
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

// ---------- 7-day offline unlock (localStorage) ----------
//
// NOTE ON THE 7 DAYS (décision Maxime, 2026-09-13): this is a SAFETY NET, not
// the normal mode of operation. The referent tethers the teacher's machine to
// their phone at the end of each day, so data goes up daily — and because
// `setGrant` is called again on every ONLINE boot, that daily sync silently
// recharges the grant to a full 7 days. The countdown only ever starts during
// a real outage.
const GRANT_KEY = "educam_offline_grant";

export function setGrant(teacher) {
  if (!OFFLINE_ENABLED || typeof localStorage === "undefined" || !teacher) return;
  const until = Date.now() + OFFLINE_UNLOCK_DAYS * 86400000;
  try { localStorage.setItem(GRANT_KEY, JSON.stringify({ teacher, until })); } catch (_) {}
}

export function getGrant() {
  if (!OFFLINE_ENABLED || typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(GRANT_KEY);
    if (!raw) return null;
    const g = JSON.parse(raw);
    if (!g || !g.until || g.until < Date.now()) return null;
    return g;
  } catch (_) { return null; }
}

export function clearGrant() {
  if (typeof localStorage === "undefined") return;
  try { localStorage.removeItem(GRANT_KEY); } catch (_) {}
}
