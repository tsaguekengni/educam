import { supabase } from "./supabase";
import { PROFILES_ENABLED } from "./flags";

// Fire-and-forget activity logging. No-op unless profiles are on, so it stays
// fully dormant during current testing and only writes once the activity_log
// table exists (rolled out with the profiles flag). Never throws to the caller.
export async function logActivity({ actorId, actorRole, schoolId, eventType, lessonId = null, detail = null }) {
  if (!PROFILES_ENABLED || !actorId || !eventType) return;
  try {
    await supabase.from("activity_log").insert({
      actor_id: actorId,
      actor_role: actorRole || null,
      school_id: schoolId || null,
      event_type: eventType,
      lesson_id: lessonId,
      detail,
    });
  } catch (_) {
    /* logging must never break the app */
  }
}
