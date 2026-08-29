"use client";
// EduCam — Activité de la plateforme.
//
// Deux lentilles sur `activity_log` : ENSEIGNANTS (la plateforme est-elle
// vraiment utilisée, ou « marquée enseignée » sans l'être ?) et PARENTS (qui ne
// se connecte jamais / n'ouvre aucun message / ne révise pas → la liste de
// relance). Plus un JOURNAL brut, désormais paginé côté serveur.
// Rendu seulement si PROFILES_ENABLED et (isAdmin || isSchoolAdmin).
//
// Refonte (audit §7) : synthèse graphique en tête, filtres, et surtout la
// PAGINATION — l'écran chargeait jusqu'à 2 000 lignes côté client. Le calcul des
// statistiques reste borné (comme le tableau de bord directeur, faute d'agrégat
// Supabase), mais le journal ne tire plus qu'une page à la fois.

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { COLORS, FONT } from "../lib/theme";
import { Card, CardLabel, Badge, Button, EmptyState, SkeletonRows, StatTile } from "../components/ui";
import { SelectField, Field } from "../components/forms";
import { Histogram, BarList, fr } from "../components/charts";
import { useToasts } from "../components/overlays";

const EVENT_LABEL = {
  login: "Connexion", lesson_open: "Leçon ouverte", projector: "Mode projecteur",
  mark_taught: "Marquée enseignée", unmark_taught: "Démarquée", results_entered: "Résultats saisis",
  feedback: "Commentaire", message_read: "Message lu",
};
const STATS_CAP = 4000;   // plafond explicite pour les agrégats (pas de lecture illimitée)
const PAGE = 30;          // taille de page du journal

const fmtDate = (s) => (s ? String(s).slice(0, 10) : "—");
const fmtDateTime = (s) => (s ? String(s).slice(0, 16).replace("T", " ") : "—");
const dm = (iso) => { const [, m, d] = String(iso || "").split("-"); return d && m ? `${d}/${m}` : iso; };

