// EduCam — `send-direct-message`: WhatsApp for a message A PERSON wrote.
//
// Separate from `send-whatsapp` on purpose. That one notifies a parent ABOUT A
// CHILD's results with the lesson-centred template. This one is for a human
// writing to a parent OR to a colleague, and uses its own template that greets
// the recipient and NAMES THE SENDER — so it never reads like another
// automatic notice about a lesson.
//
// ⚠️ WhatsApp forbids free text: a business-initiated message must use an
// approved template (arbitrary text only inside a 24h window the recipient
// opens by writing first). So the excerpt travels as a PARAMETER and the full
// message stays in the app.
//
// ⚠️ Nothing is trusted from the browser — a message id only. Names, excerpt,
// recipient and phone are all read here with the service role.
//
// ⚠️ FOUR BODY PARAMETERS, NO HEADER PARAMETER (the title "Message Important"
// is static text). Must match the approved `educam_direct_message` exactly or
// Meta answers `(#132000) Number of parameters does not match`:
//     Bonjour {{1}}
//     {{2}} vous a écrit : « {{3}} ».
//     Ouvrez EduCam {{4}}
//     Pour lire le message complet et répondre.
//     Merci
//   {{1}} recipient · {{2}} sender · {{3}} excerpt · {{4}} link

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const digits = (s: string) => (s || "").replace(/[^0-9]/g, "");
// Meta rejects parameters containing newlines, tabs or runs of spaces.
const param = (s: string, max: number) => {
  const flat = (s || "").replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
};
const firstName = (full: string) => (full || "").trim().split(/\s+/)[0] || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const TOKEN = Deno.env.get("WHATSAPP_TOKEN");
  const PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const TEMPLATE = Deno.env.get("WHATSAPP_TEMPLATE_DIRECT") || "educam_direct_message";
  const LANG = Deno.env.get("WHATSAPP_TEMPLATE_LANG") || "fr";
  const APP_URL = Deno.env.get("APP_URL") || "https://educam-eight.vercel.app";
  const API_VERSION = Deno.env.get("WHATSAPP_API_VERSION") || "v21.0";

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let payload: { message_id?: string };
  try { payload = await req.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }
  const messageId = payload.message_id;
  if (!messageId) return json({ ok: false, error: "missing_message_id" }, 400);

  // --- Who is calling ---
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
  });
  const { data: userData } = await caller.auth.getUser();
  const uid = userData?.user?.id;
  if (!uid) return json({ ok: false, error: "unauthenticated" }, 401);

  const { data: me } = await admin.from("teachers")
    .select("id, full_name, role").eq("id", uid).maybeSingle();

  const { data: msg } = await admin.from("messages")
    .select("id, sender_id, audience, recipient_id, student_id, subject, body, school_id")
    .eq("id", messageId).maybeSingle();
  if (!msg) return json({ ok: false, error: "message_not_found" }, 404);

  // You may only notify about a message you wrote; the superadmin may act for any.
  if (msg.sender_id !== uid && me?.role !== "admin") return json({ ok: false, error: "forbidden" }, 403);

  // Resolve WHO is being written to — a parent through their child, a colleague
  // through their own record. Staff could not be reached at all before this.
  let toPhone: string | null = null;
  let toName = "";
  let studentId: string | null = null;

  if (msg.audience === "parent") {
    studentId = msg.student_id;
    let childName = "";
    if (msg.student_id) {
      const { data: st } = await admin.from("students")
        .select("full_name, parent_phone").eq("id", msg.student_id).maybeSingle();
      toPhone = st?.parent_phone || null;
      childName = st?.full_name || "";
    }
    if (msg.recipient_id) {
      const { data: pa } = await admin.from("parents")
        .select("full_name, phone").eq("id", msg.recipient_id).maybeSingle();
      if (!toPhone) toPhone = pa?.phone || null;
      toName = pa?.full_name || "";
    }
    // A parent may have no account yet (code not activated) — greet them through
    // their child rather than leaving the greeting blank.
    if (!toName) toName = childName ? `Parent de ${firstName(childName)}` : "cher parent";
  } else if (msg.recipient_id) {
    const { data: tc } = await admin.from("teachers")
      .select("full_name, phone").eq("id", msg.recipient_id).maybeSingle();
    toPhone = tc?.phone || null;
    toName = tc?.full_name || "cher collègue";
  }

  const logRow = {
    school_id: msg.school_id, student_id: studentId, message_id: msg.id,
    to_phone: toPhone, kind: "direct", template: TEMPLATE,
  };

  // A missing number is recorded, never silently dropped — it is the single
  // most likely reason a message "was not received".
  if (!toPhone) {
    await admin.from("whatsapp_notifications").insert({ ...logRow, status: "skipped", error: "no_phone_on_file" });
    return json({ ok: true, skipped: true, reason: "no_phone_on_file" });
  }
  if (!TOKEN || !PHONE_ID) {
    await admin.from("whatsapp_notifications").insert({ ...logRow, status: "skipped", error: "provider_not_configured" });
    return json({ ok: true, skipped: true, reason: "provider_not_configured" });
  }

  const recipientName = param(toName, 40);
  const senderName = param(me?.full_name || "l'équipe EduCam", 40);
  const excerpt = param(msg.subject || msg.body || "nouveau message", 70);

  try {
    const resp = await fetch(`https://graph.facebook.com/${API_VERSION}/${PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp", to: digits(toPhone), type: "template",
        template: {
          name: TEMPLATE, language: { code: LANG },
          components: [{
            type: "body",
            parameters: [
              { type: "text", text: recipientName },
              { type: "text", text: senderName },
              { type: "text", text: excerpt },
              { type: "text", text: APP_URL },
            ],
          }],
        },
      }),
    });
    const result = await resp.json();
    if (!resp.ok) {
      const errMsg = result?.error?.message || `http_${resp.status}`;
      await admin.from("whatsapp_notifications").insert({ ...logRow, status: "failed", error: errMsg });
      return json({ ok: false, error: errMsg }, 200);   // best-effort: the in-app message already landed
    }
    const providerId = result?.messages?.[0]?.id || null;
    await admin.from("whatsapp_notifications").insert({ ...logRow, status: "sent", provider_message_id: providerId });
    return json({ ok: true, provider_message_id: providerId });
  } catch (e) {
    await admin.from("whatsapp_notifications").insert({ ...logRow, status: "failed", error: String(e) });
    return json({ ok: false, error: String(e) }, 200);
  }
});
