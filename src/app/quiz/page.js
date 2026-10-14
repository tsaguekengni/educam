"use client";
/* ══════════════════════════════════════════════════════════════════════════
 * PAGE D'IMPRESSION DES QUIZ DE LEÇON — étape 1, 2026-10-14.
 *
 * Appelée depuis l'emploi du temps : /quiz?classe=<uuid>&date=AAAA-MM-JJ&lecons=1,2,3
 *
 * Ce qu'elle fait, et RIEN d'autre : elle lit la banque (`quiz_questions`) et
 * la liste de classe, puis compose des feuilles A4 portant deux demi-feuilles
 * A5 chacune, plus une feuille de correction par leçon. Le PDF est fait par le
 * NAVIGATEUR (Imprimer → Enregistrer en PDF) : aucun service à héberger.
 *
 * 🔴 Elle ne décide PAS quelles leçons sont au programme du jour. C'est
 * l'emploi du temps qui le sait et qui passe les identifiants dans l'URL.
 * Dupliquer ici la résolution « créneau → leçon » produirait tôt ou tard deux
 * écrans qui se contredisent.
 *
 * ⚠️ DEUX PIÈGES DE MISE EN PAGE, PAYÉS LE 2026-10-13 — ne pas les rouvrir :
 *  1. Une colonne flex COMPRESSE ses enfants en silence quand le contenu
 *     dépasse : à l'écran tout paraît normal, et c'est à l'impression que le
 *     bas des questions disparaît. D'où `flex: 1 0 auto` sur la liste et
 *     `flex-shrink: 0` sur chaque <li>. (`scrollHeight` ne voit pas ce défaut.)
 *  2. La ligne de réponse pointillée se collait au filet du pied de page et
 *     devenait invisible : l'élève n'avait nulle part où écrire. D'où le
 *     `margin-top` du pied.
 * ══════════════════════════════════════════════════════════════════════════ */
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const VERSIONS = ["A", "B", "C", "D", "E"];

/* Les libellés de matière vivent dans le code (il n'y a pas de table
   `subjects`). Même liste que l'emploi du temps. */
const MATIERES = {
  francais: "Français", maths: "Mathématiques", sciences: "Sciences",
  english: "English", shs: "SHS", tic: "TIC", langues: "Langues nationales",
  arts: "Éducation artistique", eps: "EPS", devperso: "Développement personnel",
};

