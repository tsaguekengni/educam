#!/usr/bin/env node
/**
 * EduCam — LOT 15 : alléger les images de leçon.
 * ============================================================================
 *
 * CE QUE FAIT CE SCRIPT
 * Il réencode les PNG du compartiment `lesson-images` **sous leur nom actuel**,
 * puis les repose au même endroit. L'adresse ne change pas, donc :
 *   · aucune ligne de `section_blocks` à modifier ;
 *   · aucun lien cassé, ni dans les leçons, ni dans les paquets déjà
 *     téléchargés sur les portables ;
 *   · et surtout — depuis le LOT 13 — chaque appareil REMARQUE que le fichier
 *     a changé (taille + date via `educam_media_registry`) et redescend la
 *     version allégée tout seul. Avant le lot 13, réencoder en place n'aurait
 *     servi à rien : les portables auraient gardé les gros fichiers pour
 *     toujours, en silence.
 *
 * POURQUOI CE SONT LES PNG, ET RIEN D'AUTRE (mesuré le 2026-09-29)
 * Sur ce que les enseignants téléchargent RÉELLEMENT — c'est-à-dire les seuls
 * fichiers référencés par une leçon : 497 fichiers, 28 Mo.
 *
 *     PNG   219 fichiers    25 Mo     (119 ko en moyenne)   ← tout l'enjeu
 *     MP4     1 fichier    2,6 Mo
 *     SVG   277 fichiers   0,6 Mo     (2,2 ko en moyenne)   ← déjà minuscules
 *
 * Les PNG sont 89 % du poids. Les SVG n'ont rien à gagner. Le GIF animé de
 * 6,6 Mo que la conception désignait comme la cible n°1 n'est référencé par
 * AUCUNE leçon : personne ne le télécharge, il ne coûte que du stockage.
 *
 * CE QUE ÇA COÛTE UNE FOIS
 * Réécrire un fichier change sa date, donc le lot 13 marque sa leçon comme
 * modifiée et les appareils qui l'avaient déjà redescendent les images une
 * dernière fois. À faire AVANT que les portables du pilote ne téléchargent
 * pour la première fois — sinon ils paient deux fois.
 *
 * ----------------------------------------------------------------------------
 * UTILISATION
 *
 *   1. Installer l'encodeur (sans toucher à package.json) :
 *        npm i --no-save sharp
 *
 *   2. Mettre la clé de service dans `.env.local` (déjà ignoré par git) :
 *        SUPABASE_SERVICE_ROLE_KEY=...
 *      Elle se trouve dans Supabase → Project Settings → API keys.
 *      ⚠️ Cette clé contourne toutes les règles de sécurité. Elle ne quitte
 *      jamais cette machine et ne doit jamais être commitée.
 *
 *   3. Essai à blanc — ne touche à RIEN, dit seulement ce qu'on gagnerait :
 *        node scripts/optimise-media.mjs
 *
 *   4. Sur quelques fichiers d'abord, pour juger à l'œil :
 *        node scripts/optimise-media.mjs --apply --limit 5
 *      Puis ouvrir ces leçons dans l'application et REGARDER les images.
 *
 *   5. Tout le reste :
 *        node scripts/optimise-media.mjs --apply
 *
 * Options : --quality N (défaut 80) · --limit N · --min-gain N (défaut 10 %)
 *
 * FILET DE SÉCURITÉ
 * Le compartiment Supabase ne garde PAS d'historique : un fichier réécrit est
 * perdu. Le script copie donc chaque original dans `media-backup/` AVANT de
 * téléverser quoi que ce soit, et refuse d'avancer s'il n'y arrive pas.
 * Gardez ce dossier jusqu'à ce que les images vous aient satisfait à l'écran.
 * ============================================================================
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BUCKET = "lesson-images";
const BACKUP_DIR = join(ROOT, "media-backup");

/* ----------------------------- configuration ----------------------------- */

