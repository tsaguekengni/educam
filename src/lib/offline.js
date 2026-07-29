// EduCam offline layer. Every export is a no-op / passthrough when
// OFFLINE_ENABLED is false, so nothing here changes behaviour during testing.
import { OFFLINE_ENABLED, OFFLINE_UNLOCK_DAYS } from "./flags";
import { supabase } from "./supabase";

// ---------- IndexedDB (lesson bundles + small key/value cache) ----------
const DB_NAME = "educam-offline";
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no-idb"));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("lessons")) db.createObjectStore("lessons");
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
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

// ---------- 7-day offline unlock (localStorage) ----------
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
