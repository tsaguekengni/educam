import { supabase } from "./supabase";
import { PROFILES_ENABLED } from "./flags";
import { enqueue } from "./offline";

// Fire-and-forget activity logging. No-op unless profiles are on, so it stays
// fully dormant during current testing and only writes once the activity_log
// table exists (rolled out with the profiles flag). Never throws to the caller.
//
// ⚠️ OFFLINE EVENTS ARE QUEUED, NOT DROPPED — and this matters more than it
// looks. This log is what the Activité pane reads, and what the anti-gaming
// checks ("marks a lesson taught without opening it", "teaches without
// entering results") reason over. If a teacher works a week without a signal
// and the events are silently discarded, she appears INACTIVE for that week
// and those checks fire against someone who did nothing wrong.
//
// ⚠️ `created_at` is written EXPLICITLY from the device. The column defaults to
// now(), so a queued event synced three days later would otherwise be recorded
// at sync time — collapsing a week of work into one timestamp and destroying
// the ordering the anti-gaming logic depends on.
export async function logActivity({ actorId, actorRole, schoolId, eventType, lessonId = null, detail = null }) {
  if (!PROFILES_ENABLED || !actorId || !eventType) return;

  const row = {
    actor_id: actorId,
    actor_role: actorRole || null,
    school_id: schoolId || null,
    event_type: eventType,
    lesson_id: lessonId,
    detail,
    created_at: new Date().toISOString(),
  };

  const hold = async () => {
    try {
      await enqueue({ kind: "activity", table: "activity_log", op: "insert", payload: row });
    } catch (_) { /* logging must never break the app */ }
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await hold();
    return;
  }

  try {
    const { error } = await supabase.from("activity_log").insert(row);
    if (error) throw error;
  } catch (_) {
    await hold();
  }
}
