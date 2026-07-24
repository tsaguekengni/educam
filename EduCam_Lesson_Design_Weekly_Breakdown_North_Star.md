# EduCam CM1 — North Star (curriculum reference for content chats)

**This document is generated from the live `curriculum_topics` table**, which was rebuilt directly from the official Répartition Annuelle CM1. It is the single source of truth for what to build. Do not hand-edit — regenerate it if the curriculum changes.

## The model
- Each unit = **3 teaching weeks** (S1, S2, S3), each an independent lesson. **Week 4 = intégration et évaluation** (no platform lesson).
- 8 units follow the 8 centres d'intérêt: 1 La nature · 2 Le village, la ville · 3 L'école · 4 Les métiers · 5 Les voyages · 6 La santé · 7 Sports et loisirs · 8 Dans l'espace.
- Months: Sept=U1, Oct=U2, Nov=U3, Déc/Janvier=U4, Février=U5, Mars=U6, **Avril=U7, Mai=U8** (no June).

## How to use this (for content chats)
1. Pick a subject/component below and a specific **unité + semaine**. The cell text is the lesson topic — use it as the lesson title/objective.
2. Create ONE lesson for that exact week. Set `subject_id`, `component_id`, `level='cm1'`, `unit_number`, and **`week_number` (1, 2 or 3)** — this is required.
3. Lesson structure: intro → contenu → vidéo → activité → exercices → bilan. Include **4 exercices** + **6 questions de quiz de préparation**.
4. Upload via the batch uploader (`lessons/<folder>/<name>.sql` + media), or the admin editor.

## Status legend
- ✅ **Lesson built** for this week and aligned to the topic.
- ⚠️ **Legacy lesson** exists on week 1 only (old 1-lesson-per-unit content) — needs splitting/re-aligning to this week's topic.
- ⬜ **To create** — no lesson yet.

## Where we stand (482 weekly topics total)
- ✅ Built & aligned: **6**  ·  ⚠️ Legacy (needs re-align): **120**  ·  ⬜ To create: **356**
- Subjects with content today: **Français, Maths, Sciences** (mostly legacy week-1 lessons; only Maths/Nombres et calculs U1–U2 fully split).
- No lessons yet: **English, Langue nationale, SHS, TIC, Arts, EPS, Développement personnel** (topics ready, lessons to build).

---

## Français et Littérature

### Expression orale  
`francais / expression-orale`  ·  savoir-être: *Être un locuteur efficace qui sait écouter et s'exprimer de façon précise et correcte*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⚠️ Écoute: réagir à une consigne | ⬜ Récit ou discours oral | — |
| 2 | Le village, la ville | ⚠️ Écoute: réagir à une demande | ⬜ Récit oral cohérent | — |
| 3 | L'école | ⚠️ Écoute: réagir à un récit | ⬜ Les éléments prosodiques | ⬜ Le débat oral |
| 4 | Les métiers | ⚠️ Écoute: réagir à une action ou un propos | ⬜ Le débat oral | — |
| 5 | Les voyages | ⚠️ Le débat oral: règles | — | — |
| 6 | La santé | ⚠️ Le compte rendu oral | — | — |
| 7 | Sports et loisirs | ⚠️ La poésie: déclamation | — | — |
| 8 | Dans l'espace | ⚠️ La poésie: déclamation (approfondissement) | — | — |

### Production d'écrits  
`francais / production-ecrits`  ·  savoir-être: *Être un rédacteur efficace et performant*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⚠️ La calligraphie | ⬜ Production de textes: le résumé | — |
| 2 | Le village, la ville | ⚠️ La calligraphie | ⬜ Rédiger selon des consignes | — |
| 3 | L'école | ⚠️ Les différents types de textes | — | — |
| 4 | Les métiers | ⚠️ Les différents types de textes | — | — |
| 5 | Les voyages | — | — | — |
| 6 | La santé | ⚠️ Le compte rendu | — | — |
| 7 | Sports et loisirs | ⚠️ Production de textes poétiques | — | — |
| 8 | Dans l'espace | ⚠️ L'édition de textes avec les TIC | — | — |

### Littérature  
`francais / litterature`  ·  savoir-être: *Être un lecteur assidu*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⚠️ Les aventures | ⬜ La recherche documentaire | — |
| 2 | Le village, la ville | ⚠️ Les héros d'une œuvre | ⬜ La recherche documentaire | — |
| 3 | L'école | ⚠️ Le compte rendu de lecture | — | — |
| 4 | Les métiers | ⚠️ La morale en question | — | — |
| 5 | Les voyages | ⚠️ La morale en question: les fables | — | — |
| 6 | La santé | ⚠️ La morale en question: la bande dessinée | — | — |
| 7 | Sports et loisirs | ⚠️ La poésie | — | — |
| 8 | Dans l'espace | ⚠️ La poésie: déclamation | — | — |

