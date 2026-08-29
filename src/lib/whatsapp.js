import { supabase } from "./supabase";
import { WHATSAPP_ENABLED } from "./flags";

// Parent WhatsApp notification — best-effort, fire-and-forget.
//
// The actual send (and the secret provider token) live in the Supabase Edge
// Function `send-whatsapp`; from the client we only ask it to notify the parent
// of a given student. The function reads the child's name, the parent's phone
// and (for a message) the message body from the database with the service role,
// so no message content or phone number is trusted from the browser.
//
// This never throws and never blocks the UI: if WhatsApp isn't configured, the
// flag is off, or the send fails, the in-app message still went through — the
// WhatsApp nudge is an extra, not a dependency.
export async function notifyParentWhatsApp({ studentId, messageId = null, kind = "message" }) {
  if (!WHATSAPP_ENABLED || !studentId) return { ok: false, skipped: true };
  try {
    const { data, error } = await supabase.functions.invoke("send-whatsapp", {
      body: { student_id: studentId, message_id: messageId, kind },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