// `.env.local` vit à la racine ET dans src/app/ selon les versions du projet :
// on lit les deux, le premier trouvé gagne, sans jamais afficher les valeurs.
function loadEnv() {
  for (const p of [join(ROOT, ".env.local"), join(ROOT, "src", "app", ".env.local")]) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const v = m[2].replace(/^["']|["']$/g, "");
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}
loadEnv();

const URL_ = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const num = (f, d) => {
  const i = args.indexOf(f);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : d;
};
const APPLY = has("--apply");
const LIMIT = num("--limit", Infinity);
const QUALITY = num("--quality", 80);
const MIN_GAIN = num("--min-gain", 10) / 100;

const kb = (n) => `${(n / 1024).toFixed(0)} ko`;
const mb = (n) => `${(n / 1048576).toFixed(1)} Mo`;
const pct = (a, b) => (b ? `${Math.round((1 - a / b) * 100)} %` : "—");

function die(msg) { console.error(`\n✗ ${msg}\n`); process.exit(1); }

if (!URL_) die("SUPABASE_URL introuvable. Vérifiez .env.local.");
if (!KEY) {
  die(
    "SUPABASE_SERVICE_ROLE_KEY introuvable.\n" +
    "  Ajoutez-la dans .env.local (déjà ignoré par git) :\n" +
    "    SUPABASE_SERVICE_ROLE_KEY=...\n" +
    "  Supabase → Project Settings → API keys.\n" +
    "  Le téléversement exige cette clé : la clé publique n'a pas le droit d'écrire ici."
  );
}

// Les deux modules sont chargés APRÈS les contrôles de configuration, et
// dynamiquement : un module manquant doit produire une phrase utile, pas une
// trace d'erreur de dix lignes. C'est la première chose que verra quelqu'un
// qui lance ce script depuis le mauvais dossier.
let sharp, createClient;
try {
  ({ default: sharp } = await import("sharp"));
} catch (_) {
  die("Le module « sharp » n'est pas installé. Lancez d'abord :\n    npm i --no-save sharp");
}
try {
  ({ createClient } = await import("@supabase/supabase-js"));
} catch (_) {
  die(
    "Le module « @supabase/supabase-js » est introuvable.\n" +
    "  Lancez ce script depuis la racine du projet (C:\\dev\\educam), après `npm install`."
  );
}

const db = createClient(URL_, KEY, { auth: { persistSession: false } });

/* --------------------------- ce qui est utilisé --------------------------- */
/* On n'alourdit pas le travail avec les fichiers orphelins : 151 objets du
   compartiment ne sont référencés par aucune leçon (19 Mo). Personne ne les
   télécharge, donc les réencoder ne ferait gagner à personne un seul octet. */

const pathOf = (u) =>
  typeof u === "string" && u.includes(`/${BUCKET}/`)
    ? decodeURIComponent(u.split(`/${BUCKET}/`)[1].split("?")[0])
    : null;

async function referencedPaths() {
  const used = new Set();
  const { data: blocks, error: e1 } = await db
    .from("section_blocks").select("media_url").not("media_url", "is", null);
  if (e1) die(`Lecture de section_blocks impossible : ${e1.message}`);
  (blocks || []).forEach((b) => { const p = pathOf(b.media_url); if (p) used.add(p); });

  const { data: secs } = await db
    .from("lesson_sections").select("video_url").not("video_url", "is", null);
  (secs || []).forEach((s) => { const p = pathOf(s.video_url); if (p) used.add(p); });

  return used;
}

/* ------------------------- la liste des objets PNG ------------------------- */
/* `storage.list()` n'est PAS récursif : il faut lister la racine (qui rend les
   dossiers), puis chaque dossier. C'est le détail qui fait rater ce genre de
   script quand on suppose un seul appel. */

async function listPngs() {
  const out = [];
  const { data: top, error } = await db.storage.from(BUCKET).list("", { limit: 1000 });
  if (error) die(`Lecture du compartiment impossible : ${error.message}`);
  const folders = (top || []).filter((e) => e.id === null).map((e) => e.name);

  for (const f of folders) {
    const { data: files } = await db.storage.from(BUCKET).list(f, { limit: 1000 });
    (files || []).forEach((x) => {
      if (x.id === null) return;                        // sous-dossier : ignoré
      if (!/\.png$/i.test(x.name)) return;
      out.push({ path: `${f}/${x.name}`, size: x.metadata?.size || 0 });
    });
  }
  // Fichiers posés à la racine, s'il y en a.
  (top || []).forEach((x) => {
    if (x.id !== null && /\.png$/i.test(x.name)) out.push({ path: x.name, size: x.metadata?.size || 0 });
  });
  return out;
}

/* --------------------------------- travail -------------------------------- */

const used = await referencedPaths();
const all = await listPngs();
const targets = all
  .filter((f) => used.has(f.path))
  .sort((a, z) => z.size - a.size)          // les plus lourds d'abord
  .slice(0, LIMIT === Infinity ? undefined : LIMIT);

const orphans = all.filter((f) => !used.has(f.path));

console.log(`\nEduCam — allègement des images  (${APPLY ? "APPLICATION" : "essai à blanc"})`);
console.log(`  qualité ${QUALITY} · gain minimum retenu ${Math.round(MIN_GAIN * 100)} %`);
console.log(`  ${targets.length} PNG référencés à traiter · ${orphans.length} PNG orphelins ignorés\n`);

if (!targets.length) { console.log("Rien à faire."); process.exit(0); }

let before = 0, after = 0, rewritten = 0, skipped = 0, failed = 0;
const changes = [];

for (const [i, f] of targets.entries()) {
  const tag = `[${String(i + 1).padStart(3)}/${targets.length}]`;
  try {
    const { data: blob, error } = await db.storage.from(BUCKET).download(f.path);
    if (error || !blob) throw new Error(error?.message || "téléchargement vide");
    const original = Buffer.from(await blob.arrayBuffer());

    // Sauvegarde AVANT toute écriture : le compartiment n'a pas d'historique.
    const dest = join(BACKUP_DIR, f.path);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, original);

    const optimised = await sharp(original)
      .png({ palette: true, quality: QUALITY, effort: 10, compressionLevel: 9 })
      .toBuffer();

    before += original.length;
    const gain = 1 - optimised.length / original.length;

    if (gain < MIN_GAIN) {
      after += original.length;
      skipped++;
      console.log(`${tag} = ${f.path}  ${kb(original.length)} — gain ${Math.round(gain * 100)} %, on garde l'original`);
      continue;
    }

    after += optimised.length;
    changes.push({ path: f.path, from: original.length, to: optimised.length });

    if (APPLY) {
      const { error: upErr } = await db.storage.from(BUCKET)
        .upload(f.path, optimised, { contentType: "image/png", upsert: true });
      if (upErr) throw new Error(`téléversement : ${upErr.message}`);
    }
    rewritten++;
    console.log(`${tag} ${APPLY ? "↑" : "·"} ${f.path}  ${kb(original.length)} → ${kb(optimised.length)}  (−${pct(optimised.length, original.length)})`);
  } catch (e) {
    failed++;
    console.log(`${tag} ✗ ${f.path}  ${e.message}`);
  }
}

/* --------------------------------- bilan ---------------------------------- */

console.log(`\n─────────────────────────────────────────────`);
console.log(`  avant           ${mb(before)}`);
console.log(`  après           ${mb(after)}   (−${pct(after, before)})`);
console.log(`  réécrits        ${rewritten}`);
console.log(`  laissés tels    ${skipped}  (gain insuffisant)`);
if (failed) console.log(`  échecs          ${failed}`);
console.log(`  originaux       ${BACKUP_DIR}`);
console.log(`─────────────────────────────────────────────`);

if (!APPLY) {
  console.log(`\nEssai à blanc : RIEN n'a été modifié en ligne.`);
  console.log(`Pour appliquer :  node scripts/optimise-media.mjs --apply`);
  console.log(`Commencez plutôt par :  node scripts/optimise-media.mjs --apply --limit 5`);
} else {
  console.log(`\nFait. Les fichiers gardent leur adresse, donc aucune leçon n'est à modifier.`);
  console.log(`Chaque portable redescendra les images allégées à son prochain téléchargement`);
  console.log(`(c'est le registre des médias du lot 13 qui le déclenche).`);
  console.log(`\n⚠️ Ouvrez quelques leçons et REGARDEZ les images avant de supprimer media-backup/.`);
}