### Grammaire  
`francais / grammaire`  ·  savoir-être: *Être un communicateur efficace et correct*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⚠️ Les adjectifs indéfinis et numéraux | ⬜ Fonction des adjectifs indéfinis et numéraux | — |
| 2 | Le village, la ville | ⚠️ Les formes de phrase | ⬜ Les pronoms relatifs et indéfinis | ⬜ Le groupe nominal et le groupe verbal |
| 3 | L'école | ⚠️ Les types de phrase | ⬜ Les conjonctions | ⬜ Fonction des conjonctions |
| 4 | Les métiers | ⚠️ Les voix active et passive | ⬜ Les adverbes | ⬜ Fonction des adverbes |
| 5 | Les voyages | ⚠️ La proposition | — | — |
| 6 | La santé | ⚠️ Les types de propositions | — | — |
| 7 | Sports et loisirs | ⚠️ La proposition subordonnée relative | — | — |
| 8 | Dans l'espace | ⚠️ L'analyse logique de la phrase | — | — |

### Vocabulaire  
`francais / vocabulaire`  ·  savoir-être: *Être un locuteur pertinent*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⚠️ Utilisation du dictionnaire | ⬜ Le champ lexical de la nature | — |
| 2 | Le village, la ville | ⚠️ Le champ sémantique | ⬜ Le champ lexical de la ville | ⬜ Sens propre et sens figuré |
| 3 | L'école | ⚠️ Le champ sémantique: homographes et paronymes | ⬜ Le champ lexical de l'école | — |
| 4 | Les métiers | ⚠️ Le champ lexical des métiers | ⬜ Le champ morphologique | — |
| 5 | Les voyages | ⚠️ Le champ morphologique: famille de mots | ⬜ Le champ lexical des voyages | — |
| 6 | La santé | ⚠️ Les niveaux de langue | ⬜ Le champ lexical de la santé | — |
| 7 | Sports et loisirs | ⚠️ Les niveaux de langue (approfondissement) | ⬜ Le champ lexical des sports et loisirs | — |
| 8 | Dans l'espace | ⚠️ Les maximes (proverbes) | ⬜ Le champ lexical de l'espace | — |

### Orthographe  
`francais / orthographe`  ·  savoir-être: *Être rédacteur correct et efficace*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⚠️ Les mots commençant par ac, ab, ad | ⬜ Les signes de ponctuation: la virgule et le point | — |
| 2 | Le village, la ville | ⚠️ Les mots commençant par ef, of | ⬜ Les homonymes grammaticaux: à et a | ⬜ L'accord du verbe avec son/ses sujets |
| 3 | L'école | ⚠️ Les signes de ponctuation: point-virgule et deux points | ⬜ Les mots commençant par ap | ⬜ Les homonymes grammaticaux: et / est |
| 4 | Les métiers | ⚠️ Les signes de ponctuation: exclamation et interrogation | ⬜ Les mots commençant par ai | ⬜ Accord du participe passé avec être |
| 5 | Les voyages | ⚠️ Les signes de ponctuation: points de suspension et tiret | ⬜ Les mots commençant par al, ar, as | ⬜ Les homonymes grammaticaux: son / sont |
| 6 | La santé | ⚠️ Les signes de ponctuation: parenthèses et guillemets | ⬜ Les homonymes grammaticaux: ma/m'a, mon/m'ont | ⬜ L'accord des adjectifs nu et demi |
| 7 | Sports et loisirs | ⚠️ Les homonymes grammaticaux: mes/mais/m'est | ⬜ Accord du participe passé avec avoir | ⬜ Accord du participe passé des verbes pronominaux |
| 8 | Dans l'espace | ⚠️ Les homonymes grammaticaux: la/l'a, peu/peut, ni/n'y | ⬜ Les mots en -ament, -amment, -ement, -emment, -ence | — |

### Conjugaison  
`francais / conjugaison`  ·  savoir-être: *Être un communicateur efficace et précis*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⚠️ Le verbe: états et types | ⬜ Les groupes de verbes | — |
| 2 | Le village, la ville | ⚠️ Les temps de l'indicatif | — | — |
| 3 | L'école | ⚠️ Le mode impératif | — | — |
| 4 | Les métiers | ⚠️ Le mode conditionnel | — | — |
| 5 | Les voyages | ⚠️ Le mode subjonctif | — | — |
| 6 | La santé | ⚠️ Le mode participe | — | — |
| 7 | Sports et loisirs | ⚠️ La concordance des temps | — | — |
| 8 | Dans l'espace | — | — | — |

---

## Mathématiques

### Nombres et calculs  
`maths / nombres-calculs`  ·  savoir-être: *Avoir un raisonnement cohérent et logique*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ✅ Logique et ensembles | ✅ Les nombres entiers à 9 chiffres | ✅ Addition et soustraction |
| 2 | Le village, la ville | ✅ Logique et ensembles: union et intersection | ✅ Encadrer et arrondir les grands nombres | ✅ La multiplication des entiers |
| 3 | L'école | ⚠️ Logique et ensembles: inclusion et union | ⬜ Les nombres décimaux | ⬜ Calcul sur les décimaux |
| 4 | Les métiers | ⚠️ Encadrer les nombres décimaux | ⬜ Les fractions simples | ⬜ La division et la divisibilité |
| 5 | Les voyages | ⚠️ Les fractions | ⬜ Calcul sur les fractions | — |
| 6 | La santé | ⚠️ Les nombres complexes | ⬜ Calcul sur les nombres complexes | — |
| 7 | Sports et loisirs | ⚠️ Les mouvements uniformes | ⬜ Calcul de durées et de distances | — |
| 8 | Dans l'espace | ⚠️ Les opérations commerciales | ⬜ Calcul commercial | ⬜ Calcul des intérêts |

