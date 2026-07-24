# EduCam — Lesson Design North Star
### Writing Charter + Visual Pattern Library

*The single reference for building and reviewing CM1 lessons. If a lesson doesn't match this document, the lesson is wrong — not the document. Anyone (human or AI) drafting, redrawing, or reviewing a lesson follows this.*

---

## 0. Who we're writing for

- **Learner:** a child aged **8–9** in **CM1**, in **Cameroon**.
- **Language:** **French**, always. (English samples in feedback are only illustrations of *tone*.)
- **Dual delivery:** the text must work **read aloud by a teacher** *and* **read alone on screen** — when in doubt, **err child-facing**.
- **Two registers, one lesson.** A real lesson does two jobs: it **explores** (warm, playful, story-driven — this *teaches*) and it **records** (a clean, formal résumé the child copies into the cahier — the **trace écrite**, the lesson of record). We write **both**, clearly separated. The exploration is §1–§3; the record is the **Bilan** (§4). Never let one pretend to be the other.
- **The bar:** every lesson is a *waouh* for **both** the child (wonder, story, small wins) and the teacher (a joy to perform, pedagogy built in, and a proper note to copy). Delightful to learn from — but it still looks and works like a real Cameroonian lesson.

---

## 1. Writing Charter (the EXPLORATION voice — 11 rules)

*These rules govern the teaching/exploration part of the lesson (§1–§3). The Bilan's trace écrite uses a different, formal register — see §4.*

1. **Warm guide voice.** Talk *with* the child ("On y va ?", "Tu as vu ça ?"), never lecture.
2. **Bite-size.** One idea per block, **max ~3 short sentences**. More than that → split into another block with a visual or question between.
3. **Story-first.** Every abstract idea enters through a tiny Cameroonian story with our two recurring kids. A number belongs to a scene, never to a bare definition.
4. **Opening révision (the bridge).** Every lesson opens by reconnecting to prior learning, before the new topic.
   - **Leçon 1 of a component** (no previous lesson): a **CE1–CE2 rappel** ("Tu te souviens ? En CE1 et CE2 tu savais déjà…").
   - **Leçon 2 onward:** the classroom révision — « **Au dernier cours, nous avons vu… Aujourd'hui, nous allons voir…** » — recalling *what was learned*, not what was assigned. A short CE-level rappel can still follow if a specific prerequisite is needed.
   - **No devoir correction.** Lessons do **not** open by correcting the previous lesson's homework. The devoir is set in the Bilan and stays there; correcting it belongs to the classroom, not the lesson page.
   - Must be **accurate**: it chains to the **actual previous lesson**, so lessons are built and kept in sequence (see the chaining note in §3).
5. **Feelings + safety net.** On hard topics, name the emotion and reassure ("Ça a l'air costaud… mais tu vas voir, c'est un jeu."). Mistakes are normal.
6. **Show → Guide → Do.** Model it ("Je te montre"), do one together with a micro-question ("On essaie ensemble ?"), then hand off ("À toi !").
7. **Gentle vocabulary.** Introduce the *real* terms (numérateur, quotient, intersection) but **one at a time**, each with a kid-friendly hook. Never drop three at once.
8. **Wonder hooks.** Open a concept on a surprising question or fact to spark curiosity.
9. **A visual right after each idea** (this is the block pattern — see §5).
10. **Celebrate the win** at the end — a genuine "Bravo, champion ! 🎉".
11. **Light emoji.** A sprinkle for warmth and signposting (👋 🚀 🌟 🎉 💪), never a rash.

---

## 2. Recurring characters (lock these)

Two explorer-guides run through **every** lesson so kids bond with them:

**Locked canon** (derived from the approved reference image — use verbatim in every scene prompt):

