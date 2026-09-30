// EduCam — `daily-parent-alerts` (Deno). Runs each evening, 18:00 Douala.
//
// WHY ON A SCHEDULE AND NOT WHEN A MARK IS ENTERED
// The results screen saves every row as the teacher types. A teacher who types
// `1`, sees the mistake and corrects it to `4` would ALREADY have told that
// parent their child struggled — and there is no unsending it. Waiting until
// the evening lets the day's marks settle before anyone is told.
//
// ⚠️ WHY IT LOOKS BACK SEVERAL DAYS AND NOT JUST AT TODAY
// Teachers work offline. Marks entered on Monday in a classroom with no signal
// reach the server on Thursday, still dated Monday. A run that only looked at
// "today" would never alert those parents — silently defeating the whole point
// of the offline queue. So each run sweeps a window of recent school days.
// Re-examining days already handled costs one query and creates nothing:
// `result_alerts` is UNIQUE (student_id, lesson_id, result_date).
//
// ⚠️ WHY `verify_jwt` IS OFF
// This is called by pg_cron, which holds no user session. The platform's JWT
// check also REJECTS a modern `sb_secret_…` key outright, because it is not a
// JWT — so leaving it on made the function unreachable depending only on which
// key format the project uses. Authentication is done below instead, against
// the service-role key itself: stricter than the platform check, which any
// logged-in teacher's token would have satisfied.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const digits = (s: string) => (s || "").replace(/[^0-9]/g, "");
const firstName = (full: string) => (full || "").trim().split(/\s+/)[0] || "votre enfant";
const PUSH_COOLDOWN_HOURS = 20;   // one nudge per child per school day
const DEFAULT_LOOKBACK_DAYS = 7;  // covers a teacher offline for a week

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const TOKEN = Deno.env.get("WHATSAPP_TOKEN");
  const PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const TEMPLATE = Deno.env.get("WHATSAPP_TEMPLATE_NAME") || "educam_parent_alert";
  const LANG = Deno.env.get("WHATSAPP_TEMPLATE_LANG") || "fr";
  const APP_URL = Deno.env.get("APP_URL") || "https://educam-eight.vercel.app";
  const API_VERSION = Deno.env.get("WHATSAPP_API_VERSION") || "v21.0";

  // --- Only the scheduler may run this ---
  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!SERVICE_KEY || bearer !== SERVICE_KEY) {
    // Say which KIND of key is expected without revealing it. Projects may hold
    // a legacy JWT service key (eyJ…) or a modern secret key (sb_secret_…), and
    // pasting the wrong one — or leaving the placeholder — is otherwise a
    // silent dead end that would only surface as "no parent was ever told".
    return json({
      ok: false,
      error: "forbidden",
      hint: `expected this project's service_role key (starts with "${(SERVICE_KEY || "").slice(0, 3)}")`,
      received_prefix: bearer ? bearer.slice(0, 3) : "(no Authorization header)",
    }, 403);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: { date?: string; days?: number; dry_run?: boolean } = {};
  try { body = await req.json(); } catch { /* the scheduler sends no body */ }

  // The school day in Cameroon, not UTC.
  const until = body.date || new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Douala" });
  const lookback = Math.max(0, Math.min(30, body.days ?? DEFAULT_LOOKBACK_DAYS));
  const fromDate = new Date(`${until}T00:00:00Z`);
  fromDate.setUTCDate(fromDate.getUTCDate() - lookback);
  const since = fromDate.toISOString().slice(0, 10);
  const dryRun = !!body.dry_run;

  // --- Weak results in the window ---
  const { data: rows, error: rErr } = await admin
    .from("daily_results")
    .select("student_id, lesson_id, score, total, result_date, school_id")
    .gte("result_date", since).lte("result_date", until)
    .eq("difficulty", true);
  if (rErr) return json({ ok: false, error: rErr.message }, 500);
  if (!rows?.length) return json({ ok: true, since, until, considered: 0, created: 0, pushed: 0 });

  // --- What has already been sent (the idempotency guard) ---
  const { data: done } = await admin
    .from("result_alerts").select("student_id, lesson_id, result_date")
    .gte("result_date", since).lte("result_date", until);
  const already = new Set((done || []).map((a) => `${a.student_id}·${a.lesson_id}·${a.result_date}`));
  const fresh = rows.filter((r) => !already.has(`${r.student_id}·${r.lesson_id}·${r.result_date}`));
  if (!fresh.length) return json({ ok: true, since, until, considered: rows.length, created: 0, pushed: 0 });

  // --- Bulk lookups ---
  const studentIds = [...new Set(fresh.map((r) => r.student_id))];
  const lessonIds = [...new Set(fresh.map((r) => r.lesson_id))];
  const [{ data: students }, { data: parents }, { data: lessons }] = await Promise.all([
    admin.from("students").select("id, full_name, parent_phone, school_id").in("id", studentIds),
    admin.from("parents").select("id, student_id").in("student_id", studentIds),
    admin.from("lessons").select("id, title, theme, parent_tip").in("id", lessonIds),
  ]);
  const sById = new Map((students || []).map((s) => [s.id, s]));
  const pByStudent = new Map<string, string>();
  (parents || []).forEach((p) => { if (p.student_id && !pByStudent.has(p.student_id)) pByStudent.set(p.student_id, p.id); });
  const lById = new Map((lessons || []).map((l) => [l.id, l]));

  // --- Consent, once the portal exists ---
  // Ask the table rather than hard-coding "no consent system": if it is there,
  // an opt-in is REQUIRED; if it is not there yet, proceed. Turning consent on
  // later is then a data change, not a code change.
  const optedIn = new Map<string, boolean>();
  let consentEnforced = false;
  {
    const { data: consents, error: cErr } = await admin
      .from("parent_consents").select("student_id, whatsapp_optin").in("student_id", studentIds);
    if (!cErr) {
      consentEnforced = true;
      (consents || []).forEach((c) => { if (c.whatsapp_optin) optedIn.set(c.student_id, true); });
    }
  }

  // --- One inbox message per lesson to review ---
  let created = 0;
  const touched = new Set<string>();

  for (const r of fresh) {
    const stu = sById.get(r.student_id);
    const les = lById.get(r.lesson_id);
    if (!stu || !les) continue;

    const name = firstName(stu.full_name);
    const tip = (les.parent_tip || "").trim();
    const messageId = crypto.randomUUID();

    if (dryRun) { created++; touched.add(r.student_id); continue; }

    const { error: mErr } = await admin.from("messages").insert({
      id: messageId,
      school_id: stu.school_id || r.school_id || null,
      sender_id: null,                       // written by the platform, not a person
      audience: "parent",
      recipient_id: pByStudent.get(r.student_id) || null,
      student_id: r.student_id,
      subject: `Leçon à revoir : ${les.title}`,
      // Tone matters: "a lesson to go over", never "your child failed".
      body:
        `${name} a besoin de revoir cette leçon${les.theme ? ` (${les.theme})` : ""}.\n\n` +
        `Ouvrez-la ci-dessous pour la reprendre ensemble à la maison — quelques minutes suffisent.` +
        (tip ? `\n\nConseil : ${tip}` : ""),
      link_url: String(r.lesson_id),         // numeric → inbox shows "Ouvrir la leçon"
      created_at: new Date().toISOString(),
    });
    if (mErr) continue;

    // Recorded only AFTER the message exists, so a crash in between retries the
    // alert rather than silently skipping it.
    const { error: aErr } = await admin.from("result_alerts").insert({
      student_id: r.student_id, lesson_id: r.lesson_id,
      result_date: r.result_date, message_id: messageId,
    });
    if (aErr) continue;                      // unique violation: another run won

    created++;
    touched.add(r.student_id);
  }

  // --- At most ONE WhatsApp nudge per child per day ---
  let pushed = 0, skipped = 0;
  const cooldown = new Date(Date.now() - PUSH_COOLDOWN_HOURS * 3600_000).toISOString();

  if (!dryRun && TOKEN && PHONE_ID) {
    for (const sid of touched) {
      const stu = sById.get(sid);
      if (!stu) continue;

      const { data: recent } = await admin
        .from("result_alerts").select("id")
        .eq("student_id", sid).eq("pushed", true).gte("created_at", cooldown).limit(1);
      if (recent?.length) continue;          // already nudged about this child today

      const logRow = {
        school_id: stu.school_id, student_id: sid, message_id: null,
        to_phone: stu.parent_phone || null, kind: "daily_alert", template: TEMPLATE,
      };

      if (!stu.parent_phone) {
        await admin.from("whatsapp_notifications").insert({ ...logRow, status: "skipped", error: "no_parent_phone" });
        skipped++; continue;
      }
      if (consentEnforced && !optedIn.get(sid)) {
        await admin.from("whatsapp_notifications").insert({ ...logRow, status: "skipped", error: "no_consent" });
        skipped++; continue;
      }

      const childName = stu.full_name || "votre enfant";
      try {
        const resp = await fetch(`https://graph.facebook.com/${API_VERSION}/${PHONE_ID}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_product: "whatsapp", to: digits(stu.parent_phone), type: "template",
            template: {
              name: TEMPLATE, language: { code: LANG },
              components: [
                { type: "header", parameters: [{ type: "text", text: childName }] },
                { type: "body", parameters: [{ type: "text", text: childName }, { type: "text", text: APP_URL }] },
              ],
            },
          }),
        });
        const result = await resp.json();
        if (!resp.ok) {
          await admin.from("whatsapp_notifications").insert({ ...logRow, status: "failed", error: result?.error?.message || `http_${resp.status}` });
          continue;
        }
        await admin.from("whatsapp_notifications").insert({ ...logRow, status: "sent", provider_message_id: result?.messages?.[0]?.id || null });
        // Mark only the rows this run created, so the cooldown is measured from
        // the nudge itself rather than from an old school day.
        await admin.from("result_alerts").update({ pushed: true })
          .eq("student_id", sid).gte("created_at", new Date(Date.now() - 3600_000).toISOString());
        pushed++;
      } catch (e) {
        await admin.from("whatsapp_notifications").insert({ ...logRow, status: "failed", error: String(e) });
      }
    }
  }

  return json({ ok: true, since, until, considered: rows.length, created, pushed, skipped, consentEnforced, dryRun });
});