### Mesures et grandeurs  
`maths / mesures-grandeurs`  ·  savoir-être: *Être précis et avoir le sens de la mesure et du jugement*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⚠️ Les unités de longueur | ⬜ Périmètres du carré et du rectangle | ⬜ Périmètres et cercle |
| 2 | Le village, la ville | ⚠️ Les mesures de capacité | — | — |
| 3 | L'école | ⚠️ Les mesures de masse | ⬜ Masses et capacités | — |
| 4 | Les métiers | ⚠️ Les mesures de surfaces | ⬜ Les mesures agraires | — |
| 5 | Les voyages | ⚠️ Les mesures d'aires | ⬜ Aires des figures | — |
| 6 | La santé | ⚠️ Les mesures de surfaces et agraires | — | — |
| 7 | Sports et loisirs | ⚠️ Les mesures de volume | — | — |
| 8 | Dans l'espace | ⚠️ Les mesures du temps | ⬜ La monnaie | — |

### Géométrie et espace  
`maths / geometrie`  ·  savoir-être: *Avoir le sens du beau, être précis et fin*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⚠️ Les figures planes: le pentagone | ⬜ Les figures planes: l'hexagone | ⬜ Les figures planes: l'octogone |
| 2 | Le village, la ville | ⚠️ Les angles | ⬜ Le triangle | — |
| 3 | L'école | ⚠️ Les solides: cube et pavé | ⬜ Les solides: le cylindre | — |
| 4 | Les métiers | ⚠️ Les angles: comparer et reproduire | ⬜ Les angles: mesurer et construire | ⬜ La symétrie |
| 5 | Les voyages | ⚠️ Le plan et l'échelle | ⬜ Agrandissement et réduction | — |
| 6 | La santé | ⚠️ Les intervalles | — | — |
| 7 | Sports et loisirs | ⚠️ Les rangements | — | — |
| 8 | Dans l'espace | ⚠️ Le repérage | — | — |

### Statistiques  
`maths / statistiques`  ·  savoir-être: *Avoir un raisonnement cohérent, logique et précis*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⚠️ Les enquêtes | ⬜ Le protocole d'enquête | — |
| 2 | Le village, la ville | ⚠️ Moyennes arithmétiques | ⬜ Partages et graphiques | — |
| 3 | L'école | ⚠️ Les partages | — | — |
| 4 | Les métiers | ⚠️ Les proportionnalités | ⬜ Coefficient de proportionnalité | — |
| 5 | Les voyages | ⚠️ Tableaux et graphiques | ⬜ Le taux d'accroissement | — |
| 6 | La santé | ⚠️ La vitesse | — | — |
| 7 | Sports et loisirs | — | — | — |
| 8 | Dans l'espace | ⚠️ Calcul des intérêts | — | — |

---

## Sciences et Technologies

### Sciences de la vie  
`sciences / sciences-vie`  ·  savoir-être: *Avoir le respect de la vie, être attentif à sa santé, avoir de l'empathie pour les autres*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⚠️ L'alimentation de l'homme: les classes d'aliments | ⬜ Les besoins alimentaires | ⬜ L'hygiène alimentaire |
| 2 | Le village, la ville | ⚠️ La reproduction humaine | ⬜ La classification des animaux | ⬜ Reproduction, nutrition et locomotion des animaux |
| 3 | L'école | ⚠️ La digestion | ⬜ Le sang | ⬜ L'excrétion |
| 4 | Les métiers | ⚠️ La circulation sanguine | ⬜ Hygiène et accidents de la circulation | ⬜ La reproduction chez les végétaux |
| 5 | Les voyages | ⚠️ La formation du fruit | ⬜ La nutrition des végétaux | — |
| 6 | La santé | ⚠️ Le système nerveux | ⬜ Les organes des sens | ⬜ Les maladies endémiques et épidémiques |
| 7 | Sports et loisirs | ⚠️ Les muscles et les articulations | — | — |
| 8 | Dans l'espace | — | — | — |

### Sciences physiques et chimiques  
`sciences / sciences-physiques`  ·  savoir-être: *Être curieux et prudent*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⚠️ La matière: les quatre états | ⬜ Les états de la matière | — |
| 2 | Le village, la ville | ⚠️ L'eau: le cycle de l'eau | — | — |
| 3 | L'école | ⚠️ L'air | ⬜ L'oxydation | ⬜ Oxydation et combustion |
| 4 | Les métiers | ⚠️ Le magnétisme | ⬜ Aimanter un corps | — |
| 5 | Les voyages | — | — | — |
| 6 | La santé | ⚠️ Les phénomènes naturels dangereux | — | — |
| 7 | Sports et loisirs | ⚠️ La lumière | ⬜ La chaleur | — |
| 8 | Dans l'espace | ⚠️ Les sources d'énergie | — | — |

