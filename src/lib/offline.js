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

/**
 * ONE shared connection, and it must never hang.
 *
 * ⚠️ Two hazards were unhandled here, and together they froze the Accueil on a
 * real machine (2026-09-13):
 *
 *  1. `onblocked` — if ANOTHER tab or window still holds this database open at
 *     an older version, the upgrade is blocked and `indexedDB.open` fires
 *     neither success nor error. The promise simply NEVER SETTLES. Every read
 *     built on it waits forever, and the screen sits there looking busy. This
 *     is easy to hit in normal use: the installed app in one window and the
 *     site in a browser tab, one of them on a older build.
 *  2. `onversionchange` — without it, THIS connection is the one blocking
 *     somebody else's upgrade. Closing on request is how a tab stops being the
 *     problem for its neighbour.
 *
 * Plus: every call used to open a brand-new connection and never close it.
 * One cached connection is both lighter and far less likely to block anyone.
 *
 * Anything that fails here falls back to "no cache" rather than hanging — the
 * callers all treat a rejection as "no local copy", which is recoverable.
 */
let dbPromise = null;
const DB_OPEN_TIMEOUT_MS = 4000;

function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { dbPromise = null; return reject(new Error("no-idb")); }

    let settled = false;
    const fail = (err) => {
      if (settled) return;
      settled = true;
      dbPromise = null;      // let the next call try again
      reject(err);
    };

    // Last-resort ceiling: even if the browser never calls any handler, no
    // caller is left waiting indefinitely.
    const guard = setTimeout(() => fail(new Error("idb-open-timeout")), DB_OPEN_TIMEOUT_MS);

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

    // Another window is holding the old version open. Give up quickly instead
    // of waiting on a person to close a tab they do not know is the problem.
    req.onblocked = () => fail(new Error("idb-blocked"));

    req.onsuccess = () => {
      if (settled) { try { req.result.close(); } catch (_) {} return; }
      settled = true;
      clearTimeout(guard);
      const db = req.result;
      // Step aside so another window can upgrade, and forget the connection so
      // the next call opens a fresh one.
      db.onversionchange = () => { try { db.close(); } catch (_) {} dbPromise = null; };
      db.onclose = () => { dbPromise = null; };
      resolve(db);
    };

    req.onerror = () => { clearTimeout(guard); fail(req.error || new Error("idb-error")); };
  });

  return dbPromise;
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

/**
 * A UUID made on the device.
 *
 * Also used for the PRIMARY KEY of a message composed offline: `messages.id` is
 * a uuid with a database default, so the row can be created here and inserted
 * with that same id later. That is what lets the WhatsApp nudge — which has to
 * name the message it refers to — be queued alongside the message itself,
 * before the server has ever seen either.
 */
export function newId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch (_) {}
  // RFC-4122-shaped fallback for older engines.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
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
/**
 * Read a list, and say HOW OLD the answer is.
 *
 * Returns { data, cachedAt, fresh, offline?, failed? }.
 *
 * The old version always tried the network first and only fell back to the
 * cache when the request FAILED. Offline that meant every pane sat waiting for
 * a timeout before showing anything — and any pane not wired through here just
 * spun on "chargement…" forever, which is a lie: it was not loading, it was
 * dead. (Seen on a real machine, 2026-09-13: « Moyenne de classe » and
 * « Élèves à suivre » never resolved.)
 *
 * Now:
 *   · no network  → return the cached copy AT ONCE, no request, no waiting;
 *   · network     → fetch with a hard ceiling, fall back to the cached copy;
 *   · either way  → `cachedAt` lets the screen say « données au 11 sept. ».
 *
 * `fresh: false` means what you are looking at is a previous answer. The caller
 * must show that honestly rather than pretending to still be working.
 */
export async function cachedQueryMeta(key, fetcher, { timeoutMs = 5000 } = {}) {
  if (!OFFLINE_ENABLED) {
    const { data } = await fetcher();
    return { data, cachedAt: Date.now(), fresh: true };
  }

  // Entries written before this change are the bare payload; newer ones are
  // wrapped with their timestamp. Accept both so nothing has to be re-fetched.
  const raw = await idbGet("kv", key);
  const prev = (raw && typeof raw === "object" && !Array.isArray(raw) && "data" in raw && "cachedAt" in raw)
    ? raw
    : { data: raw, cachedAt: null };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { data: prev.data ?? null, cachedAt: prev.cachedAt, fresh: false, offline: true };
  }

  try {
    const { data, error } = await withTimeout(fetcher(), timeoutMs);
    if (error) throw error;
    const at = Date.now();
    if (data) await idbSet("kv", key, { data, cachedAt: at });
    return { data, cachedAt: at, fresh: true };
  } catch (_) {
    return { data: prev.data ?? null, cachedAt: prev.cachedAt, fresh: false, failed: true };
  }
}

