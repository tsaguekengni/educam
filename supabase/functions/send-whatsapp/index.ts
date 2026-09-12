// EduCam — `send-whatsapp` Supabase Edge Function (Deno).
// Deploy: supabase functions deploy send-whatsapp
//
// Called by src/lib/whatsapp.js via supabase.functions.invoke("send-whatsapp",
// { body: { student_id, message_id, kind } }). It:
//   1. authenticates the caller (JWT is verified by the platform; we also check
//      the caller is staff: admin / school_admin / referent, or the student's
//      teacher);
//   2. reads the child's name + parent phone + school with the SERVICE ROLE
//      (so no phone/name is ever trusted from the browser);
//   3. sends the pre-approved template via the Meta WhatsApp Cloud API using the
//      secret token (which never leaves this function);
//   4. logs every attempt to whatsapp_notifications (sent / failed / skipped).
//
// Best-effort by design: the in-app message already landed; this is an extra.
//
// Secrets (supabase secrets set …): WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
//   WHATSAPP_TEMPLATE_NAME, WHATSAPP_TEMPLATE_LANG, APP_URL,
//   WHATSAPP_API_VERSION (optional, default v21.0).
// Auto-injected: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const digits = (s: string) => (s || "").replace(/[^0-9]/g, ""); // Meta wants E.164 digits, no '+'

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const TOKEN = Deno.env.get("WHATSAPP_TOKEN");
  const PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const TEMPLATE = Deno.env.get("WHATSAPP_TEMPLATE_NAME") || "educam_parent_alert";
  const LANG = Deno.env.get("WHATSAPP_TEMPLATE_LANG") || "fr";
  const APP_URL = Deno.env.get("APP_URL") || "";
  const API_VERSION = Deno.env.get("WHATSAPP_API_VERSION") || "v21.0";

  // Service-role client: DB reads/writes bypass RLS (we do our own auth check).
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // --- Parse input ---
  let payload: { student_id?: string; message_id?: string | null; kind?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }
  const studentId = payload.student_id;
  const messageId = payload.message_id ?? null;
  const kind = payload.kind || "message";
  if (!studentId) return json({ ok: false, error: "missing_student_id" }, 400);

  // --- Authenticate the caller & check they're staff for this student ---
  const authHeader = req.headers.get("Authorization") || "";
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await caller.auth.getUser();
  const uid = userData?.user?.id;
  if (!uid) return json({ ok: false, error: "unauthenticated" }, 401);

  // --- Read the student with the service role ---
  const { data: student, error: sErr } = await admin
    .from("students")
    .select("id, full_name, parent_phone, school_id, teacher_id")
    .eq("id", studentId)
    .maybeSingle();
  if (sErr || !student) return json({ ok: false, error: "student_not_found" }, 404);

  // Caller must be a technician / director / referent, or this student's teacher.
  const { data: me } = await admin
    .from("teachers")
    .select("role, school_id")
    .eq("id", uid)
    .maybeSingle();
  const isStaff =
    me &&
    (me.role === "admin" ||
      ((me.role === "school_admin" || me.role === "referent") &&
        me.school_id && me.school_id === student.school_id));
  const isTheirTeacher = student.teacher_id && student.teacher_id === uid;
  if (!isStaff && !isTheirTeacher) return json({ ok: false, error: "forbidden" }, 403);

  const logRow = {
    school_id: student.school_id,
    student_id: student.id,
    message_id: messageId,
    to_phone: student.parent_phone || null,
    kind,
    template: TEMPLATE,
  };

  // --- No phone on file → record as skipped, not an error ---
  if (!student.parent_phone) {
    await admin.from("whatsapp_notifications").insert({ ...logRow, status: "skipped", error: "no_parent_phone" });
    return json({ ok: true, skipped: true, reason: "no_parent_phone" });
  }

  // --- Not configured → skip cleanly ---
  if (!TOKEN || !PHONE_ID) {
    await admin.from("whatsapp_notifications").insert({ ...logRow, status: "skipped", error: "provider_not_configured" });
    return json({ ok: true, skipped: true, reason: "provider_not_configured" });
  }

  // --- Send the template via Meta Cloud API ---
  // Template body has two variables: {{1}} = child's name, {{2}} = link.
  const to = digits(student.parent_phone);
  const link = APP_URL || "https://educam.app";
  const body = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: TEMPLATE,
      language: { code: LANG },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: student.full_name || "votre enfant" },
            { type: "text", text: link },
          ],
        },
      ],
    },
  };

  try {
    const resp = await fetch(`https://graph.facebook.com/${API_VERSION}/${PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await resp.json();
    if (!resp.ok) {
      const errMsg = result?.error?.message || `http_${resp.status}`;
      await admin.from("whatsapp_notifications").insert({ ...logRow, status: "failed", error: errMsg });
      return json({ ok: false, error: errMsg }, 200); // 200: best-effort, don't surface as a hard error
    }
    const providerId = result?.messages?.[0]?.id || null;
    await admin.from("whatsapp_notifications").insert({ ...logRow, status: "sent", provider_message_id: providerId });
    return json({ ok: true, provider_message_id: providerId });
  } catch (e) {
    await admin.from("whatsapp_notifications").insert({ ...logRow, status: "failed", error: String(e) });
    return json({ ok: false, error: String(e) }, 200);
  }
});