### Technologies  
`sciences / technologies`  ·  savoir-être: *Être inventif et créatif*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⚠️ Le courant électrique: production | ⬜ Dangers et avantages du courant | ⬜ Montages en série et en parallèle |
| 2 | Le village, la ville | ⚠️ Fonctionnement d'appareils usuels: les lampes | ⬜ Précautions d'utilisation | — |
| 3 | L'école | ⚠️ Les mouvements: translation et rotation | ⬜ Transformation des mouvements | — |
| 4 | Les métiers | — | — | — |
| 5 | Les voyages | — | — | — |
| 6 | La santé | ⚠️ Les appareils sanitaires | — | — |
| 7 | Sports et loisirs | — | — | — |
| 8 | Dans l'espace | ⚠️ Sécurisation des appareils et des machines | — | — |

### Sciences de la terre  
`sciences / sciences-terre`  ·  savoir-être: *Avoir l'esprit scientifique*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⚠️ Les sols et les roches | — | — |
| 2 | Le village, la ville | ⚠️ Les sols et les roches (suite) | — | — |
| 3 | L'école | ⚠️ Les volcans | ⬜ Les éruptions volcaniques | ⬜ Mesures de protection |
| 4 | Les métiers | ⚠️ Le séisme | — | — |
| 5 | Les voyages | ⚠️ Le tremblement de terre | — | — |
| 6 | La santé | — | — | — |
| 7 | Sports et loisirs | ⚠️ Les fossiles | — | — |
| 8 | Dans l'espace | — | — | — |

### Sciences agropastorales et piscicoles  
`sciences / agropastoral`  ·  savoir-être: *Avoir de l'estime pour les activités agropastorales*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⚠️ Amélioration des sols: aménagement | ⬜ Amélioration des sols cultivables | ⬜ Enrichissement du sol |
| 2 | Le village, la ville | ⚠️ Le compost | — | — |
| 3 | L'école | ⚠️ La protection des cultures | — | — |
| 4 | Les métiers | ⚠️ Le calendrier agricole | ⬜ La pisciculture | — |
| 5 | Les voyages | ⚠️ Les autres élevages | — | — |
| 6 | La santé | ⚠️ L'amélioration de la production animale | — | — |
| 7 | Sports et loisirs | — | — | — |
| 8 | Dans l'espace | — | — | — |

### Éducation à l'environnement  
`sciences / environnement`  ·  savoir-être: *Avoir le sens du respect et de la protection de l'environnement, être soucieux du futur*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⚠️ Le développement durable: l'eau | ⬜ Les ressources minières | ⬜ La gestion des déchets |
| 2 | Le village, la ville | ⚠️ Gérer l'eau au village | ⬜ Gérer les ordures au village | — |
| 3 | L'école | ⚠️ L'hygiène à l'école | — | — |
| 4 | Les métiers | — | — | — |
| 5 | Les voyages | ⚠️ La gestion durable des ressources | — | — |
| 6 | La santé | ⚠️ Les écosystèmes | — | — |
| 7 | Sports et loisirs | — | — | — |
| 8 | Dans l'espace | ⚠️ Le réchauffement climatique et l'effet de serre | ⬜ Les aires protégées | — |

---

## English Language

### Listening and Speaking  
`english / listening`  ·  savoir-être: *Develop the love for listening and speaking the English Language in specific contexts*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⬜ Entertainment: sing songs | ⬜ The Family | — |
| 2 | Le village, la ville | ⬜ Traditions | — | — |
| 3 | L'école | ⬜ Introductions and greetings | ⬜ Months of the school year | ⬜ Instructions |
| 4 | Les métiers | ⬜ Occupations | — | — |
| 5 | Les voyages | ⬜ Means of travelling | ⬜ Rhymes and numbers 101-150 | — |
| 6 | La santé | ⬜ Illnesses | ⬜ Numbers 151-200 | — |
| 7 | Sports et loisirs | ⬜ Games | ⬜ Numbers 201-250 | — |
| 8 | Dans l'espace | ⬜ Means of communication | ⬜ Numbers 251-300 | — |

### Reading  
`english / reading`  ·  savoir-être: *Show love for reading*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⬜ The Family | — | — |
| 2 | Le village, la ville | ⬜ A village | — | — |
| 3 | L'école | ⬜ Classroom instructions | — | — |
| 4 | Les métiers | ⬜ Occupations | — | — |
| 5 | Les voyages | ⬜ Travelling | — | — |
| 6 | La santé | ⬜ Illnesses | — | — |
| 7 | Sports et loisirs | ⬜ Games | — | — |
| 8 | Dans l'espace | ⬜ Means of communication | — | — |

### Writing  
`english / writing`  ·  savoir-être: *Show the interest to write*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⬜ The nuclear family | — | — |
| 2 | Le village, la ville | ⬜ Traditions | — | — |
| 3 | L'école | ⬜ Paragraph and instructions | — | — |
| 4 | Les métiers | ⬜ Occupations | — | — |
| 5 | Les voyages | ⬜ Means of transport | — | — |
| 6 | La santé | ⬜ Illnesses | — | — |
| 7 | Sports et loisirs | ⬜ Games | — | — |
| 8 | Dans l'espace | ⬜ Communication | — | — |