- **Amadou** — a Cameroonian boy about 9, **very short cropped dark hair**, warm dark brown skin, friendly open face. Wears a **blue graphic t-shirt with a white abstract print**. Cheerful, adventurous.
- **Aïcha** — a Cameroonian girl about 9, natural dark afro hair in **two large rounded puffs**, warm dark brown skin, small stud earrings, bright smile. Wears a **colourful African-print top in green, orange and blue**. Curious, quick.

Use them to *carry* the maths (Amadou at the market adding prices; Aïcha spotting a giant number). Keep their look identical across text and images. **Always attach `characters-reference-sheet.jpg` to every scene generation** — with photoreal imagery, drifting faces read as *different children*, which is worse than illustration drift. Paste the canon wording into the prompt as well. *Note:* characters live in the exploration only — they do **not** appear in the trace écrite (§4).

---

## 3. Lesson anatomy — the "waouh" shape

Same schema, same upload flow — just this choreography:

```
OPENING RÉVISION
   • Leçon 1 of a component: rappel CE1–CE2
   • Leçon 2+: « Au dernier cours, nous avons vu… Aujourd'hui, nous allons voir… »
HOOK (wonder + tiny story + scene)
  → for each concept:
        mini-story (≤3 sentences)
        → diagram (stepped SVG)
        → "on essaie ensemble ?" micro-question
  → NARRATED VIDEO (1 min, Amadou & Aïcha)
  → PLAYFUL ACTIVITY (games) + scene image
  → EXERCISES (interactive auto-check — lives in the `exercise` section)
  → BILAN — its OWN `bilan` section, stays on screen to copy (see §4):
        Récapitulons (oral recap + celebration)
        → À recopier: for each concept, its note + a clean "cahier" diagram to draw
        → Mon devoir (copied homework + one applied task)
```

This naturally produces **many small blocks** (Leçon 1 = 26). That's intended. **Block granularity is the one open item we tune from live classroom delivery** — do not pre-merge on a hunch.

**Lesson chaining.** The opening révision (rule 4) links each lesson to the one before: **Leçon N opens by recalling Leçon N-1's topic**, then announces today's. The chain is about *content*, not homework — a devoir can be reworded without touching the next lesson. Keep lessons in sequence so the recall names what was genuinely taught last.

**Sequencing (confirmed via the répartition annuelle CM1).** The year runs as **monthly themed units** — Sept = La Nature (1), Oct = Le Village/La Ville (2), Nov = L'École (3), Déc–Jan = Les Métiers (4), Fév = Les Voyages (5), Mars = La Santé (6), Avr = Sports et Loisirs (7), Juin = Dans l'Espace (8) — matching our `unit_number`.

**One lesson = one teaching week.** Each unit/month has **4 weeks**: weeks **1–3 are teaching weeks, each its own independent lesson**, and **week 4 is integration/évaluation — no lesson** (the platform shows an evaluation card). So each component-unit becomes **3 weekly lessons**, keyed by `(subject, component, level, unit_number, week_number)`. Every weekly lesson is a full ~45-min lesson with the complete anatomy (opening révision → teach → activité → bilan). Because each week now carries only one or two concepts, lessons can be **more explanatory** — use the room.

**Weekly recall chain.** "Au dernier cours" now points to the **previous teaching week of the same component**: U1·S2 recalls U1·S1; U1·S3 recalls U1·S2. At **week 1 of a unit**, recall the **previous unit's week 3** (e.g. U2·S1 recalls U1·S3). The **very first lesson of the year** (U1·S1) has no previous lesson → use the **CE1–CE2 rappel** instead. The weekly topic split comes from `curriculum_topics` (level, unit, **week**, subject, component) / the répartition — match our lesson content to the week's topic. *(Caveat: the physical timetable teaches several components per maths week; our recall refers to the component thread, which is how the platform tracks lessons.)*

---

## 4. The Bilan — le récap, la trace écrite, le devoir