/** Same thing when the caller only wants the rows. */
export async function cachedQuery(key, fetcher) {
  const { data } = await cachedQueryMeta(key, fetcher);
  return data;
}

/**
 * « données au 11 sept. · 14 h 20 » — short, and today's data just says the
 * time. Returns null when we have no timestamp, so callers can omit the line.
 */
export function freshnessLabel(ts) {
  if (!ts) return null;
  try {
    const d = new Date(ts);
    const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    if (d.toDateString() === new Date().toDateString()) return time;
    return `${d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · ${time}`;
  } catch (_) { return null; }
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

// ---------- Lesson media kept on the device (videos) ----------
//
// ⚠️ WHY VIDEOS ARE NOT HANDLED LIKE IMAGES — this is the whole point of this
// section, and the reason "just add video to the image loop" does not work.
//
// Images are warmed by `fetch(url, { mode: "no-cors" })`, which lands an
// OPAQUE response in the service worker's image cache. That is fine for <img>:
// the browser will happily paint a response it cannot read.
//
// A <video> element does not fetch a file in one piece. It asks for byte
// RANGES so it can start playing before the end has arrived, and so the
// teacher can scrub. A range request cannot be answered from an opaque cache
// entry, and the Cache API refuses to store a partial (206) response at all.
// So a video "cached" the image way downloads, appears to succeed, and then
// fails to play in the classroom — the worst possible outcome.
//
// So videos take a different route: fetch normally (the bucket is public and
// sends CORS headers), keep the real file in IndexedDB, and hand the player a
// local object URL at render time. Range requests never enter the picture.
//
// A second benefit, worth keeping in mind: files held here are OUT OF REACH of
// the service worker's cache-name versioning. Bumping a cache name in sw.js
// can wipe the image cache; it cannot touch these.
//
// Storage note: these live in the existing `lessons` store under a prefixed
// key, DELIBERATELY, to avoid bumping DB_VERSION. A version bump blocks while
// another window holds the old version open — a hazard that already froze the
// Accueil once (see openDB above). No new store, no upgrade, no hazard.
const MEDIA_PREFIX = "media:";

/**
 * Can we actually download this?
 *
 * Two things must be excluded, and both exist in the live data today:
 *  · authoring placeholders like `[[sp-u2-s1/cycle-eau.mp4]]` — 5 of the 6
 *    video blocks in production are still these, and fetching one throws;
 *  · YouTube/Vimeo links, which are players, not files.
 */
export function isDownloadableMedia(url) {
  if (!url || typeof url !== "string") return false;
  if (!/^https?:\/\//i.test(url)) return false;
  return !/youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com/i.test(url);
}

/** Small index of what is stored, so we can check without reading a whole file. */
async function getMediaIndex() { return (await idbGet("kv", "mediaIndex")) || {}; }

/* ---------------------------------------------------------------------------
   LE REGISTRE DES MÉDIAS (lot 13) — comment on détecte un fichier REMPLACÉ.

   Le défaut : `bundleSignature()` compare l'ADRESSE d'un média, pas son
   contenu. Remplacer `cycle-eau.mp4` par une meilleure version SOUS LE MÊME
   NOM — c'est-à-dire exactement ce qu'est une mise à jour de rentrée — ne
   change donc rien à la signature. Rien n'est retéléchargé. Chaque enseignant
   garde la version de l'an dernier, EN SILENCE, et personne ne s'en aperçoit.

   Le remède ne coûte rien, parce que Supabase tient déjà le registre : chaque
   objet stocké porte sa TAILLE et sa DATE de dernière modification. La vue
   `educam_media_registry` les expose, et une seule lecture (648 objets
   aujourd'hui, ~50 Ko) suffit pour toute la médiathèque.

   Ces deux valeurs entrent ensuite dans la signature. Un fichier remplacé
   change de date — donc de signature — donc il redescend.
   --------------------------------------------------------------------------- */
const MEDIA_BUCKET = "lesson-images";

/** `…/object/public/lesson-images/sv-u3-s1/digestion.mp4` → `sv-u3-s1/digestion.mp4` */
export function mediaPathFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  const m = url.match(new RegExp(`/storage/v1/object/(?:public/)?${MEDIA_BUCKET}/(.+)$`));
  if (!m) return null;
  const raw = m[1].split("?")[0];
  try { return decodeURIComponent(raw); } catch (_) { return raw; }
}

/**
 * Taille + date de chaque média du compartiment, indexées PAR URL.
 *
 * Renvoie `null` — et non un objet vide — quand la lecture échoue (hors ligne,
 * vue absente, droits). La nuance est importante : « je ne sais pas » ne doit
 * surtout pas se lire comme « aucun fichier n'a changé », sinon une panne de
 * registre déclencherait le retéléchargement de toute la semaine.
 */
export async function fetchMediaRegistry() {
  try {
    const { data, error } = await withTimeout(
      supabase.from("educam_media_registry").select("path, size, updated_at"),
      8000
    );
    if (error || !data) return null;
    const out = {};
    data.forEach((r) => {
      if (!r || !r.path) return;
      out[r.path] = { size: Number(r.size) || 0, updatedAt: r.updated_at || null };
    });
    return out;
  } catch (_) { return null; }
}

/**
 * L'empreinte des médias d'une leçon, telle qu'elle sera RANGÉE AVEC la leçon.
 *
 * ⚠️ Le point délicat de tout ce lot : l'empreinte doit être **stockée** avec
 * le paquet, pas recalculée des deux côtés au moment de comparer. Si on
 * appliquait le registre du jour à la fois à l'ancienne et à la nouvelle
 * version, la partie « médias » serait identique des deux côtés et
 * s'annulerait — on ne détecterait jamais rien.
 *
 * Tableau TRIÉ et non objet : l'ordre des clés d'un objet se retrouve dans son
 * JSON, et deux ordres différents donneraient deux signatures différentes pour
 * un contenu identique.
 */
function mediaFingerprint(bundle, registry) {
  if (!registry) return null;
  const rows = [];
  (bundle.blocks || []).forEach((b) => {
    if (!b || !b.media_url) return;
    const p = mediaPathFromUrl(b.media_url);
    const r = p ? registry[p] : null;
    if (r) rows.push([p, r.size, r.updatedAt]);
  });
  rows.sort((a, z) => String(a[0]).localeCompare(String(z[0])));
  return rows;
}

/** The stored file, or undefined. */
export function loadMediaBlob(url) { return idbGet("lessons", MEDIA_PREFIX + url); }

/** Total bytes of device-held media — for an honest "N Mo sur cet appareil". */
export async function mediaBytesStored() {
  const ix = await getMediaIndex();
  return Object.values(ix).reduce((sum, m) => sum + (m && m.size ? m.size : 0), 0);
}

/**
 * Fetch one media file and keep it. Returns the number of bytes stored.
 * Throws on network failure so the caller can count it as a failure rather
 * than silently reporting success.
 */
export async function downloadMedia(url) {
  const res = await fetch(url, { cache: "reload" }); // CORS, readable — not no-cors
  if (!res || !res.ok) throw new Error("media-http-" + (res ? res.status : "0"));
  const blob = await res.blob();
  await idbSet("lessons", MEDIA_PREFIX + url, blob);
  return blob.size;
}

// A content signature so re-download can skip lessons that haven't changed.
// (There's no updated_at on lessons, so we compare the actual content.)
//
// `m` est l'empreinte des MÉDIAS (lot 13) : elle voyage avec le paquet, sous
// `__media`, posée au moment de l'enregistrement. C'est elle qui fait qu'une
// image ou une vidéo remplacée sous le même nom finit par redescendre.
function bundleSignature(b) {
  try {
    return JSON.stringify({
      t: b.lesson && [b.lesson.title, b.lesson.objective, b.lesson.duration, b.lesson.theme],
      s: (b.sections || []).map((x) => [x.section_type, x.title, x.icon, x.section_order]),
      b: (b.blocks || []).map((x) => [x.block_type, x.text_content, x.media_url, x.caption, x.block_order]),
      e: (b.exercises || []).map((x) => [x.question, x.answer, x.options, x.exercise_type, x.exercise_order]),
      m: b.__media || null,
    });
  } catch (_) { return String(Date.now()); }
}

// ---------- Download this week's lessons (images AND videos) ----------
// "Refresh only what changed": fetch the (small) lesson JSON, compare its
// signature to what's cached; only NEW or CHANGED lessons re-download images.
//
// Videos are handled on a SEPARATE rule, and the difference matters: a video is
// downloaded whenever it is missing from the device, even if the lesson text is
// unchanged. Without that, every lesson downloaded before video support existed
// would stay permanently video-less — the signature would say "nothing changed"
// and the file would never arrive.
export async function downloadWeek(lessonIds, onProgress) {
  let done = 0, fresh = 0, updated = 0, uptodate = 0, failed = 0;
  let videos = 0, videoBytes = 0, videoFailed = 0;
  let mediaReplaced = 0;
  const cached = [];
  const mediaIndex = await getMediaIndex();

  // UNE lecture pour toute la médiathèque (lot 13). `null` = registre
  // indisponible : on retombe alors exactement sur l'ancien comportement,
  // jamais sur un retéléchargement massif.
  const registry = await fetchMediaRegistry();

  for (const id of lessonIds) {
    try {
      const bundle = await fetchLessonBundle(id);
      const prev = await loadLessonBundle(id);

      // Sans registre, on REPREND l'empreinte déjà stockée : la partie
      // « médias » de la signature reste alors neutre, et la comparaison se
      // fait sur le contenu seul, comme avant ce lot.
      bundle.__media = registry ? mediaFingerprint(bundle, registry) : (prev ? prev.__media || null : null);

      // ⚠️ PREMIÈRE RENCONTRE avec une leçon téléchargée AVANT ce lot : elle
      // n'a pas d'empreinte. Comparer brut la déclarerait « modifiée », et la
      // toute première exécution retéléchargerait les images de TOUTE la
      // semaine — sur des données payantes, pour n'apprendre strictement rien,
      // puisqu'on n'a aucune version de référence à laquelle les comparer.
      //
      // On pose donc simplement la référence : l'empreinte est enregistrée
      // sans rien redescendre, et c'est à partir de la PROCHAINE fois que tout
      // remplacement est détecté. C'est le but recherché — pas de rattrapage
      // du passé, mais plus jamais de remplacement silencieux ensuite.
      const firstFingerprint = !!prev && registry && (prev.__media == null);
      const baseline = firstFingerprint ? { ...prev, __media: bundle.__media } : prev;

      const changed = !prev || bundleSignature(baseline) !== bundleSignature(bundle);
      if (changed) {
        await saveLessonBundle(id, bundle);
        // (Re)download images for new/changed lessons.
        // `cache: "reload"` traverse le « cache d'abord » du service worker —
        // sans quoi il rendrait l'ancienne image (voir cacheFirst dans sw.js).
        for (const b of bundle.blocks) {
          if (b.block_type === "image" && b.media_url) {
            try { await fetch(b.media_url, { mode: "no-cors", cache: "reload" }); } catch (_) {}
          }
        }
        if (prev) updated++; else fresh++;
      } else {
        // Inchangée : aucune image redescendue, aucune donnée dépensée. On
        // réenregistre quand même quand on vient de poser l'empreinte, sinon
        // elle serait perdue et on recommencerait à zéro au prochain passage.
        if (firstFingerprint) await saveLessonBundle(id, bundle);
        uptodate++;
      }

      // Videos: fetch any we do not already hold — OR any that have been
      // replaced on the server since we stored them (lot 13).
      //
      // The signature above already forces a lesson to be re-saved when its
      // media changed, but a video is NOT re-fetched by that path: it is
      // never in the image loop. It needs its own comparison, here.
      for (const b of bundle.blocks) {
        if (b.block_type !== "video" || !isDownloadableMedia(b.media_url)) continue;

        const held = mediaIndex[b.media_url];
        const reg = registry ? registry[mediaPathFromUrl(b.media_url) || ""] : null;

        let mustFetch = !held;
        let isReplacement = false;
        if (held && reg) {
          if (held.updatedAt == null) {
            // Entrée écrite avant ce lot : pas de date. Si la TAILLE coïncide,
            // c'est le même fichier — on complète la fiche sans redescendre
            // 2,5 Mo pour rien. Sinon, le fichier a bougé.
            if (held.size === reg.size) { mediaIndex[b.media_url] = { ...held, updatedAt: reg.updatedAt }; }
            else { mustFetch = true; isReplacement = true; }
          } else if (held.updatedAt !== reg.updatedAt || held.size !== reg.size) {
            mustFetch = true; isReplacement = true;
          }
        }
        if (!mustFetch) continue;

        try {
          const size = await downloadMedia(b.media_url);
          mediaIndex[b.media_url] = { size, storedAt: Date.now(), updatedAt: reg ? reg.updatedAt : null };
          videos++; videoBytes += size;
          if (isReplacement) mediaReplaced++;
        } catch (_) { videoFailed++; }
      }

      cached.push(id);
    } catch (_) { failed++; }
    done++;
    if (onProgress) onProgress(done, lessonIds.length);
  }

  await idbSet("kv", "mediaIndex", mediaIndex);
  const prevIds = (await idbGet("kv", "cachedLessonIds")) || [];
  const merged = Array.from(new Set(prevIds.concat(cached)));
  await idbSet("kv", "cachedLessonIds", merged);
  return {
    total: lessonIds.length, fresh, updated, uptodate, failed,
    videos, videoBytes, videoFailed,
    // `registryOff` permet à l'écran de dire la vérité : sans registre, on ne
    // peut PAS affirmer que les médias sont à jour, seulement que le texte l'est.
    mediaReplaced, registryOff: registry === null,
  };
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