### Grammar and Vocabulary  
`english / grammar`  ·  savoir-être: *Show interest in acquiring new words*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⬜ Nouns: irregular plurals | ⬜ Vocabulary: opposites | — |
| 2 | Le village, la ville | ⬜ Verb conjugation: past and present continuous | — | — |
| 3 | L'école | ⬜ Adjectives: comparatives and superlatives | — | — |
| 4 | Les métiers | ⬜ Adverbs | — | — |
| 5 | Les voyages | ⬜ Pronouns | — | — |
| 6 | La santé | ⬜ Conjunctions | — | — |
| 7 | Sports et loisirs | ⬜ Interjections | — | — |
| 8 | Dans l'espace | ⬜ Punctuation | — | — |

---

## Langues et cultures nationales

### Langue nationale  
`langues / langue-nationale`  ·  savoir-être: *Être enraciné dans sa culture*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⬜ Les phénomènes naturels physiques | ⬜ La vie végétale | ⬜ La vie animale |
| 2 | Le village, la ville | ⬜ Le village et ses traditions | ⬜ La ville | ⬜ La sécurité |
| 3 | L'école | ⬜ Les enseignements | ⬜ Les apprentissages | ⬜ L'utilité de l'école |
| 4 | Les métiers | ⬜ Les artisans | ⬜ Les professionnels | ⬜ La création des entreprises |
| 5 | Les voyages | ⬜ Les moyens et voies de communication | ⬜ Les émotions du voyage | — |
| 6 | La santé | ⬜ La santé | ⬜ Les maladies | ⬜ L'industrie du médicament |
| 7 | Sports et loisirs | ⬜ Les sports de compétition | ⬜ Les loisirs pour jeunes | — |
| 8 | Dans l'espace | ⬜ Le système solaire | — | — |

---

## Sciences humaines et sociales

### Éducation morale  
`shs / morale`  ·  savoir-être: *Avoir le sens de la vie harmonieuse en collectivité*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⬜ Le respect de soi et des autres | ⬜ La propreté | ⬜ L'estime de soi |
| 2 | Le village, la ville | ⬜ La propreté du village | ⬜ L'opinion d'autrui | ⬜ Le bien et le mal |
| 3 | L'école | ⬜ La propreté de l'école | ⬜ L'endurance | ⬜ L'obéissance |
| 4 | Les métiers | ⬜ La sincérité | ⬜ L'honnêteté | ⬜ L'initiative |
| 5 | Les voyages | ⬜ La sincérité en voyage | ⬜ La serviabilité | ⬜ La modestie |
| 6 | La santé | ⬜ L'honnêteté et la maladie | ⬜ L'estime de soi | — |
| 7 | Sports et loisirs | ⬜ L'endurance dans le jeu | ⬜ L'honnêteté dans le jeu | — |
| 8 | Dans l'espace | ⬜ L'honnêteté en communication | ⬜ L'opinion d'autrui | — |

### Droits et devoirs de l'enfant  
`shs / droits`  ·  savoir-être: *Être humaniste et avoir le sens de la justice*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⬜ Droit au refuge et à des conditions décentes | ⬜ Droit à une famille | — |
| 2 | Le village, la ville | ⬜ Droit à un nom et une identité | — | — |
| 3 | L'école | ⬜ Droit à l'école | — | — |
| 4 | Les métiers | ⬜ Droit à la protection | — | — |
| 5 | Les voyages | — | — | — |
| 6 | La santé | ⬜ Droit à la santé | — | — |
| 7 | Sports et loisirs | ⬜ Droit au jeu et aux loisirs | — | — |
| 8 | Dans l'espace | ⬜ Droit à la liberté d'expression | — | — |

### Éducation à la paix et à la sécurité  
`shs / paix`  ·  savoir-être: *Être tolérant, pacifique et prudent*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⬜ La paix à la maison | ⬜ La sécurité à la maison | — |
| 2 | Le village, la ville | ⬜ La paix au village et en ville | ⬜ La sécurité (code de la route) | — |
| 3 | L'école | ⬜ La paix à l'école | ⬜ La sécurité à l'école | — |
| 4 | Les métiers | ⬜ La paix dans la communauté | ⬜ La sécurité dans les métiers | — |
| 5 | Les voyages | ⬜ La paix en voyage | ⬜ La sécurité en voyage | — |
| 6 | La santé | ⬜ La paix dans les formations sanitaires | ⬜ La sécurité dans les formations sanitaires | — |
| 7 | Sports et loisirs | ⬜ La paix pendant les jeux et le sport | ⬜ La sécurité pendant les jeux et le sport | — |
| 8 | Dans l'espace | ⬜ La paix en communication | — | — |