const CSS = `
@page { size: A4 portrait; margin: 0; }
.qz * { box-sizing: border-box; }
.qz { font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 10.5pt; line-height: 1.32; }
.qz .feuille { width: 210mm; height: 297mm; position: relative; overflow: hidden;
               background: #fff; margin: 0 auto 6mm; box-shadow: 0 0 0 1px #ddd; }
.qz .coupe { position: absolute; left: 0; right: 0; top: 148.5mm; border-top: 1px dashed #777; }
.qz .coupe span { position: absolute; right: 3mm; top: -3.4mm; font-size: 7pt; color: #777;
                  background: #fff; padding: 0 1.5mm; }
.qz .a5 { height: 148.5mm; padding: 6.4mm 9mm 4.6mm; display: flex; flex-direction: column; }
.qz .tete { border-bottom: 1.6pt solid #000; padding-bottom: 1.4mm; margin-bottom: 2.2mm; }
.qz .l1 { display: flex; justify-content: space-between; align-items: baseline;
          font-size: 7.4pt; letter-spacing: .09em; text-transform: uppercase; }
.qz .ver { border: 1.2pt solid #000; padding: .3mm 2mm; font-size: 8.6pt; font-weight: bold; letter-spacing: .06em; }
.qz .l2 { font-size: 11.8pt; font-weight: bold; margin-top: 1mm; line-height: 1.15; }
.qz .l3 { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 1.6mm; font-size: 9.4pt; }
.qz .nom { font-weight: bold; font-size: 10.2pt; max-width: 118mm; line-height: 1.2; }
.qz .nom small { display: block; font-weight: normal; font-size: 7.2pt; letter-spacing: .08em; text-transform: uppercase; }
.qz .note { border: 1.6pt solid #000; padding: .9mm 2.8mm; font-size: 10.6pt; font-weight: bold; white-space: nowrap; }
.qz ol.qs { list-style: none; margin: 0; padding: 0; flex: 1 0 auto;
            display: flex; flex-direction: column; justify-content: space-between; }
.qz ol.qs > li { flex-shrink: 0; }
.qz ol.qs.fixe { flex: 0 0 auto; display: block; }
.qz ol.qs.fixe > li + li { margin-top: 2.4mm; }
.qz .q { display: flex; gap: 2.2mm; }
.qz .n { font-weight: bold; min-width: 5mm; }
.qz .ligne { border-bottom: .9pt dotted #444; height: 4.9mm; margin: .8mm 0 0 7.2mm; }
.qz .calc { margin: 1mm 0 0 7.2mm; font-size: 9.4pt; }
.qz .perso { border-top: .9pt solid #000; margin: 2.4mm 0 2mm; padding-top: 1.6mm;
             font-size: 7.4pt; letter-spacing: .09em; text-transform: uppercase; font-weight: bold; }
.qz .pied { border-top: .9pt solid #777; margin-top: 1.8mm; padding-top: 1mm; font-size: 7.2pt;
            color: #333; display: flex; justify-content: space-between; }
.qz .corr { padding: 10mm 12mm 7mm; height: 297mm; display: flex; flex-direction: column; }
.qz .corr h1 { font-size: 13.4pt; margin: 0 0 .8mm; }
.qz .corr .sous { font-size: 8.4pt; color: #333; margin: 0 0 2.6mm; }
.qz .cles { border: 1.4pt solid #000; padding: 2.2mm 3.2mm; margin-bottom: 2.6mm; }
.qz .cles h2 { font-size: 8.2pt; letter-spacing: .09em; text-transform: uppercase; margin: 0 0 1.2mm; }
.qz .cles table { width: 100%; border-collapse: collapse; font-size: 8.6pt; }
.qz .cles td { padding: .5mm 0; vertical-align: top; }
.qz .cles td.k { width: 23mm; font-weight: bold; }
.qz .vtab { width: 100%; border-collapse: collapse; font-size: 8.4pt; margin-top: 1.2mm; }
.qz .vtab th, .qz .vtab td { border: .7pt solid #000; padding: 1mm 1.6mm; text-align: left; vertical-align: top; }
.qz .vtab th { background: #EDEDED; font-size: 7.6pt; letter-spacing: .06em; text-transform: uppercase; }
.qz .vtab td.v { width: 13mm; font-weight: bold; text-align: center; }
.qz table.liste { width: 100%; border-collapse: collapse; font-size: 8.4pt; }
.qz table.liste th { background: #000; color: #fff; font-size: 7pt; letter-spacing: .06em;
                     text-transform: uppercase; padding: 1.2mm 1.4mm; text-align: left; }
.qz table.liste td { border-bottom: .7pt solid #999; padding: 1.25mm 1.4mm; }
.qz table.liste td.c { text-align: center; }
.qz table.liste tr:nth-child(even) td { background: #F2F2F2; }
.qz .boite { display: inline-block; width: 9mm; height: 4mm; border: .9pt solid #000; }
.qz .remarque { margin-top: 2.6mm; font-size: 7.8pt; color: #222; border-left: 2.4pt solid #000; padding-left: 3mm; }
.qz .garde { padding: 12mm 13mm 8mm; height: 297mm; display: flex; flex-direction: column; }
.qz .garde h1 { font-size: 17pt; margin: 0 0 1.2mm; line-height: 1.12; }
.qz .garde .st { font-size: 9pt; color: #333; margin: 0 0 3mm; }
.qz .garde h2 { font-size: 8.4pt; letter-spacing: .1em; text-transform: uppercase;
                margin: 3.4mm 0 1.4mm; border-bottom: 1.4pt solid #000; padding-bottom: .8mm; }
.qz .garde p, .qz .garde li { font-size: 8.6pt; line-height: 1.34; margin: 0 0 1.4mm; }
.qz .garde ol.mode { margin: 0; padding-left: 5mm; }
.qz .garde ol.mode li { margin-bottom: .9mm; }
.qz table.som { width: 100%; border-collapse: collapse; font-size: 7.8pt; }
.qz table.som th { background: #000; color: #fff; font-size: 6.8pt; letter-spacing: .06em;
                   text-transform: uppercase; padding: 1mm 1.4mm; text-align: left; }
.qz table.som td { border-bottom: .7pt solid #999; padding: .95mm 1.4mm; }
.qz table.som td.c { text-align: center; }
.qz table.som tr:nth-child(even) td { background: #F2F2F2; }
.qz .encadre { border: 1.4pt solid #000; padding: 2.2mm 3mm; margin-top: 2.4mm; font-size: 8.2pt; line-height: 1.34; }
/* La barre de commande n'existe qu'à l'écran. */
.ecran { max-width: 210mm; margin: 0 auto 10px; padding: 12px 14px; font-family: Arial, Helvetica, sans-serif; }
@media print {
  .ecran { display: none !important; }
  .qz .feuille { box-shadow: none; margin: 0; }
  /* La feuille de style globale peint le fond de page en crème : sans cette
     règle, les pages sortent teintées et vident une cartouche pour rien.
     ⚠️ Pas d'accent grave dans ce bloc : il refermerait le gabarit JS. */
  html, body { background: #fff !important; }
}
`;