**Why this exists (non-negotiable).** In Cameroonian primary schooling, the résumé the child copies into their cahier **is the lesson of record** — it's what gets revised at home, checked by parents, and examined. A lesson without it does not read as complete to a teacher, however good the explanation. Copying notes is also a valued classroom habit we keep on purpose. So **every lesson ends with a Bilan** that stays displayed on screen for pupils to copy at the end of the class. It has three parts, in order:

**1. Récapitulons ! 🎈 (oral recap — not copied)**
Warm, Amadou & Aïcha, spoken-style ("Aujourd'hui, on a appris à…"). 2–4 sentences. This is the wrap-up the teacher says aloud.

**2. 📋 À recopier dans ton cahier (la trace écrite — the keeper)**
The formal résumé. **This is the deliberate register switch:**
- Formal, concise, impersonal. **No emojis, no characters, no "tu".** (The 📋 is only the on-screen heading label, not part of the copied text.)
- **Numbered headings** per concept; each a one-line definition + **one worked example**.
- **A copy-diagram per concept.** Each numbered concept is followed by a clean **"cahier" version** of its diagram — no speech-bubbles, no "À toi", no emoji — captioned "Recopie/Dessine … dans ton cahier", so the child copies the note *and* draws the figure. (Reuse an existing diagram only if it's already clean; otherwise make a `*-cahier.svg`.)
- **Bold headings.** Wrap the leçon title, the `📋 À RECOPIER DANS TON CAHIER` heading, `✏️ MON DEVOIR`, and each numbered concept lead-in (e.g. `**1. Les ensembles.**`) in `**…**` so they render bold (see the text-formatting note in §9).
- Copy-length: the text short enough to write in a few minutes (**aim ≤ ~120 words**, diagrams excluded).
- This is the ONE part written in textbook register — on purpose. It must look like a proper *leçon*.

**3. ✏️ Mon devoir (à recopier aussi — homework)**
- 3–5 short questions mirroring the lesson (calculations, etc.), phrased for copying.
- **Rule: always end with ONE applied, real-world task** tied to the child's life (see bank below).

### Register example (Leçon 2)

> **Leçon : Encadrer, arrondir et multiplier**
>
> **1. Encadrer un nombre.** Encadrer un nombre, c'est le placer entre deux nombres ronds.
> Exemple : 7 800 < 7 845 < 7 900 (à la centaine près).
>
> **2. Arrondir un nombre.** On regarde le chiffre qui suit le rang choisi : s'il est 5 ou plus, on arrondit au nombre supérieur ; s'il est inférieur à 5, au nombre inférieur.
> Exemple : 7 845 ≈ 7 800 ; 7 867 ≈ 7 900.
>
> **3. La multiplication.** On pose l'opération et on additionne les produits partiels. La preuve par 9 permet de vérifier.
> Exemple : 2 453 × 26 = 63 778.
>
> **Devoir.** 1) Encadre 4 562 à la centaine près. 2) Arrondis 38 720 au millier près. 3) Calcule 1 458 × 32 et vérifie par la preuve par 9. 4) **À la maison :** relève trois prix au marché ou sur des emballages, puis arrondis-les au millier près.

Feel the gap between this and the exploration voice — that gap is the whole point.

### Applied-assignment bank (one per devoir)