### Éducation à la citoyenneté  
`shs / citoyennete`  ·  savoir-être: *Avoir l'amour de la patrie*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⬜ La démocratie | ⬜ Les emblèmes de la nation | — |
| 2 | Le village, la ville | ⬜ La démocratie (village/ville) | ⬜ L'intégration nationale et le vivre ensemble | — |
| 3 | L'école | ⬜ La démocratie (école) | ⬜ Les pouvoirs de l'État | — |
| 4 | Les métiers | ⬜ Les élections | ⬜ Les autorités administratives | — |
| 5 | Les voyages | ⬜ L'intégration nationale en voyage | ⬜ Les institutions internationales | — |
| 6 | La santé | — | — | — |
| 7 | Sports et loisirs | ⬜ L'intégration nationale (jeux et sport) | — | — |
| 8 | Dans l'espace | — | — | — |

### Règles et règlements  
`shs / regles-reglements`  ·  savoir-être: *Respecter les règles et la réglementation en vigueur*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⬜ Les règles | — | — |
| 2 | Le village, la ville | ⬜ La loi | — | — |
| 3 | L'école | ⬜ Le règlement intérieur de l'école | — | — |
| 4 | Les métiers | ⬜ Les règles dans les métiers | ⬜ Les actes administratifs | — |
| 5 | Les voyages | — | — | — |
| 6 | La santé | — | — | — |
| 7 | Sports et loisirs | ⬜ Les règles de jeu | — | — |
| 8 | Dans l'espace | ⬜ Les règles de communication | — | — |

### Histoire  
`shs / histoire`  ·  savoir-être: *Avoir une ouverture d'esprit*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⬜ La préhistoire | ⬜ Les grandes civilisations africaines | ⬜ La révolution industrielle |
| 2 | Le village, la ville | ⬜ Les inventions et les découvertes | ⬜ La traite des noirs | ⬜ Les européens sur la côte du Cameroun |
| 3 | L'école | ⬜ La conférence de Berlin | — | — |
| 4 | Les métiers | ⬜ Les allemands au Cameroun | — | — |
| 5 | Les voyages | ⬜ La résistance à la colonisation | — | — |
| 6 | La santé | ⬜ La première guerre mondiale | ⬜ Le régime de mandat | — |
| 7 | Sports et loisirs | ⬜ La deuxième guerre mondiale | ⬜ Le régime de tutelle | — |
| 8 | Dans l'espace | ⬜ Le Cameroun indépendant | — | — |

### Géographie physique  
`shs / geographie-physique`  ·  savoir-être: *Avoir un esprit inventif*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⬜ Le plan et la carte | ⬜ Le relief du Cameroun | — |
| 2 | Le village, la ville | ⬜ L'hydrographie du Cameroun | — | — |
| 3 | L'école | ⬜ Le climat | ⬜ Le relief et le climat local | — |
| 4 | Les métiers | — | — | — |
| 5 | Les voyages | ⬜ Les régions naturelles du Cameroun | — | — |
| 6 | La santé | — | — | — |
| 7 | Sports et loisirs | — | — | — |
| 8 | Dans l'espace | — | — | — |

### Géographie humaine  
`shs / geographie-humaine`  ·  savoir-être: *Avoir une pensée créative*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⬜ La population du Cameroun | — | — |
| 2 | Le village, la ville | ⬜ Les villes et villages du Cameroun | — | — |
| 3 | L'école | ⬜ Les problèmes des villes et villages | — | — |
| 4 | Les métiers | — | — | — |
| 5 | Les voyages | — | — | — |
| 6 | La santé | ⬜ La population (natalité, mortalité) | — | — |
| 7 | Sports et loisirs | — | — | — |
| 8 | Dans l'espace | ⬜ La répartition de la population | — | — |

### Géographie économique  
`shs / geographie-economique`  ·  savoir-être: *Être entreprenant*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⬜ Les ressources économiques du Cameroun | — | — |
| 2 | Le village, la ville | ⬜ Les zones agricoles et pastorales | — | — |
| 3 | L'école | ⬜ Les zones d'exploitation minière | — | — |
| 4 | Les métiers | ⬜ Les zones d'exploitation | — | — |
| 5 | Les voyages | ⬜ Le commerce et les transports | — | — |
| 6 | La santé | ⬜ Les problèmes de transport et le commerce | — | — |
| 7 | Sports et loisirs | ⬜ Les formes de monnaie | — | — |
| 8 | Dans l'espace | ⬜ Le commerce électronique | — | — |

---

## TIC

### Environnements informatiques  
`tic / env-info`  ·  savoir-être: *Avoir un esprit critique et être créatif*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⬜ Les périphériques de l'ordinateur | ⬜ Connecter les périphériques | — |
| 2 | Le village, la ville | ⬜ Le logiciel de traitement de texte | — | — |
| 3 | L'école | ⬜ Les fichiers | ⬜ Stockage et récupération | — |
| 4 | Les métiers | ⬜ Le logiciel de présentation | — | — |
| 5 | Les voyages | — | — | — |
| 6 | La santé | ⬜ Les calculs avec un tableur | — | — |
| 7 | Sports et loisirs | — | — | — |
| 8 | Dans l'espace | — | — | — |