/* Rotation A→E dans l'ordre de la liste : deux voisins n'ont jamais la même
   version. La moitié basse de la feuille est décalée d'un cran, sinon les deux
   A5 d'une même feuille portent la même version dès que la demi-classe est un
   multiple de 5 (20 élèves = 2 × 10). */
function versionDe(rang0, moitie, decalage) {
  return VERSIONS[(rang0 + decalage + (rang0 < moitie ? 0 : 1)) % 5];
}

/* Le décalage du lot vient de la DATE : deux journées différentes ne
   reforment pas les mêmes groupes, et réimprimer le même jour redonne
   exactement les mêmes copies. */
function decalageDuJour(dateIso) {
  const jours = Math.floor(Date.parse(dateIso + "T00:00:00Z") / 86400000);
  return Number.isFinite(jours) ? ((jours % 5) + 5) % 5 : 0;
}

function libelleDate(dateIso) {
  try {
    return new Date(dateIso + "T00:00:00").toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  } catch { return dateIso; }
}

export default function QuizImpression() {
  const [etat, setEtat] = useState("chargement");
  const [erreur, setErreur] = useState("");
  const [lot, setLot] = useState(null);

  useEffect(() => {
    let annule = false;

    async function charger() {
      try {
        /* On lit l'URL sans passer par le routeur : un seul point de contact
           avec le cadre, et aucune frontière Suspense à gérer. */
        const p = new URLSearchParams(window.location.search);
        const classeId = p.get("classe");
        const dateIso = p.get("date");
        const ids = (p.get("lecons") || "").split(",")
          .map((x) => parseInt(x, 10)).filter((x) => Number.isFinite(x));

        if (!classeId || !dateIso || ids.length === 0) {
          throw new Error("Lien incomplet : il faut une classe, une date et au moins une leçon.");
        }

        const [classeRes, elevesRes, leconsRes, questionsRes] = await Promise.all([
          supabase.from("teachers").select("id, full_name, level, school_id").eq("id", classeId).maybeSingle(),
          supabase.from("students").select("id, full_name").eq("teacher_id", classeId).order("full_name"),
          supabase.from("lessons").select("id, subject_id, component_id, unit_number, week_number, title").in("id", ids),
          supabase.from("quiz_questions")
            .select("lesson_id, slot, version, consigne, question, answer, lignes, pleine_ligne")
            .in("lesson_id", ids).eq("statut", "valide"),
        ]);

        const erreurs = [classeRes, elevesRes, leconsRes, questionsRes].map((r) => r.error).filter(Boolean);
        if (erreurs.length) throw erreurs[0];

        const eleves = elevesRes.data || [];
        if (eleves.length === 0) throw new Error("Cette classe n'a aucun élève inscrit.");

        let ecole = null;
        if (classeRes.data?.school_id) {
          const { data } = await supabase.from("schools").select("name")
            .eq("id", classeRes.data.school_id).maybeSingle();
          ecole = data?.name || null;
        }

        /* Une leçon n'entre dans le lot que si sa banque est COMPLÈTE :
           3 questions communes et 10 versions. Une banque à moitié écrite
           donnerait une copie trouée, découverte en classe. */
        const parLecon = new Map();
        for (const q of questionsRes.data || []) {
          if (!parLecon.has(q.lesson_id)) parLecon.set(q.lesson_id, []);
          parLecon.get(q.lesson_id).push(q);
        }

        const pretes = [];
        const incompletes = [];
        for (const id of ids) {
          const lecon = (leconsRes.data || []).find((l) => l.id === id);
          if (!lecon) continue;
          const qs = parLecon.get(id) || [];
          const communes = qs.filter((q) => q.slot <= 3).sort((a, b) => a.slot - b.slot);
          const q4 = qs.filter((q) => q.slot === 4);
          const q5 = qs.filter((q) => q.slot === 5);
          if (communes.length === 3 && q4.length === 5 && q5.length === 5) {
            const parVersion = (arr) => Object.fromEntries(arr.map((q) => [q.version, q]));
            pretes.push({ lecon, communes, q4: parVersion(q4), q5: parVersion(q5) });
          } else {
            incompletes.push({ lecon, nb: qs.length });
          }
        }

        if (pretes.length === 0) {
          throw new Error("Aucune des leçons de cette journée n'a encore sa banque de questions.");
        }

        if (!annule) {
          setLot({ classe: classeRes.data, ecole, dateIso, eleves, pretes, incompletes });
          setEtat("pret");
        }
      } catch (e) {
        if (!annule) { setErreur(e?.message || String(e)); setEtat("erreur"); }
      }
    }

    charger();
    return () => { annule = true; };
  }, []);

  if (etat === "chargement") {
    return <div className="ecran"><p>Préparation des quiz…</p></div>;
  }
  if (etat === "erreur") {
    return (
      <div className="ecran">
        <h1 style={{ fontSize: 18 }}>Quiz non préparés</h1>
        <p style={{ color: "#A83E1E" }}>{erreur}</p>
        <p style={{ fontSize: 13, color: "#555" }}>
          Revenez à l&apos;emploi du temps et relancez depuis le bouton « Préparer les quiz ».
        </p>
      </div>
    );
  }

  const { classe, ecole, dateIso, eleves, pretes, incompletes } = lot;
  const n = eleves.length;
  const moitie = Math.ceil(n / 2);
  const pagesParLecon = moitie + 1;
  const decalageLot = decalageDuJour(dateIso);

  const champReponse = (q, estMaths) => {
    if (q.pleine_ligne || (q.answer || "").length > 45) return <div className="ligne" />;
    if (estMaths) {
      return (
        <div className="calc">
          Calcul&nbsp;: .....................................................
          &nbsp;&nbsp;Réponse&nbsp;: ..................
        </div>
      );
    }
    return <div className="calc">Réponse&nbsp;: ................................................</div>;
  };

  const titreConsigne = (t) => (/[?!:]$/.test(t || "") ? t : (t || "") + ".");

  const blocA5 = (bloc, rang, eleve, version) => {
    const { lecon, communes, q4, q5 } = bloc;
    const estMaths = lecon.subject_id === "maths";
    const matiere = MATIERES[lecon.subject_id] || lecon.subject_id;
    const a = q4[version];
    const b = q5[version];
    return (
      <div className="a5">
        <div className="tete">
          <div className="l1">
            <span><b>EduCam</b> · {String(classe?.level || "").toUpperCase()} · Quiz de leçon</span>
            <span className="ver">Version {version}</span>
          </div>
          <div className="l2">{matiere} — {lecon.title}</div>
          <div className="l3">
            <span className="nom"><small>Nom de l&apos;élève — n° {rang}</small>{eleve.full_name}</span>
            <span className="note">Note : ........ / 5</span>
          </div>
          <div className="l3" style={{ marginTop: "1.2mm", fontSize: "8.4pt" }}>
            <span>Date : {libelleDate(dateIso)}</span>
            <span>1 point par question</span>
          </div>
        </div>

        <ol className="qs">
          {communes.map((q, i) => (
            <li key={q.slot}>
              <div className="q"><span className="n">{i + 1}.</span><span>{q.question}</span></div>
              {Array.from({ length: q.lignes || 0 }).map((_, j) => <div key={j} className="ligne" />)}
            </li>
          ))}
        </ol>

        <div className="perso">Tes deux questions — version {version}</div>
        <ol className="qs fixe">
          <li>
            <div className="q"><span className="n">4.</span>
              <span><b>{titreConsigne(a.consigne)}</b> {a.question}</span></div>
            {champReponse(a, estMaths)}
          </li>
          <li>
            <div className="q"><span className="n">5.</span>
              <span><b>{titreConsigne(b.consigne)}</b> {b.question}</span></div>
            {champReponse(b, estMaths)}
          </li>
        </ol>

        <div className="pied">
          <span>Revois cette leçon : educam.academiemansamusa.com</span>
          <span>leçon {lecon.id}</span>
        </div>
      </div>
    );
  };

  const pageCorrection = (bloc, decalage) => {
    const { lecon, communes, q4, q5 } = bloc;
    const matiere = MATIERES[lecon.subject_id] || lecon.subject_id;
    return (
      <div className="feuille" key={"c" + lecon.id}>
        <div className="corr">
          <h1>Correction — {matiere} : {lecon.title}</h1>
          <p className="sous">
            {String(classe?.level || "").toUpperCase()} · {classe?.full_name} · {n} élèves ·
            {" "}leçon {lecon.id} · {libelleDate(dateIso)}
          </p>

          <div className="cles">
            <h2>Temps 1 — à lire à voix haute en classe (questions communes)</h2>
            <table><tbody>
              {communes.map((q, i) => (
                <tr key={q.slot}>
                  <td className="k">Question {i + 1}</td>
                  <td><b>{q.answer}</b></td>
                </tr>
              ))}
            </tbody></table>
            <h2 style={{ marginTop: "2.6mm" }}>Temps 2 — questions personnelles, par version</h2>
            <table className="vtab"><tbody>
              <tr>
                <th style={{ width: "13mm" }}>Ver.</th>
                <th>4. {q4.A?.consigne}</th>
                <th>5. {q5.A?.consigne}</th>
              </tr>
              {VERSIONS.map((v) => (
                <tr key={v}>
                  <td className="v">{v}</td>
                  <td>{q4[v]?.question} → <b>{q4[v]?.answer}</b></td>
                  <td>{q5[v]?.question} → <b>{q5[v]?.answer}</b></td>
                </tr>
              ))}
            </tbody></table>
          </div>

          <table className="liste"><tbody>
            <tr>
              <th style={{ width: "8mm" }}>N°</th>
              <th>Élève</th>
              <th style={{ width: "14mm" }}>Version</th>
              <th style={{ width: "18mm" }}>Q1-2-3<br />vérifiées</th>
              <th style={{ width: "14mm" }}>Q4</th>
              <th style={{ width: "14mm" }}>Q5</th>
              <th style={{ width: "17mm" }}>Note / 5</th>
              <th style={{ width: "15mm" }}>Absent</th>
            </tr>
            {eleves.map((e, i) => (
              <tr key={e.id}>
                <td className="c">{i + 1}</td>
                <td>{e.full_name}</td>
                <td className="c"><b>{versionDe(i, moitie, decalage)}</b></td>
                <td className="c"><span className="boite" /></td>
                <td className="c"><span className="boite" /></td>
                <td className="c"><span className="boite" /></td>
                <td className="c"><span className="boite" /></td>
                <td className="c"><span className="boite" /></td>
              </tr>
            ))}
          </tbody></table>

          <div className="remarque">
            <b>Report dans l&apos;application.</b> Résultats → Saisie du jour → leçon
            {" "}« {lecon.title} », total <b>5</b>. Un élève absent reste <b>sans note</b> — jamais un zéro.
          </div>
        </div>
      </div>
    );
  };

  const feuilles = [];
  pretes.forEach((bloc, k) => {
    const decalage = (k + decalageLot) % 5;
    for (let s = 0; s < moitie; s += 1) {
      const haut = s;
      const bas = s + moitie;
      feuilles.push(
        <div className="feuille" key={bloc.lecon.id + "-" + s}>
          {blocA5(bloc, haut + 1, eleves[haut], versionDe(haut, moitie, decalage))}
          <div className="coupe"><span>✂ découper ici</span></div>
          {bas < n
            ? blocA5(bloc, bas + 1, eleves[bas], versionDe(bas, moitie, decalage))
            : <div className="a5" />}
        </div>,
      );
    }
    feuilles.push(pageCorrection(bloc, decalage));
  });

  const totalPages = pretes.length * pagesParLecon + 1;

  return (
    <>
      <style>{CSS}</style>

      <div className="ecran">
        <h1 style={{ fontSize: 18, margin: "0 0 6px" }}>
          Quiz du {libelleDate(dateIso)}
        </h1>
        <p style={{ fontSize: 13, color: "#333", margin: "0 0 10px" }}>
          {pretes.length} quiz · {n} élèves · {totalPages} pages.
          {" "}Imprimez, puis coupez les feuilles de quiz en deux au trait pointillé.
        </p>
        {incompletes.length > 0 && (
          <p style={{ fontSize: 13, color: "#A83E1E", margin: "0 0 10px" }}>
            Pas de quiz disponible pour : {incompletes.map((x) => x.lecon.title).join(", ")}.
          </p>
        )}
        <button type="button" className="ec-btn" onClick={() => window.print()}>
          Imprimer
        </button>
      </div>

      <div className="qz">
        <div className="feuille">
          <div className="garde">
            <h1>Quiz de leçon — {String(classe?.level || "").toUpperCase()}<br />{libelleDate(dateIso)}</h1>
            <p className="st">
              {ecole ? ecole + " · " : ""}{classe?.full_name} · {n} élèves &nbsp;|&nbsp;
              {" "}{pretes.length} quiz · {totalPages} pages
            </p>

            <h2>Mode d&apos;emploi</h2>
            <ol className="mode">
              <li><b>Imprimer tout le document</b> en recto simple. Chaque leçon occupe
                {" "}<b>{moitie} feuilles de quiz + 1 feuille de correction</b>.</li>
              <li><b>Couper les feuilles de quiz en deux</b>, au trait pointillé. Ne pas couper
                les feuilles de correction.</li>
              <li><b>Empiler les deux paquets</b> : le paquet du haut donne les élèves 1 à {moitie}
                {" "}dans l&apos;ordre de la liste, le paquet du bas les élèves {moitie + 1} à {n}.</li>
              <li><b>Distribuer dans cet ordre.</b> Deux voisins n&apos;ont jamais la même version :
                les questions 4 et 5 changent d&apos;un élève à l&apos;autre.</li>
            </ol>

            <h2>La correction, en deux temps</h2>
            <p><b>En classe, 5 minutes après le quiz :</b> l&apos;enseignante lit à voix haute les
              réponses des <b>questions 1, 2 et 3</b>, identiques pour toute la classe. Les enfants
              corrigent leur feuille. Ce n&apos;est pas une notation : c&apos;est le moment où ils
              comprennent leur erreur.</p>
            <p><b>Après la classe :</b> l&apos;adulte note. Les questions 4 et 5 se lisent dans le
              tableau des versions ; les questions 1 à 3, identiques sur toutes les copies, se
              vérifient d&apos;un coup d&apos;œil. Compter <b>1 point par question</b>, note sur 5.</p>

            <div className="encadre">
              <b>Trois règles à ne pas oublier.</b><br />
              • Un élève <b>absent</b> reste sans note — jamais un zéro.<br />
              • La copie corrigée <b>rentre à la maison</b> dans le cahier : le parent voit les
              questions ratées, pas seulement un chiffre.<br />
              • La note se saisit dans l&apos;application avec un <b>total de 5</b>.
            </div>

            <h2>Les {pretes.length} quiz de ce document</h2>
            <table className="som"><tbody>
              <tr>
                <th style={{ width: "9mm" }}>#</th>
                <th>Leçon</th>
                <th style={{ width: "30mm" }}>Matière</th>
                <th style={{ width: "26mm" }}>Pages</th>
              </tr>
              {pretes.map((b, k) => {
                const debut = 2 + k * pagesParLecon;
                return (
                  <tr key={b.lecon.id}>
                    <td className="c">{k + 1}</td>
                    <td>{b.lecon.title}</td>
                    <td>{MATIERES[b.lecon.subject_id] || b.lecon.subject_id}</td>
                    <td className="c">{debut} à {debut + pagesParLecon - 1}</td>
                  </tr>
                );
              })}
            </tbody></table>
          </div>
        </div>

        {feuilles}
      </div>
    </>
  );
}