- **Nombres/Calculs:** chasse aux grands nombres à la maison (emballages, pièces d'identité, panneaux) → les lire et les écrire ; aider un parent à noter les prix du marché.
- **Mesures/Grandeurs:** mesurer ta chambre ou le salon ; mesurer et comparer les tailles de la famille ; chronométrer le trajet jusqu'à l'école.
- **Géométrie:** repérer les angles droits et les droites parallèles à la maison ; dessiner le plan de ta chambre.
- **Statistiques:** enquête sur les plats préférés de la famille → tableau / diagramme en barres ; compter les véhicules qui passent en 5 minutes.

### On-screen behaviour & scope

- The Bilan **stays displayed** at the end of the lesson so pupils can copy it. Parents with internet see the same on-screen version.
- **No printable/exportable handout for now** — deliberately out of scope to keep launch logistics simple. (Can be revisited later.)

### Reconciliation with the interactive layer

The copied **devoir** is the *written homework in the cahier*. The existing interactive `exercises` / `readiness_questions` tables remain the *on-screen auto-check* layer — untouched by the redesign. The same questions may appear in both places; keep them consistent.

---

## 5. Visual system — the golden rule

> **If it has numbers or labels → SVG (Claude-made, exact). If it's a story scene with no text → Gemini.**

- **Concept visuals = SVG.** Deterministic, numerically correct, as detailed/stepped/animated as we like. Image generators still mangle digits and labels — a maths lesson can never ship "345 678 921".
- **Story scenes = Gemini.** Market, boutique, classroom mood — emotion and context only.
- **More, simpler, sequenced — not richer, denser.** For 8–9-year-olds, a busy image *raises* difficulty. One idea per visual; break one summary diagram into a step-sequence.
- **Motion is the biggest "waouh" upgrade** (a digit dropping into its house, a bar filling). Do it as animated SVG or short silent clips that stay numerically correct — pending renderer support.
- **Every visual sits in its own block**, right after the text beat it illustrates.
- If an exact figure/label must appear over a Gemini scene, **overlay it in the editor afterward** — never trust Gemini to spell it.

---

## 6. Visual Pattern Library (reusable SVG templates)

Apply these everywhere for richness through consistency, not 32 one-off explosions.

| Pattern | What it does | Used in |
|---|---|---|
| **Scary-number reveal** | Giant number → cut into families → houses → readable, in numbered steps, with a kid speech-bubble ("Waouh !") | place value, big numbers |
| **Worked-example ladder** | Posed operation built step by step (carries/borrows shown), ending with a **"À toi : … ?"** you-do line | +, −, ×, ÷ |
| **You-do blank** | Same as a worked example but with a gap the child fills | any operation |
| **Parts-of-a-whole fill** | A shape/bar split into equal parts, some shaded, numérateur/dénominateur labelled | fractions, decimals |
| **Set / intersection glow** | Two overlapping circles, the middle glowing, "les deux !" bubble | ensembles, Venn |
| **Number-line placement** | A value framed/placed between round bounds | encadrer, arrondir, fractions |
| **Anatomy callouts** | An equation with each term labelled by a coloured callout | division elements, fraction terms |

### Style tokens (keep identical)

- **Canvas:** `viewBox="0 0 1200 675"` (taller when stepped, e.g. `1200 820`). Card: `<rect rx="24" fill="#F8FAFC"/>`.
- **Fonts:** `'Segoe UI', Arial, sans-serif`; posed operations in `'Courier New', monospace` for alignment.
- **Title** 38px bold `#1E293B`; **subtitle** 22px `#64748B`.
- **Class colours** (consistent everywhere): **Millions** amber `#D97706` / fill `#FEF3C7`; **Mille** green `#059669` / fill `#D1FAE5`; **Unités** blue `#2563EB` / fill `#DBEAFE`.
- **Accents:** magic/intersection purple `#A855F7`; success/correct green `#16A34A`; retenue/emprunt red `#DC2626`.
- **Step badges:** dark circle `#1E293B` + white number.
- **Character voice:** rounded speech-bubble (rect + small tail) with a short kid line.

---

## 7. Gemini scene prompt rules

Prepend to **every** scene prompt:

1. **Hard no-text rule (verbatim):**
   > *"Do not render any written words, letters, numbers, labels, signs or captions anywhere. Blackboards, papers, cards and bags must be blank or show only simple pictures — never text."*
2. **Calm composition:** *"One clear focal action in the foreground, 2–4 characters, soft uncluttered background, generous space."* Fewer, bigger, clearer — never crowds.
3. **Character block:** paste Amadou/Aïcha descriptions (§2) when they appear; use a reference image for face consistency.
4. **Format — PHOTOREAL (updated standard).** Scene images are **candid documentary-style photographs**, not illustrations. Pupil feedback was that flat-vector cartoons read as "for little kids" and made it hard to see themselves. Append the locked style block:
   > *"Shot on a 35–50mm lens at f/2.8, shallow depth of field with a gently blurred background, warm natural colour grading, natural daylight, sharp focus on the children's faces and hands, candid and unposed, photorealistic, high resolution, 16:9 landscape."*
   Settings should be **modern and recognisably Cameroonian** — contemporary homes, well-equipped classrooms, real markets and streets. Modern details (a smartphone on the counter, current clothing) do as much relatability work as the photorealism itself.
5. **Design scenes so text isn't needed** (blank board; no name-cards). The maths lives in the adjacent SVG block.
6. **Watch set purity.** If a scene illustrates a concept (e.g. sorting fruits vs vegetables for *ensembles*), make the groups unambiguous — no tomatoes or limes straddling both categories. A pupil spotting an edge case derails the lesson.
7. **Crop the watermark.** Gemini stamps a sparkle mark (usually bottom-right); remove it before upload. An invisible SynthID marker also remains — harmless here, but the images are detectably AI-generated.

> **Scope:** this applies to **scene PNGs only**. All SVG diagrams stay exactly as they are — they carry the numbers and labels, and photos cannot do that job.

*Reference standard:* the `intro-marché` image (clear focal handover, warm, uncluttered). *Avoid:* crowd scenes and any blackboard the model would try to write on.

---

## 8. Narrated video recipe (1 minute)

- **Tool:** Veo 3.x in Gemini. **Use Scene Extension**, not six separate clips — each extension continues from the previous clip's final second, preserving character/scene/audio. Separate generations drift.
- **Clips are ~8s**; plan ~6 segments (+ a short outro) to reach ~60s.
- **Style Bible** (repeat every segment): same teacher + Amadou & Aïcha, same bright classroom opening to a Cameroonian town, warm palette, gentle camera, cheerful music, **no legible on-screen text/numbers**.
- **Narration:** either let Veo speak the French line per segment (fast) **or** mute Veo and lay one clean French voiceover over the assembled minute (best consistency + correct maths pronunciation — recommended).
- **Scope:** 60s ≈ ~120 French words → a lively *overview*, not a full re-teach. Go ~90s if fuller coverage is needed.
- The finished `.mp4` drops into a **video block** inside the content section.

---

## 9. Technical & workflow conventions

- **Schema:** content lives in `section_blocks` (`block_type` ∈ `text` | `image` | `video`; ordered by `block_order`; `text_content`, `media_url`, `caption`, `alt_text`). The standalone `section_type='video'` **section is retired** — video is a *block* inside content; each lesson SQL deletes it.
- **The Bilan** (§4) lives in its **own dedicated section** — `section_type='bilan'`, `title='Bilan — À recopier'`, `icon='📋'` — created by the lesson SQL with `section_order = MAX(section_order)+1` so it renders last. **This is required:** the `exercise` section renders questions from the **`exercises` table, NOT `section_blocks`**, so any text/image block placed in `exercise` is **invisible** in the lesson view. `section_type` has **no CHECK constraint** and the dashboard renders any non-`exercise` section's blocks generically, so `bilan` needs **no schema change**. Two front-end touch-points keep it clean (both done): the dashboard `accentColors` map includes `bilan: "#D97706"`, and the admin editor's `SECTION_TYPES` lists `bilan` (the admin round-trips unknown types on save, but listing it prevents a blank type label). Bilan block order: recap → `📋 À RECOPIER…` heading → (concept text → cahier diagram) × N → `✏️ MON DEVOIR`. Still **no printable export** (see §4).
- **Text formatting.** Text blocks render as plain text with line breaks preserved, plus **markdown-style `**bold**`** — the dashboard parses `**…**` into bold (`renderRichText` helper). Convention: bold the **leçon title**, the Bilan section headings (`**📋 À RECOPIER DANS TON CAHIER**`, `**✏️ MON DEVOIR**`), and each **numbered concept lead-in** in the trace écrite (e.g. `**1. Les ensembles.**`). No other markdown is supported (no italics, headers, or lists) — don't rely on it.
- **Images bucket:** public Supabase bucket `lesson-images`; public URL `…/storage/v1/object/public/lesson-images/<folder>/<file>`.
- **Folder / naming per lesson:** `<comp>-u<unit>-s<week>` — e.g. `nc-u1-s1` (nombres, unité 1, semaine 1). Component codes: **nc** = nombres-calculs, **mg** = mesures-grandeurs, **ge** = geometrie-espace, **st** = statistiques.
- **Media tokens in SQL:** `[[folder/filename.ext]]`, replaced by `upload-lesson.mjs` → `.filled.sql`.
- **SVG filenames:** descriptive kebab-case (`grands-nombres-reveal.svg`). **Scenes:** `intro-*.png`, `activite-*.png`, concept scenes named by subject. **Video:** `video-*.mp4`.
- **SQL is idempotent and self-creating.** It finds the lesson by natural key (`subject_id, component_id, level, unit_number, week_number`); **if the row doesn't exist it INSERTs it** (weeks 2–3 don't exist until created), then find-or-creates each section (`intro, content, activity, exercise, bilan`), clears old blocks, and inserts the new sequence. Safe to re-run. (`lessons.theme` is NOT NULL — set it; `week_number` defaults to 1.)
- **Upload:** put SVGs + SQL + generated PNGs (+ video) in the lesson folder → `node upload-lesson.mjs <folder>` → run the `.filled.sql` in Supabase. Turn on Windows "File name extensions" to avoid `.png.png`.
- **`alt_text`** is written for every image (accessibility + screen-reader + fallback).
- **Exercises & readiness_questions** live in their own tables and are **not** touched by the block redesign (but their framing should match the warm voice).