### Production avec les outils TIC  
`tic / production-tic`  ·  savoir-être: *Être créatif*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⬜ Document texte | — | — |
| 2 | Le village, la ville | ⬜ Insérer image et tableau | — | — |
| 3 | L'école | ⬜ Feuille de calcul | — | — |
| 4 | Les métiers | ⬜ Le dessin numérique | — | — |
| 5 | Les voyages | ⬜ Créer une diapositive | — | — |
| 6 | La santé | ⬜ Présentation assistée | — | — |
| 7 | Sports et loisirs | ⬜ Produire une présentation | — | — |
| 8 | Dans l'espace | ⬜ PowerPoint | — | — |

### Internet et communication  
`tic / internet`  ·  savoir-être: *Avoir la culture numérique*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | — | — | — |
| 2 | Le village, la ville | — | — | — |
| 3 | L'école | — | — | — |
| 4 | Les métiers | ⬜ Internet | ⬜ Le courrier électronique | — |
| 5 | Les voyages | ⬜ Le logiciel de messagerie | ⬜ La recherche sur Internet | — |
| 6 | La santé | ⬜ La recherche sur Internet | — | — |
| 7 | Sports et loisirs | ⬜ Les réseaux sociaux | — | — |
| 8 | Dans l'espace | ⬜ La recherche d'information | — | — |

### Santé, sécurité et éthique  
`tic / sante-securite-ethique`  ·  savoir-être: *Être prudent et intègre*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⬜ Sécurité des appareils électroniques | ⬜ Hygiène des appareils électroniques | — |
| 2 | Le village, la ville | ⬜ Éthique des outils TIC | — | — |
| 3 | L'école | ⬜ Loi et droits d'auteur | — | — |
| 4 | Les métiers | ⬜ Éthique des communications | — | — |
| 5 | Les voyages | ⬜ La cybercriminalité | — | — |
| 6 | La santé | ⬜ Éthique d'Internet | — | — |
| 7 | Sports et loisirs | — | — | — |
| 8 | Dans l'espace | ⬜ Sécurité et éthique en ligne | — | — |

### Notions de programmation  
`tic / programmation`  ·  savoir-être: *Être créatif*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | — | — | — |
| 2 | Le village, la ville | — | — | — |
| 3 | L'école | — | — | — |
| 4 | Les métiers | — | — | — |
| 5 | Les voyages | — | — | — |
| 6 | La santé | ⬜ Notions de programmation | ⬜ L'algorithme numérique | — |
| 7 | Sports et loisirs | — | — | — |
| 8 | Dans l'espace | ⬜ Le logiciel de programmation (Scratch) | — | — |

---

## Éducation artistique

### Arts visuels  
`arts / arts-visuels`  ·  savoir-être: *Avoir le goût du beau et être créatif*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⬜ Techniques picturales | — | — |
| 2 | Le village, la ville | ⬜ Techniques picturales: enduire | — | — |
| 3 | L'école | ⬜ Sculpture: entailler | — | — |
| 4 | Les métiers | ⬜ Sculpture: imprimer et modeler | — | — |
| 5 | Les voyages | ⬜ Traitement avec les TIC | — | — |
| 6 | La santé | ⬜ Traitement avec les TIC: colorier | — | — |
| 7 | Sports et loisirs | ⬜ Restauration d'œuvres | — | — |
| 8 | Dans l'espace | ⬜ Restauration d'œuvres (suite) | — | — |

### Musique  
`arts / musique`  ·  savoir-être: *Avoir le goût du beau et être créatif*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⬜ Les notes | — | — |
| 2 | Le village, la ville | ⬜ Les notes: chanter | — | — |
| 3 | L'école | ⬜ La portée musicale | — | — |
| 4 | Les métiers | ⬜ Les figures de notes | — | — |
| 5 | Les voyages | ⬜ Les altérations | — | — |
| 6 | La santé | ⬜ Les figures des silences | — | — |
| 7 | Sports et loisirs | ⬜ Les mesures | — | — |
| 8 | Dans l'espace | ⬜ Les instruments de musique | — | — |

### Arts dramatiques  
`arts / arts-dramatiques`  ·  savoir-être: *Avoir le sens de l'humour et être rigoureux dans le respect des normes artistiques*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⬜ Les voix et les attitudes | — | — |
| 2 | Le village, la ville | ⬜ Les gestes | — | — |
| 3 | L'école | ⬜ Les gestes et attitudes | — | — |
| 4 | Les métiers | ⬜ Les voix, gestes et attitudes | — | — |
| 5 | Les voyages | ⬜ Les sketches | — | — |
| 6 | La santé | ⬜ Les sketches (suite) | — | — |
| 7 | Sports et loisirs | ⬜ Figures du théâtre camerounais | — | — |
| 8 | Dans l'espace | ⬜ Figures du théâtre camerounais (suite) | — | — |

### Danse  
`arts / danse`  ·  savoir-être: *Avoir le sens du rythme, de l'esthétique et de l'harmonie dans les mouvements de son corps*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⬜ Pas de danse | — | — |
| 2 | Le village, la ville | ⬜ Danses traditionnelles | — | — |
| 3 | L'école | ⬜ Pas de danse (suite) | — | — |
| 4 | Les métiers | ⬜ Danses modernes | — | — |
| 5 | Les voyages | ⬜ Danses modernes (suite) | — | — |
| 6 | La santé | ⬜ Les rythmes | — | — |
| 7 | Sports et loisirs | ⬜ Les rythmes (suite) | — | — |
| 8 | Dans l'espace | ⬜ Les rythmes (approfondissement) | — | — |