export default function ActivityLog({ school, isAdmin, onBack }) {
  const { pushToast, ToastViewport } = useToasts();
  const [tab, setTab] = useState("teachers"); // teachers | parents | journal
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Filtres
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  // Journal (pagination serveur, indépendante des agrégats)
  const [jEvent, setJEvent] = useState("all");
  const [jRole, setJRole] = useState("all");
  // Plage de dates : bornes INCLUSIVES côté écran. `created_at` est un
  // timestamp, donc la borne haute est envoyée en « fin de journée » — sans
  // quoi filtrer « jusqu'au 12 août » exclurait tout le 12 août.
  const [jFrom, setJFrom] = useState("");
  const [jTo, setJTo] = useState("");
  const [jExporting, setJExporting] = useState(false);
  const [jPage, setJPage] = useState(0);
  const [jRows, setJRows] = useState([]);
  const [jCount, setJCount] = useState(0);
  const [jLoading, setJLoading] = useState(false);
  const [nameMap, setNameMap] = useState({});

  useEffect(() => { loadData(); /* eslint-disable-next-line */ }, [school?.id, isAdmin]);
  useEffect(() => { if (tab === "journal") loadJournal(); /* eslint-disable-next-line */ }, [tab, jEvent, jRole, jFrom, jTo, jPage, school?.id, isAdmin]);
  useEffect(() => { setJPage(0); }, [jEvent, jRole, jFrom, jTo]);

  const scoped = (q) => (!isAdmin && school?.id ? q.eq("school_id", school.id) : q);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: teachers }, { data: students }] = await Promise.all([
        scoped(supabase.from("teachers").select("id, full_name, role")),
        scoped(supabase.from("students").select("id, full_name, teacher_id")),
      ]);
      const teacherList = (teachers || []).filter((t) => t.role !== "admin");
      const studentName = Object.fromEntries((students || []).map((s) => [s.id, s.full_name]));
      const studentIds = (students || []).map((s) => s.id);

      let parentsData = [];
      if (studentIds.length) {
        const { data: p } = await supabase.from("parents").select("id, student_id").in("student_id", studentIds);
        parentsData = p || [];
      }

      const [{ data: acts }, { data: msgs }] = await Promise.all([
        scoped(supabase.from("activity_log").select("actor_id, actor_role, event_type, detail, created_at").order("created_at", { ascending: false }).limit(STATS_CAP)),
        scoped(supabase.from("messages").select("recipient_id, read_at")),
      ]);

      const byActor = {};
      (acts || []).forEach((a) => {
        const x = (byActor[a.actor_id] = byActor[a.actor_id] || { events: [], counts: {}, last: null });
        x.events.push(a);
        x.counts[a.event_type] = (x.counts[a.event_type] || 0) + 1;
        if (!x.last || a.created_at > x.last) x.last = a.created_at;
      });

      const teacherStats = teacherList.map((t) => {
        const x = byActor[t.id] || { counts: {}, last: null, events: [] };
        const c = x.counts;
        const taught = c.mark_taught || 0, opened = c.lesson_open || 0, proj = c.projector || 0, results = c.results_entered || 0, fb = c.feedback || 0;
        let oddHour = false;
        (x.events || []).forEach((e) => {
          if (e.event_type === "mark_taught" || e.event_type === "lesson_open") {
            const h = new Date(e.created_at).getHours();
            if (h < 6 || h >= 21) oddHour = true;
          }
        });
        const flags = [];
        if (!x.last) flags.push("Jamais actif");
        if (taught > 0 && opened === 0) flags.push("Marque enseigné sans ouvrir");
        if (taught > 0 && results === 0) flags.push("Enseigne sans saisir de résultats");
        if (oddHour) flags.push("Heure inhabituelle");
        return { id: t.id, name: t.full_name || "Enseignant", taught, opened, proj, results, fb, last: x.last, flags };
      }).sort((a, b) => b.flags.length - a.flags.length || (b.last || "").localeCompare(a.last || ""));

      const now = Date.now();
      const parentStats = parentsData.map((p) => {
        const x = byActor[p.id] || { counts: {}, last: null };
        const opened = x.counts.lesson_open || 0;
        const logins = x.counts.login || 0;
        const mine = (msgs || []).filter((m) => m.recipient_id === p.id);
        const unread = mine.filter((m) => !m.read_at).length;
        const daysSince = x.last ? Math.floor((now - new Date(x.last).getTime()) / 86400000) : null;
        const flags = [];
        if (!x.last) flags.push("Jamais connecté");
        else if (daysSince >= 7) flags.push(`Inactif depuis ${daysSince} j`);
        if (unread > 0) flags.push(`${unread} non lu${unread > 1 ? "s" : ""}`);
        if (x.last && opened === 0) flags.push("Ne révise pas");
        return { id: p.id, child: studentName[p.student_id] || "Élève", opened, logins, unread, total: mine.length, last: x.last, flags };
      }).sort((a, b) => b.flags.length - a.flags.length || (b.last || "").localeCompare(a.last || ""));

      const nm = {};
      teacherList.forEach((t) => { nm[t.id] = t.full_name || "Enseignant"; });
      parentsData.forEach((p) => { nm[p.id] = `Parent · ${studentName[p.student_id] || "élève"}`; });
      setNameMap(nm);

      // Activité par jour sur 14 jours (pour la synthèse).
      const dayCounts = new Map();
      (acts || []).forEach((a) => {
        const k = fmtDate(a.created_at);
        if (k !== "—") dayCounts.set(k, (dayCounts.get(k) || 0) + 1);
      });
      const days = [];
      const base = new Date();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(base.getTime() - i * 86400000);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        days.push({ label: String(d.getDate()), full: dm(key), count: dayCounts.get(key) || 0 });
      }

      // Répartition par type d'action : déjà dans `acts`, aucun coût de plus.
      const evCount = new Map();
      (acts || []).forEach((a) => evCount.set(a.event_type, (evCount.get(a.event_type) || 0) + 1));
      const byEvent = [...evCount.entries()]
        .map(([k, v]) => ({ label: EVENT_LABEL[k] || k, value: v }))
        .sort((a, b) => b.value - a.value).slice(0, 6);

      setData({
        teacherStats, parentStats, days, byEvent,
        totalEvents: (acts || []).length,
        cappedStats: (acts || []).length >= STATS_CAP,
        followUp: parentStats.filter((p) => p.flags.length > 0).length,
        flaggedTeachers: teacherStats.filter((t) => t.flags.length > 0).length,
      });
    } catch (_) {
      pushToast("Impossible de charger l'activité. Vérifiez votre connexion.", "error");
    }
    setLoading(false);
  };

  /** Filtres du journal — une seule définition, partagée par l'écran et l'export. */
  const journalQuery = (select, opts) => {
    let q = scoped(supabase.from("activity_log")
      .select(select, opts)
      .order("created_at", { ascending: false }));
    if (jEvent !== "all") q = q.eq("event_type", jEvent);
    if (jRole !== "all") q = q.eq("actor_role", jRole);
    if (jFrom) q = q.gte("created_at", `${jFrom}T00:00:00`);
    if (jTo) q = q.lte("created_at", `${jTo}T23:59:59.999`);
    return q;
  };

  const loadJournal = async () => {
    setJLoading(true);
    try {
      const q = journalQuery("actor_id, actor_role, event_type, detail, created_at", { count: "exact" });
      const from = jPage * PAGE;
      const { data: rows, count } = await q.range(from, from + PAGE - 1);
      setJRows(rows || []);
      setJCount(count || 0);
    } catch (_) {
      pushToast("Impossible de charger le journal.", "error");
    }
    setJLoading(false);
  };

  /**
   * Export CSV du journal filtré. Plafonné à 5 000 lignes : au-delà, la requête
   * et le fichier deviennent hostiles, et l'analyse se fait de toute façon
   * mieux directement en SQL. Le plafond est ANNONCÉ à l'écran quand il mord —
   * un export tronqué en silence se lit comme un export complet.
   */
  const EXPORT_CAP = 5000;
  const exportCsv = async () => {
    setJExporting(true);
    try {
      const { data: rows } = await journalQuery(
        "actor_id, actor_role, event_type, detail, created_at, school_id"
      ).range(0, EXPORT_CAP - 1);
      const list = rows || [];
      // Guillemets doublés : un détail contenant « ; » ou un guillemet ne doit
      // pas casser la colonne à l'ouverture dans un tableur.
      const esc = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
      const head = ["horodatage", "acteur", "role", "action", "detail", "ecole"];
      const body = list.map((r) => [
        r.created_at,
        nameMap[r.actor_id] || r.actor_id || "",
        r.actor_role || "",
        EVENT_LABEL[r.event_type] || r.event_type || "",
        r.detail || "",
        r.school_id || "",
      ].map(esc).join(";"));
      // BOM : sans lui, Excel en français lit les accents de travers.
      const csv = "\uFEFF" + [head.map(esc).join(";"), ...body].join("\r\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `educam-journal-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      pushToast(
        list.length >= EXPORT_CAP
          ? `Export limité aux ${EXPORT_CAP.toLocaleString("fr-FR")} lignes les plus récentes.`
          : `${list.length.toLocaleString("fr-FR")} ligne${list.length > 1 ? "s" : ""} exportée${list.length > 1 ? "s" : ""}.`,
        list.length >= EXPORT_CAP ? "info" : "success"   // « warn » n'existe pas dans TONES
      );
    } catch (_) {
      pushToast("Export impossible. Réessayez.", "error");
    }
    setJExporting(false);
  };

  const Stat = ({ label, n }) => (
    <span style={{ fontSize: FONT.sm, color: COLORS.ink3 }}>
      <b style={{ color: COLORS.ink, fontVariantNumeric: "tabular-nums" }}>{n}</b> {label}
    </span>
  );

  const flags = (arr) => (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
      {arr.map((f, i) => <Badge key={i} tone="crit">{f}</Badge>)}
    </div>
  );

  const backLink = (
    <button onClick={onBack} className="ec-link"
      style={{ minHeight: 40, marginBottom: 14, textDecoration: "none", color: COLORS.ink2 }}>
      ‹ Retour
    </button>
  );

  const totalPages = Math.max(1, Math.ceil(jCount / PAGE));

  return (
    <div>
      {backLink}
      <h1 className="ec-h1">Activité de la plateforme</h1>
      <p className="ec-sub">{isAdmin ? "Toutes les écoles" : (school?.name || "votre école")}</p>

      {loading || !data ? (
        <div style={{ marginTop: 20 }}><SkeletonRows rows={5} /></div>
      ) : (
        <>
          {/* ---- Synthèse ---- */}
          <div className="ec-grid" style={{ marginTop: 18 }}>
          <div className="ec-c12">
           <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 18 }}>
            <StatTile label="Événements récents" value={data.totalEvents} />
            <StatTile label="Enseignants à vérifier" value={data.flaggedTeachers} />
            <StatTile label="Parents à relancer" value={data.followUp} />
           </div>
          </div>

          {data.days.some((d) => d.count > 0) && (
            <Card className="ec-c7">
              <h2 className="ec-cardtitle">Activité des 14 derniers jours</h2>
              <p style={{ fontSize: FONT.sm, color: COLORS.ink3, margin: "4px 0 12px" }}>Nombre d'actions par jour.</p>
              <Histogram
                bins={data.days.map((d) => ({ label: d.label, count: d.count }))}
                label={"Activité par jour : " + data.days.map((d) => `${d.full} ${d.count}`).join(", ")}
              />
            </Card>
          )}

          {data.byEvent?.length > 0 && (
            <Card className="ec-c5">
              <h2 className="ec-cardtitle">Répartition des actions</h2>
              <p style={{ fontSize: FONT.sm, color: COLORS.ink3, margin: "4px 0 15px" }}>
                Les six actions les plus fréquentes sur la période lue.
              </p>
              <BarList items={data.byEvent} max={Math.max(...data.byEvent.map((e) => e.value))} />
            </Card>
          )}

          {/* ---- Onglets ---- */}
          <div className="ec-c12">
          <div style={{ margin: "4px 0 14px", display: "flex", gap: 6, background: COLORS.track, borderRadius: 999, padding: 4, maxWidth: 460 }} role="tablist" aria-label="Lentille d'activité">
            {[["teachers", "Enseignants"], ["parents", "Parents"], ["journal", "Journal"]].map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} style={{
                flex: 1, minHeight: 40, padding: "8px 10px", borderRadius: 999, border: 0, fontSize: FONT.sm, fontWeight: 700,
                background: tab === id ? COLORS.card : "transparent", color: tab === id ? COLORS.g700 : COLORS.ink2,
                boxShadow: tab === id ? COLORS.shadow : "none",
              }}>{label}</button>
            ))}
          </div>

          {tab === "teachers" ? (
            <>
              <p style={{ color: COLORS.ink2, fontSize: FONT.md, margin: "0 0 12px", lineHeight: 1.5 }}>
                {data.flaggedTeachers > 0 ? `${data.flaggedTeachers} enseignant${data.flaggedTeachers > 1 ? "s" : ""} à vérifier.` : "Aucun signal suspect."}{" "}
                Les alertes repèrent les leçons marquées enseignées sans être ouvertes, sans résultats, ou à des heures inhabituelles.
              </p>
              <FilterToggle on={flaggedOnly} setOn={setFlaggedOnly} label="Signalés seulement" />
              {(() => {
                const list = flaggedOnly ? data.teacherStats.filter((t) => t.flags.length) : data.teacherStats;
                if (!list.length) return <Card><EmptyState icon="🧑‍🏫" title="Aucun enseignant à afficher" /></Card>;
                return (
                  <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(430px, 1fr))" }}>
                    {list.map((t) => (
                      <Card key={t.id} style={{ borderLeft: `3px solid ${t.flags.length ? COLORS.crit : COLORS.g300}` }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ fontSize: "var(--ec-fs-4)", fontWeight: 700, color: COLORS.ink }}>{t.name}</div>
                          <div style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3 }}>actif {fmtDate(t.last)}</div>
                        </div>
                        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8 }}>
                          <Stat label="enseignées" n={t.taught} /><Stat label="ouvertes" n={t.opened} />
                          <Stat label="projecteur" n={t.proj} /><Stat label="résultats" n={t.results} />
                          <Stat label="commentaires" n={t.fb} />
                        </div>
                        {t.flags.length > 0 && flags(t.flags)}
                      </Card>
                    ))}
                  </div>
                );
              })()}
            </>
          ) : tab === "parents" ? (
            <>
              <p style={{ color: COLORS.ink2, fontSize: FONT.md, margin: "0 0 12px", lineHeight: 1.5 }}>
                {data.followUp > 0 ? `${data.followUp} parent${data.followUp > 1 ? "s" : ""} à relancer.` : "Tous les parents suivent."}{" "}
                Repère qui ne s'est jamais connecté, a des messages non lus, ou n'ouvre aucune leçon.
              </p>
              <FilterToggle on={flaggedOnly} setOn={setFlaggedOnly} label="À relancer seulement" />
              {(() => {
                const list = flaggedOnly ? data.parentStats.filter((p) => p.flags.length) : data.parentStats;
                if (!list.length) return <Card><EmptyState icon="👪" title="Aucun parent à afficher" /></Card>;
                return (
                  <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(430px, 1fr))" }}>
                    {list.map((p) => (
                      <Card key={p.id} style={{ borderLeft: `3px solid ${p.flags.length ? COLORS.crit : COLORS.g300}` }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ fontSize: "var(--ec-fs-4)", fontWeight: 700, color: COLORS.ink }}>Parent de {p.child}</div>
                          <div style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3 }}>{p.last ? `connecté ${fmtDate(p.last)}` : "jamais connecté"}</div>
                        </div>
                        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8 }}>
                          <Stat label="connexions" n={p.logins} /><Stat label="leçons ouvertes" n={p.opened} />
                          <Stat label="non lus" n={p.unread} /><Stat label="reçus" n={p.total} />
                        </div>
                        {p.flags.length > 0 && flags(p.flags)}
                      </Card>
                    ))}
                  </div>
                );
              })()}
            </>
          ) : (
            <>
              <div className="ec-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                <SelectField label="Type d'action" value={jEvent} onChange={(e) => setJEvent(e.target.value)}>
                  <option value="all">Toutes les actions</option>
                  {Object.entries(EVENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </SelectField>
                <SelectField label="Rôle" value={jRole} onChange={(e) => setJRole(e.target.value)}>
                  <option value="all">Tous les rôles</option>
                  <option value="teacher">Enseignants</option>
                  <option value="parent">Parents</option>
                  <option value="school_admin">Direction</option>
                </SelectField>
                <Field label="Depuis le" type="date" value={jFrom} onChange={(e) => setJFrom(e.target.value)} />
                <Field label="Jusqu'au" type="date" value={jTo} onChange={(e) => setJTo(e.target.value)} />
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", margin: "12px 0" }}>
                <Button variant="ghost" size="sm" onClick={exportCsv} disabled={jExporting || jCount === 0}>
                  {jExporting ? "Export en cours…" : "Exporter en CSV"}
                </Button>
                {(jFrom || jTo || jEvent !== "all" || jRole !== "all") && (
                  <Button variant="ghost" size="sm"
                    onClick={() => { setJEvent("all"); setJRole("all"); setJFrom(""); setJTo(""); }}>
                    Effacer les filtres
                  </Button>
                )}
                <span style={{ fontSize: FONT.sm, color: COLORS.ink3 }}>
                  L'export reprend exactement les filtres ci-dessus.
                </span>
              </div>

              {jLoading ? (
                <SkeletonRows rows={5} />
              ) : jRows.length === 0 ? (
                <Card><EmptyState icon="📋" title="Aucune action" >Aucune action ne correspond à ce filtre.</EmptyState></Card>
              ) : (
                <>
                  <div style={{ display: "grid", gap: 6 }}>
                    {jRows.map((a, i) => (
                      <div key={i} className="ec-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 12px" }}>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontSize: FONT.md, fontWeight: 700, color: COLORS.ink }}>
                            {nameMap[a.actor_id] || (a.actor_role || "Utilisateur")}
                          </span>
                          <span style={{ fontSize: FONT.md, color: COLORS.ink2 }}>
                            {" · "}{EVENT_LABEL[a.event_type] || a.event_type}{a.detail ? ` (${a.detail})` : ""}
                          </span>
                        </div>
                        <span style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                          {fmtDateTime(a.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 14 }}>
                    <Button variant="ghost" size="sm" disabled={jPage === 0} onClick={() => setJPage((p) => Math.max(0, p - 1))}>
                      ‹ Précédent
                    </Button>
                    <span aria-live="polite" style={{ fontSize: FONT.sm, color: COLORS.ink2, fontWeight: 600 }}>
                      {jCount === 0 ? "0" : `${jPage * PAGE + 1}–${Math.min(jCount, (jPage + 1) * PAGE)}`} sur {jCount.toLocaleString("fr-FR")}
                    </span>
                    <Button variant="ghost" size="sm" disabled={jPage >= totalPages - 1} onClick={() => setJPage((p) => p + 1)}>
                      Suivant ›
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
          </div>

          {data.cappedStats && (
            <p className="ec-c12" style={{ fontSize: "var(--ec-fs-2)", color: COLORS.ink3, lineHeight: 1.6 }}>
              Les statistiques par enseignant et par parent sont calculées sur les {STATS_CAP.toLocaleString("fr-FR")} actions
              les plus récentes (plafond). Le journal ci-dessus, lui, est paginé et couvre tout l'historique.
            </p>
          )}
          </div>
        </>
      )}
      <ToastViewport />
    </div>
  );
}

/* Petit interrupteur de filtre accessible (case à cocher stylée). */
function FilterToggle({ on, setOn, label }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", minHeight: 40, marginBottom: 12, fontSize: FONT.md, color: COLORS.ink2, fontWeight: 600 }}>
      <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} style={{ width: 18, height: 18, accentColor: COLORS.g500 }} />
      {label}
    </label>
  );
}