---

## 10. Pre-ship checklist

- [ ] Every exploration text block ≤ ~3 sentences, warm guide voice, French.
- [ ] Amadou & Aïcha present and consistent (exploration only).
- [ ] CE1–CE2 rappel early and accurate.
- [ ] **Leçon 2+: opens with « Au dernier cours… Aujourd'hui… »** recalling the previous lesson's *topic* (no devoir correction).
- [ ] At least one feelings/safety-net line on a hard concept.
- [ ] Show → Guide → Do present; at least one "on essaie ensemble ?" and one "À toi".
- [ ] Celebration block at the end.
- [ ] Every concept has its own stepped SVG; **all numbers exact**.
- [ ] SVGs use the shared style tokens and a library pattern.
- [ ] Gemini scenes carry the no-text + calm-composition + character block; boards blank.
- [ ] Video is Scene-Extension-based, no on-screen numbers.
- [ ] **Bilan present** in its **own `bilan` section** (never the `exercise` section — that renders the exercises table, not blocks): Récapitulons + À recopier (trace écrite: formal, no emoji/characters, ≤ ~120 words) + Mon devoir.
- [ ] **Trace écrite has a clean copy-diagram per concept** (no bubbles/you-do/emoji), each captioned "à recopier / à dessiner".
- [ ] **Bilan headings bolded** with `**…**` (leçon title, `📋 À RECOPIER…`, `✏️ MON DEVOIR`, concept lead-ins).
- [ ] **Devoir ends with one applied, real-world task.**
- [ ] Folder/naming/tokens correct; SQL idempotent; alt_text on every image.

---

*Living document. Open item we tune from real classroom delivery: block granularity. Core principle added from teacher feedback: the two registers — explore, then record — with the Bilan as the copied lesson of record. Delivery note (learned in build): the `exercise` section renders the exercises table, not blocks, so the Bilan gets its own `bilan` section; front-end updated accordingly.*