---

## Éducation physique et sportive

### Activités athlétiques  
`eps / athletisme`  ·  savoir-être: *Avoir le goût de l'effort, la maîtrise de ses émotions et l'esprit de fairplay*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⬜ L'athlétisme | ⬜ La course de vitesse | — |
| 2 | Le village, la ville | ⬜ La course d'endurance-vitesse | ⬜ Le lancer de poids | — |
| 3 | L'école | ⬜ Le saut en hauteur | ⬜ La gymnastique au sol | — |
| 4 | Les métiers | — | — | — |
| 5 | Les voyages | — | — | — |
| 6 | La santé | — | — | — |
| 7 | Sports et loisirs | — | — | — |
| 8 | Dans l'espace | — | — | — |

### Sports collectifs  
`eps / sports-co`  ·  savoir-être: *Avoir le goût de l'effort, la maîtrise de ses émotions et l'esprit de fairplay*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | — | — | — |
| 2 | Le village, la ville | — | — | — |
| 3 | L'école | — | — | — |
| 4 | Les métiers | ⬜ Les sports collectifs: le football | — | — |
| 5 | Les voyages | ⬜ Le basket-ball | — | — |
| 6 | La santé | ⬜ Le handball | — | — |
| 7 | Sports et loisirs | ⬜ Le volley-ball | — | — |
| 8 | Dans l'espace | — | — | — |

### Techniques d'autodéfense  
`eps / autodefense`  ·  savoir-être: *Être vigilant et avoir le sens de l'autodéfense*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⬜ Les feintes: le déplacement | — | — |
| 2 | Le village, la ville | ⬜ Les feintes: le déplacement (suite) | — | — |
| 3 | L'école | ⬜ Les feintes: la frappe | — | — |
| 4 | Les métiers | ⬜ Les feintes: la frappe (suite) | — | — |
| 5 | Les voyages | ⬜ Les feintes: la peur | — | — |
| 6 | La santé | ⬜ Les feintes (combinées) | — | — |
| 7 | Sports et loisirs | ⬜ Les mains: dégager | — | — |
| 8 | Dans l'espace | ⬜ Les mains: bloquer | — | — |

---

## Développement personnel

### Artisanat et constructions  
`devperso / artisanat`  ·  savoir-être: *Être inventif et avoir l'esprit d'initiative*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⬜ La poterie | ⬜ La décoration | ⬜ Construction artistique |
| 2 | Le village, la ville | ⬜ Construction artistique | — | — |
| 3 | L'école | ⬜ La poterie et le pliage | — | — |
| 4 | Les métiers | ⬜ La vannerie | — | — |
| 5 | Les voyages | ⬜ Construction artistique | — | — |
| 6 | La santé | ⬜ Construction artistique | — | — |
| 7 | Sports et loisirs | ⬜ Construction artistique | — | — |
| 8 | Dans l'espace | — | — | — |

### Activités agropastorales  
`devperso / agropastoral-dp`  ·  savoir-être: *Être inventif, avoir l'esprit d'initiative et être entreprenant*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⬜ L'élevage des animaux | — | — |
| 2 | Le village, la ville | ⬜ Le jardin et l'élevage | — | — |
| 3 | L'école | ⬜ L'entretien des plantes | — | — |
| 4 | Les métiers | ⬜ La provende et les cultures | — | — |
| 5 | Les voyages | ⬜ L'entretien des plantes et l'élevage | — | — |
| 6 | La santé | ⬜ L'entretien des plantes et l'élevage | — | — |
| 7 | Sports et loisirs | ⬜ La conservation des récoltes | — | — |
| 8 | Dans l'espace | — | — | — |

### Activités domestiques  
`devperso / domestique`  ·  savoir-être: *Être méticuleux*

| Unité | Thème | S1 | S2 | S3 |
|---|---|---|---|---|
| 1 | La nature | ⬜ Entretien du milieu de vie | — | — |
| 2 | Le village, la ville | ⬜ Entretien du village/quartier | — | — |
| 3 | L'école | ⬜ Entretien de la classe et de l'école | — | — |
| 4 | Les métiers | ⬜ La broderie | — | — |
| 5 | Les voyages | ⬜ La couture | — | — |
| 6 | La santé | — | — | — |
| 7 | Sports et loisirs | ⬜ Les mets | — | — |
| 8 | Dans l'espace | ⬜ Les mets (suite) | — | — |

---

## Priority order for content production
1. **Re-align the legacy week-1 lessons** in Français, Maths, Sciences so each unit's week-1 lesson matches its new S1 topic, then **create the S2 and S3 lessons** for those units.
2. **Maths / Nombres et calculs U3–U8** — split into 3 weekly lessons (U1–U2 already done).
3. **Fill the empty subjects** (English, Langue nationale, SHS, TIC, Arts, EPS, Dév. personnel) — topics are ready.