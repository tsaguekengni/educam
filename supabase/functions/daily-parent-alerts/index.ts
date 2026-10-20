// EduCam — `daily-parent-alerts` (Deno). Runs each evening, 18:00 Douala.
// Partie 1 : alertes de note faible. Partie 2 (2026-10-19) : rappel de révision
// les jours de leçons sans quiz — voir plus bas.
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

// ─────────────────────────────────────────────────────────────────────────────
// DESTINATAIRES D'UN ENFANT — règle UNIQUE, partagée par les trois fonctions
// WhatsApp depuis le 2026-10-07 :
//
//   1. le numéro de CHAQUE COMPTE PARENT de l'enfant (`parents.phone`). C'est un
//      numéro que son propriétaire a donné lui-même en s'inscrivant : le plus
//      fiable qui soit. Et c'est par là — et NON par une case libre côté école —
//      qu'un troisième adulte inscrit devient joignable.
//   2. puis `parent_phone` et `parent_phone_2`, les numéros saisis par l'école.
//
// 🔴 CETTE FONCTION NE LISAIT QUE LES DEUX NUMÉROS DE L'ÉCOLE jusqu'au
// 2026-10-07. Une mère inscrite le 2026-10-06, avec un numéro que l'école
// n'avait pas, a créé son compte, s'est connectée et a ACCEPTÉ les
// notifications — et n'aurait reçu aucune alerte du soir. ⭐ Un parcours qui se
// termine par un écran vert n'est pas un parcours qui marche : c'est la base
// qu'il faut interroger pour le savoir.
//
// `parent_phone_3` n'est PAS un destinataire : c'est la case de réserve.
// Dédoublonné sur les CHIFFRES — « +237 690 00 00 01 » et « 237690000001 » sont
// le même téléphone, et l'envoyer deux fois coûterait deux messages et agacerait
// le parent.
// ─────────────────────────────────────────────────────────────────────────────
const phonesOf = (
  stu: { parent_phone?: string | null; parent_phone_2?: string | null },
  parentPhones: (string | null | undefined)[] = [],
) => {
  const out: string[] = [];
  const add = (p?: string | null) => {
    const d = digits(p || "");
    if (d && !out.some((x) => digits(x) === d)) out.push(p as string);
  };
  for (const p of parentPhones) add(p);
  add(stu.parent_phone);
  add(stu.parent_phone_2);
  return out;
};
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

  let body: { date?: string; days?: number; dry_run?: boolean; revision?: boolean } = {};
  try { body = await req.json(); } catch { /* the scheduler sends no body */ }

  // The school day in Cameroon, not UTC.
  const until = body.date || new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Douala" });
  const lookback = Math.max(0, Math.min(30, body.days ?? DEFAULT_LOOKBACK_DAYS));
  const fromDate = new Date(`${until}T00:00:00Z`);
  fromDate.setUTCDate(fromDate.getUTCDate() - lookback);
  const since = fromDate.toISOString().slice(0, 10);
  const dryRun = !!body.dry_run;

  // Partie 1 — alertes de note faible. Bloc étiqueté : quand il n'y a rien à
  // signaler, on en SORT (break) au lieu de quitter la fonction, pour que le
  // rappel de révision (partie 2) s'exécute quand même.
  const A = { considered: 0, created: 0, pushed: 0, skipped: 0, consentEnforced: false, error: null as string | null };
  alertes: {
  // --- Weak results in the window ---
  const { data: rows, error: rErr } = await admin
    .from("daily_results")
    .select("student_id, lesson_id, score, total, result_date, school_id")
    .gte("result_date", since).lte("result_date", until)
    .eq("difficulty", true);
  if (rErr) { A.error = rErr.message; break alertes; }
  if (!rows?.length) break alertes;
  A.considered = rows.length;

  // --- What has already been sent (the idempotency guard) ---
  const { data: done } = await admin
    .from("result_alerts").select("student_id, lesson_id, result_date")
    .gte("result_date", since).lte("result_date", until);
  const already = new Set((done || []).map((a) => `${a.student_id}·${a.lesson_id}·${a.result_date}`));
  const fresh = rows.filter((r) => !already.has(`${r.student_id}·${r.lesson_id}·${r.result_date}`));
  if (!fresh.length) break alertes;

  // --- Bulk lookups ---
  const studentIds = [...new Set(fresh.map((r) => r.student_id))];
  const lessonIds = [...new Set(fresh.map((r) => r.lesson_id))];
  const [{ data: students }, { data: parents }, { data: lessons }] = await Promise.all([
    admin.from("students").select("id, full_name, parent_phone, parent_phone_2, school_id").in("id", studentIds),
    admin.from("parents").select("id, student_id, phone").in("student_id", studentIds),
    admin.from("lessons").select("id, title, theme, parent_tip").in("id", lessonIds),
  ]);
  const sById = new Map((students || []).map((s) => [s.id, s]));
  const pByStudent = new Map<string, string>();
  // TOUS les numéros de comptes parents de l'enfant, pas seulement le premier :
  // le père et la mère peuvent avoir chacun le sien, et un troisième adulte
  // inscrit doit être joint lui aussi.
  const parentPhonesByStudent = new Map<string, string[]>();
  (parents || []).forEach((p) => {
    if (!p.student_id) return;
    if (!pByStudent.has(p.student_id)) pByStudent.set(p.student_id, p.id);
    const arr = parentPhonesByStudent.get(p.student_id) || [];
    if (p.phone) arr.push(p.phone);
    parentPhonesByStudent.set(p.student_id, arr);
  });
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

      const numbers = phonesOf(stu, parentPhonesByStudent.get(sid) || []);
      const logRow = {
        school_id: stu.school_id, student_id: sid, message_id: null,
        to_phone: numbers[0] || null, kind: "daily_alert", template: TEMPLATE,
      };

      if (!numbers.length) {
        await admin.from("whatsapp_notifications").insert({ ...logRow, status: "skipped", error: "no_parent_phone" });
        skipped++; continue;
      }
      if (consentEnforced && !optedIn.get(sid)) {
        await admin.from("whatsapp_notifications").insert({ ...logRow, status: "skipped", error: "no_consent" });
        skipped++; continue;
      }

      const childName = stu.full_name || "votre enfant";

      // UN ENVOI APRÈS L'AUTRE, jamais en parallèle : une rafale d'appels
      // simultanés à Meta est ce qui fait chuter la note de qualité d'un numéro.
      // Chaque destinataire a sa propre ligne de journal — sinon un échec sur le
      // second parent serait invisible.
      let anySent = false;
      for (const to of numbers) {
        const row = { ...logRow, to_phone: to };
        try {
          const resp = await fetch(`https://graph.facebook.com/${API_VERSION}/${PHONE_ID}/messages`, {
            method: "POST",
            headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              messaging_product: "whatsapp", to: digits(to), type: "template",
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
            await admin.from("whatsapp_notifications").insert({ ...row, status: "failed", error: result?.error?.message || `http_${resp.status}` });
            continue;   // on tente quand même l'autre parent
          }
          await admin.from("whatsapp_notifications").insert({ ...row, status: "sent", provider_message_id: result?.messages?.[0]?.id || null });
          anySent = true;
          pushed++;
        } catch (e) {
          await admin.from("whatsapp_notifications").insert({ ...row, status: "failed", error: String(e) });
        }
      }

      // Le délai de garde se pose dès qu'AU MOINS UN parent a été joint. Sinon
      // un échec sur le second ferait tout renvoyer au prochain passage, y
      // compris au premier parent qui, lui, avait bien reçu.
      if (anySent) {
        // Mark only the rows this run created, so the cooldown is measured from
        // the nudge itself rather than from an old school day.
        await admin.from("result_alerts").update({ pushed: true })
          .eq("student_id", sid).gte("created_at", new Date(Date.now() - 3600_000).toISOString());
      }
    }
  }

    A.created = created; A.pushed = pushed; A.skipped = skipped; A.consentEnforced = consentEnforced;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RAPPEL DE RÉVISION DU SOIR — ajouté le 2026-10-19
  //
  // POURQUOI : l'enseignante ne peut pas faire passer un quiz chaque jour (le
  // 19 octobre, l'imprimante manquait). Ces jours-là, aucune alerte ne partait
  // et les parents n'entendaient plus parler de l'école. Désormais, CHAQUE JOUR
  // où des leçons sont marquées « enseignées » dans une classe SANS qu'aucun
  // résultat de quiz n'y soit saisi, chaque famille de la classe reçoit :
  //   • un message dans l'application listant les leçons du jour ;
  //   • la même notification WhatsApp que l'alerte de note faible
  //     (`educam_parent_alert`, « Vous avez une mise à jour concernant… »).
  //
  // RÈGLES
  //   • Seulement le jour même (`until`) : un rappel de révision pour une leçon
  //     d'il y a trois jours n'aurait plus de sens.
  //   • Un jour de quiz (au moins un résultat saisi pour un élève de la classe),
  //     rien : l'alerte de note faible prend le relais.
  //   • Un rappel par enfant et par jour, garanti par `revision_reminders`
  //     (UNIQUE student_id, reminder_date) : relancer la fonction ne renvoie rien.
  //   • Mêmes destinataires et même consentement que l'alerte de note faible.
  //   • `{"revision": false}` dans le corps de l'appel désactive cette partie.
  //
  // ⚠️ Meta a approuvé `educam_parent_alert` comme modèle « Utilitaire ». Un envoi
  // quotidien à toutes les familles pourrait l'amener à le reclasser
  // « Marketing ». Surveiller la catégorie du modèle dans le WhatsApp Manager.
  // ═══════════════════════════════════════════════════════════════════════════
  const R = { teachers: 0, families: 0, created: 0, pushed: 0, skipped: 0, quiz_day: 0, error: null as string | null };

  const nomEnseignant = (full: string) => {
    const w = (full || "").trim().split(/\s+/).filter(Boolean);
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    if (w.length >= 2 && /^(mme|mlle|m\.?|mr\.?)$/i.test(w[0])) return `${w[0]} ${cap(w[1])}`;
    return w.map(cap).join(" ") || "l'enseignant";
  };

  if (body.revision !== false) {
    // La journée scolaire de Douala (UTC+1, sans heure d'été).
    const dayStart = new Date(`${until}T00:00:00+01:00`).toISOString();
    const dayEnd = new Date(`${until}T23:59:59.999+01:00`).toISOString();
    const { data: taughtRows, error: tErr } = await admin
      .from("lessons_taught").select("teacher_id, lesson_id, taught_at")
      .gte("taught_at", dayStart).lte("taught_at", dayEnd).order("taught_at");
    if (tErr) R.error = tErr.message;

    // Leçons du jour par enseignant, dans l'ordre où elles ont été marquées,
    // sans doublon (une leçon cochée deux fois n'apparaît qu'une fois).
    const byTeacher = new Map<string, number[]>();
    for (const t of taughtRows || []) {
      if (!t.teacher_id || t.lesson_id == null) continue;
      const arr = byTeacher.get(t.teacher_id) || [];
      if (!arr.includes(t.lesson_id)) arr.push(t.lesson_id);
      byTeacher.set(t.teacher_id, arr);
    }

    for (const [teacherId, lessonIds] of byTeacher) {
      const [{ data: tch }, { data: kids }, { data: les }] = await Promise.all([
        admin.from("teachers").select("full_name, class_label").eq("id", teacherId).maybeSingle(),
        admin.from("students").select("id, full_name, parent_phone, parent_phone_2, school_id").eq("teacher_id", teacherId),
        admin.from("lessons").select("id, title").in("id", lessonIds),
      ]);
      if (!kids?.length) continue;
      const kidIds = kids.map((k) => k.id);

      // Jour de quiz ? Un seul résultat saisi aujourd'hui pour la classe suffit.
      const [{ count: n1 }, { count: n2 }] = await Promise.all([
        admin.from("daily_results").select("id", { count: "exact", head: true }).eq("result_date", until).in("student_id", kidIds),
        admin.from("daily_results").select("id", { count: "exact", head: true }).eq("result_date", until).eq("teacher_id", teacherId),
      ]);
      if ((n1 || 0) + (n2 || 0) > 0) { R.quiz_day++; continue; }

      const titles = lessonIds.map((id) => (les || []).find((l) => l.id === id)?.title).filter(Boolean) as string[];
      if (!titles.length) continue;
      R.teachers++;

      const [{ data: done }, { data: pars }, { data: cons, error: cErr }] = await Promise.all([
        admin.from("revision_reminders").select("student_id").eq("reminder_date", until).in("student_id", kidIds),
        admin.from("parents").select("id, student_id, phone").in("student_id", kidIds),
        admin.from("parent_consents").select("student_id, whatsapp_optin").in("student_id", kidIds),
      ]);
      const doneSet = new Set((done || []).map((d) => d.student_id));
      const consentOn = !cErr;
      const opted = new Set((cons || []).filter((c) => c.whatsapp_optin).map((c) => c.student_id));

      const classe = (tch?.class_label || "").trim();
      // Un bouton PAR leçon (« 113,350,207 », lu par la messagerie depuis le
      // 2026-10-20). Avec un seul bouton — la dernière leçon —, le soir du
      // 2026-10-19, les parents n'avaient ouvert presque que celle-là.
      const lienLecons = lessonIds.join(",");
      const subject = "Révisons ensemble les leçons d'aujourd'hui";
      const messageBody =
        `Bonjour, aujourd'hui ${classe ? `en ${classe}` : "en classe"}, ${nomEnseignant(tch?.full_name || "")} a enseigné :\n` +
        titles.map((t) => `• ${t}`).join("\n") +
        `\n\nIl n'y a pas eu de quiz aujourd'hui. Prenez 15 minutes ce soir : ouvrez une leçon avec votre enfant dans EduCam et demandez-lui de vous l'expliquer avec ses mots.` +
        (titles.length > 1 ? `\n\nChaque leçon s'ouvre avec les boutons ci-dessous.` : "");

      for (const kid of kids) {
        if (doneSet.has(kid.id)) continue;
        R.families++;
        if (dryRun) continue;

        // 1. On RÉSERVE le rappel d'abord : si deux passages se croisent, un
        //    seul obtient la ligne et l'autre s'arrête — jamais deux messages.
        const messageId = crypto.randomUUID();
        const { error: claimErr } = await admin.from("revision_reminders").insert({
          student_id: kid.id, reminder_date: until, lesson_ids: lessonIds, message_id: messageId,
        });
        if (claimErr) continue;

        // 2. Le message dans l'application.
        const kidParents = (pars || []).filter((p) => p.student_id === kid.id);
        const { error: mErr } = await admin.from("messages").insert({
          id: messageId,
          school_id: kid.school_id || null,
          sender_id: null,                      // envoyé par la plateforme, au nom de l'école
          audience: "parent",
          recipient_id: kidParents[0]?.id || null,
          student_id: kid.id,
          subject,
          body: messageBody,
          link_url: lienLecons,                 // « 113 » → un bouton ; « 113,350 » → un bouton par leçon
          created_at: new Date().toISOString(),
        });
        if (mErr) {
          // Pas de message : on libère la réservation pour que le prochain
          // passage réessaie, plutôt que de laisser cette famille sans rien.
          await admin.from("revision_reminders").delete().eq("student_id", kid.id).eq("reminder_date", until);
          continue;
        }
        R.created++;

        // 3. La notification WhatsApp — même modèle, mêmes règles que l'alerte.
        if (!TOKEN || !PHONE_ID) continue;
        const numbers = phonesOf(kid, kidParents.map((p) => p.phone));
        const logRow = {
          school_id: kid.school_id, student_id: kid.id, message_id: messageId,
          to_phone: numbers[0] || null, kind: "revision", template: TEMPLATE,
        };
        if (!numbers.length) {
          await admin.from("whatsapp_notifications").insert({ ...logRow, status: "skipped", error: "no_parent_phone" });
          R.skipped++; continue;
        }
        if (consentOn && !opted.has(kid.id)) {
          await admin.from("whatsapp_notifications").insert({ ...logRow, status: "skipped", error: "no_consent" });
          R.skipped++; continue;
        }
        const childName = kid.full_name || "votre enfant";
        let anySent = false;
        for (const to of numbers) {          // un envoi après l'autre, jamais en rafale
          const row = { ...logRow, to_phone: to };
          try {
            const resp = await fetch(`https://graph.facebook.com/${API_VERSION}/${PHONE_ID}/messages`, {
              method: "POST",
              headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                messaging_product: "whatsapp", to: digits(to), type: "template",
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
              await admin.from("whatsapp_notifications").insert({ ...row, status: "failed", error: result?.error?.message || `http_${resp.status}` });
              continue;
            }
            await admin.from("whatsapp_notifications").insert({ ...row, status: "sent", provider_message_id: result?.messages?.[0]?.id || null });
            anySent = true; R.pushed++;
          } catch (e) {
            await admin.from("whatsapp_notifications").insert({ ...row, status: "failed", error: String(e) });
          }
        }
        if (anySent) {
          await admin.from("revision_reminders").update({ pushed: true }).eq("student_id", kid.id).eq("reminder_date", until);
        }
      }
    }
  }

  return json({ ok: !A.error && !R.error, since, until, dryRun, alerts: A, revision: R });
});
