// EduCam — draining the offline write queue.
//
// The outbox (see lib/offline.js) holds everything a teacher did without a
// network. This module is the other half: it replays those writes against
// Supabase once the connection is back.
//
// ⚠️ ORDER MATTERS, and the first step is the one that is easy to miss.
//
// 1. REFRESH THE SESSION FIRST. The access token expires after about an hour.
//    After a day offline it is stale, and RLS will reject every single write.
//    If the session cannot be refreshed we stop and keep the queue INTACT —
//    draining with a dead token would burn through the entries and lose the
//    teacher's work. Better to wait and try again.
// 2. Drain oldest first, ONE AT A TIME — never in parallel. The order the
//    teacher worked in is the order the server should see.
// 3. Stop early on what looks like a transient failure and retry later; park
//    an entry that has failed repeatedly so one bad record cannot block
//    everything behind it.

import { supabase } from "./supabase";
import { listQueue, dequeue, markAttempt } from "./offline";

// After this many failures an entry is skipped rather than retried forever.
// It stays in the outbox (nothing is thrown away) but stops blocking the queue.
const MAX_ATTEMPTS = 5;

// Guards against two drains running at once — reconnecting can easily fire the
// `online` event and a mount effect within the same second.
let draining = false;

/** Replay one queued write. Throws on failure so the caller can count it. */
async function applyOne(entry) {
  const { table, op, payload, onConflict, match } = entry;

  if (op === "upsert") {
    const { error } = await supabase
      .from(table)
      .upsert(payload, onConflict ? { onConflict } : undefined);
    if (error) throw new Error(error.message || "upsert failed");
    return;
  }

  if (op === "insert") {
    const { error } = await supabase.from(table).insert(payload);
    if (error) throw new Error(error.message || "insert failed");
    return;
  }

  if (op === "update") {
    let q = supabase.from(table).update(payload);
    for (const [col, val] of Object.entries(match || {})) q = q.eq(col, val);
    const { error } = await q;
    if (error) throw new Error(error.message || "update failed");
    return;
  }

  // Calling an Edge Function rather than writing a table — used for the parent
  // WhatsApp nudge, which can only run once the message row it refers to
  // actually exists. The queue drains oldest-first and one at a time, so the
  // insert that created that row has already been applied by the time we get
  // here. That ordering is the whole reason this works.
  if (op === "invoke") {
    const { error } = await supabase.functions.invoke(entry.fn, { body: entry.body });
    if (error) throw new Error(error.message || "invoke failed");
    return;
  }

  if (op === "delete") {
    let q = supabase.from(table).delete();
    for (const [col, val] of Object.entries(match || {})) q = q.eq(col, val);
    const { error } = await q;
    if (error) throw new Error(error.message || "delete failed");
    return;
  }

  throw new Error(`unknown op: ${op}`);
}

/**
 * Empty the outbox. Safe to call often — on reconnect, on mount, after login.
 *
 * Returns { sent, failed, parked, skipped?, offline?, noSession?, total }.
 * Never throws: a sync that fails must never break the screen the teacher is
 * looking at.
 */
export async function drainQueue(onProgress) {
  if (draining) return { skipped: true, sent: 0, failed: 0, parked: 0, total: 0 };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { offline: true, sent: 0, failed: 0, parked: 0, total: 0 };
  }

  draining = true;
  let sent = 0, failed = 0, parked = 0, total = 0;

  try {
    // --- Step 1: a valid session, or we do not touch the queue at all. ---
    // getSession() refreshes an expired token when it can; both a hard error
    // and a missing session mean "not now".
    let session = null;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (!error) session = data?.session || null;
    } catch (_) { session = null; }
    if (!session) return { noSession: true, sent: 0, failed: 0, parked: 0, total: 0 };

    // --- Step 2: drain, oldest first, strictly one at a time. ---
    const items = await listQueue();
    total = items.length;

    for (const entry of items) {
      // The connection can drop again mid-drain.
      if (typeof navigator !== "undefined" && !navigator.onLine) break;

      if ((entry.attempts || 0) >= MAX_ATTEMPTS) { parked++; continue; }

      try {
        await applyOne(entry);
        await dequeue(entry.id);
        sent++;
        if (onProgress) onProgress(sent, total);
      } catch (err) {
        failed++;
        // A "best effort" entry must never hold up the queue behind it. The
        // WhatsApp nudge is the case: the in-app message has already arrived,
        // the nudge is an extra. Losing it is a far smaller harm than stalling
        // a teacher's marks because a notification provider is misconfigured.
        if (entry.bestEffort) { await dequeue(entry.id); continue; }

        const updated = await markAttempt(entry, err?.message);
        // Repeated failure = probably this record, not the network: park it and
        // keep going. Otherwise assume the network and retry the rest later.
        if ((updated.attempts || 0) >= MAX_ATTEMPTS) { parked++; continue; }
        break;
      }
    }
  } catch (_) {
    // Never let a sync failure surface as a crash.
  } finally {
    draining = false;
  }

  return { sent, failed, parked, total };
}
