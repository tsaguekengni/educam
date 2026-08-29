// ============================================================================
// EduCam — produit `preview-en.html` à partir de `preview-static.html`.
//
// POURQUOI UN SCRIPT ET PAS UNE TRADUCTION À LA MAIN
// Les captures de la plaquette anglaise doivent montrer une interface anglaise.
// La page `preview-static.html` est le rendu statique des dix écrans réels ;
// la retraduire à la main une fois suffirait, mais elle sera regénérée à chaque
// évolution de l'interface. Ce fichier est donc la table de correspondance
// française → anglaise, rejouable.
//
// CHOIX ASSUMÉ : SOUS-SYSTÈME ANGLOPHONE
// Ce n'est pas une traduction mot à mot. Le sous-système anglophone camerounais
// n'a ni CM1 ni « école publique de Deido » : il a Class 5 et Government School
// Buea. Les noms des personnes, des classes et des matières changent donc aussi.
//
//   CM1  → Class 5      CE1 → Class 3      CE2 → Class 4      CM2 → Class 6
//   Littoral → South-West        École publique de Deido → Government School Buea
//   Mme Kamga → Mrs. Ngwa        M. Atangana (Directeur) → Mr. Ashu (Head Teacher)
//   M. Abena (parent) → Mr. Ebong        Junior ABENA → Junior EBONG
//   Amadou & Aïcha → Ayuk & Bih          galette → loaf of bread
//
// ATTENTION À L'ORDRE. Les remplacements sont appliqués dans l'ordre du tableau :
// les chaînes longues d'abord, sinon « CM1 » mange « CM1-A ».
// ============================================================================

import fs from 'fs';

const T = [
  // ---- titre de page ------------------------------------------------------
  ['EduCam - Plateforme Éducative du Cameroun', 'EduCam — Cameroon Education Platform'],
  ['<html lang="fr"', '<html lang="en"'],

  // ---- classes : le plus long d'abord ------------------------------------
  ['Classe CM1-A', 'Class 5A'],
  ['Unité 3 · Semaine 2 · CM1-A', 'Unit 3 · Week 2 · Class 5A'],
  ['CM1-A', 'Class 5A'], ['CM1-B', 'Class 5B'],
  ['CE1-A', 'Class 3A'], ['CE2-A', 'Class 4A'], ['CM2-A', 'Class 6A'],
  ['CM1 · Littoral', 'Class 5 · South-West'],
  ['MATHÉMATIQUES · CM1 · UNITÉ 3', 'MATHEMATICS · CLASS 5 · UNIT 3'],
  ['Mercredi 12 novembre · Unité 3 · Semaine 2 · CM1', 'Wednesday 12 November · Unit 3 · Week 2 · Class 5'],

  // ---- personnes et établissement ----------------------------------------
  // Les initiales de l'avatar sont dans un <span> nu : on les prend AVEC leur
  // contexte, sinon « MK » se remplacerait n'importe où dans le fichier.
  ['<span>MK</span>', '<span>MN</span>'],
  ['<span>DA</span>', '<span>MA</span>'],
  ['<span>PA</span>', '<span>ME</span>'],
  ['Mme Kamga', 'Mrs. Ngwa'], ['Mme Bella', 'Mrs. Bate'], ['M. Ndombele', 'Mr. Ndip'],
  ['M. Atangana', 'Mr. Ashu'], ['Directeur · Ép. Deido', 'Head Teacher · GS Buea'],
  ['École publique de Deido', 'Government School Buea'],
  ['Ép. publique de Deido', 'Government School Buea'],
  ['marché de Deido', 'Buea market'],
  ['Bonjour Michèle', 'Hello Grace'],
  ['M. Abena', 'Mr. Ebong'], ['Parent de Junior', "Junior's parent"],
  ['Bonjour Paul', 'Hello Peter'],
  ['Junior ABENA', 'Junior EBONG'],
  ['ABENA Patrick', 'AGBOR Patrick'], ['BEKOLO Marie', 'BESONG Mary'],
  ['FOUDA Jean', 'EBOT John'], ['KAMDEM Joseph', 'FONGANG Joseph'],
  ['MBALLA Christiane', 'MBUA Christiana'], ['NGONO Alice', 'NGWESE Alice'],
  ['NKOLO Bernard', 'NJIE Bernard'], ['TCHOUA Rose', 'TABE Rose'], ['SAMA Éric', 'SAMA Eric'],
  ['Amadou', 'Ayuk'], ['Aïcha', 'Bih'],

  // ---- navigation ---------------------------------------------------------
  ['Ma classe', 'My class'], ['Accueil', 'Home'], ['Emploi du temps', 'Timetable'],
  ['Programme', 'Syllabus'], ['Suivi de Junior ABENA · CM1-A · Ép. publique de Deido', 'Junior EBONG · Class 5A · Government School Buea'],
  ['Suivi de Junior ABENA · CM1-A', 'Junior EBONG · Class 5A'],
  ['Suivi', 'Tracking'],
  ['Résultats', 'Results'], ['Messagerie', 'Messages'],
  ['Espace famille', 'Family space'], ['Révisions', 'Revision'],
  ['Piloter', 'Steer'], ['Administrer', 'Administer'],
  ['Tableau de bord', 'Dashboard'], ['Avancement des classes', 'Class progress'],
  ['Élèves à suivre en priorité', 'Pupils to watch first'],
  ['Élèves à suivre', 'Pupils to watch'], ['Gérer l&#x27;école', 'Manage school'],
  ['École', 'School'],

  // ---- accueil enseignant -------------------------------------------------
  ['Hors ligne prêt · 5 jours', 'Offline ready · 5 days'],
  ['dans 25 min', 'in 25 min'],
  ['Prochain cours', 'Next lesson'],
  ['Mathématiques — Fractions', 'Mathematics — Fractions'],
  ['Comprendre et utiliser les fractions simples (1/2, 1/4) · téléchargée hors ligne',
   'Understand and use simple fractions (1/2, 1/4) · downloaded for offline use'],
  ['Objectifs de la leçon', 'Lesson objectives'],
  ['Identifier une fraction comme un partage équitable d&#x27;une unité.',
   'Identify a fraction as an equal share of one whole.'],
  ['Représenter 1/2 et 1/4 sur des figures simples.',
   'Show 1/2 and 1/4 on simple shapes.'],
  ['Avancement de la journée', "Progress through the day"],
  ['cours 3 sur 7', 'lesson 3 of 7'],
  ['Plan de la séance', 'Lesson plan'],
  ['Activité découverte — plier la bande de papier', 'Discovery activity — folding the paper strip'],
  ['Bilan à recopier dans le cahier', 'Summary to copy into the exercise book'],
  ['Ouvrir la leçon', 'Open the lesson'],
  ['Marquer enseignée', 'Mark as taught'],
  ['Mode projecteur', 'Projector mode'],
  ['Suite de la journée', 'Rest of the day'],
  ['Cours aujourd&#x27;hui', 'Lessons today'],
  ['prochain à 09 h 00', 'next at 09:00'],
  ['Moyenne de classe', 'Class average'],
  ['sur 36 élèves', 'across 36 pupils'],
  ['sous 10/20', 'below 10/20'],
  ['5 jours restants', '5 days left'],
  ['Hors ligne', 'Offline'],
  ['téléchargée', 'downloaded'], ['prête', 'ready'],

  // ---- matières -----------------------------------------------------------
  ['Mathématiques', 'Mathematics'], ['Français', 'French'],
  ['Sciences humaines et sociales', 'Social Studies'],
  ['Sciences', 'Science'], ['Grammaire', 'Grammar'],
  ['La matière', 'States of matter'], ['EPS', 'PE'], ['Jeux collectifs', 'Team games'],
  ['SHS', 'Social Studies'], ['Le quartier et ses métiers', 'Our neighbourhood and its trades'],
  ['TIC', 'ICT'], ['Découvrir le clavier', 'Getting to know the keyboard'],
  ['Les états de la matière', 'States of matter'],
  ['l&#x27;accord du verbe', 'subject–verb agreement'],
  ['Fractions simples', 'Simple fractions'],
  ['Récréation', 'Break'], ['Pause déjeuner', 'Lunch break'],

  // ---- mode projecteur ----------------------------------------------------
  ['Section 1 sur 4', 'Section 1 of 4'],
  ['Comprendre les fractions simples', 'Understanding simple fractions'],
  ['Amadou partage une galette avec Aïcha. Chacun doit avoir la',
   'Ayuk shares a loaf of bread with Bih. Each must get the'],
  ['même part', 'same share'],
  ['. Combien de parts égales faut-il faire ?', '. How many equal parts must we make?'],
  ['2 parts égales', '2 equal parts'], ['4 parts égales', '4 equal parts'],
  ['Prends une bande de papier. Plie-la en deux parties parfaitement égales.',
   'Take a strip of paper. Fold it into two perfectly equal parts.'],

  // ---- lecteur de leçon ---------------------------------------------------
  ['Mathématiques · Fractions', 'Mathematics · Fractions'],
  ['Comprendre et utiliser les fractions simples', 'Understand and use simple fractions'],
  ['Unité 3 · Semaine 2 · 45 minutes · téléchargée hors ligne',
   'Unit 3 · Week 2 · 45 minutes · downloaded for offline use'],
  ['1. Activité découverte', '1. Discovery activity'],
  ['Amadou revient du marché de Deido avec une galette. Sa sœur Aïcha l&#x27;attend. « On la partage ? » demande Amadou. Mais attention : chacun doit recevoir exactement la même part, sinon ce n&#x27;est pas juste.',
   'Ayuk comes back from Buea market with a loaf of bread. His sister Bih is waiting. “Shall we share it?” asks Ayuk. But careful: each one must get exactly the same share, otherwise it is not fair.'],
  ['Quand on partage une chose entière en', 'When we share one whole thing into'],
  ['deux parts égales', 'two equal parts'],
  [', chaque part s&#x27;appelle', ', each part is called'],
  ['une moitié', 'a half'],
  ['. On l&#x27;écrit', '. We write it'],
  ['. Si on partage en quatre parts égales, chaque part est',
   '. If we share it into four equal parts, each part is'],
  ['un quart', 'a quarter'],
  [', et on écrit', ', and we write'],
  ['Bilan — à recopier dans le cahier', 'Summary — copy into the exercise book'],
  ['Une fraction représente un partage en parts égales.', 'A fraction is a share in equal parts.'],
  ['se lit « une moitié ».', 'is read “a half”.'],
  ['se lit « un quart ».', 'is read “a quarter”.'],
  ['Deux quarts font une moitié : 1/4 + 1/4 = 1/2.', 'Two quarters make a half: 1/4 + 1/4 = 1/2.'],
  ['Marquer la leçon comme enseignée', 'Mark this lesson as taught'],
  ['Quiz de préparation · 80 %', 'Preparation quiz · 80%'],
  ['Sommaire', 'Contents'],
  ['2. Ce qu&#x27;il faut retenir', '2. What to remember'],
  ['3. Exercices d&#x27;application', '3. Practice exercises'],
  ['4. Bilan à recopier', '4. Summary to copy'],
  ['Leçon disponible hors ligne — 1,2 Mo téléchargés.', 'Lesson available offline — 1.2 MB downloaded.'],

  // ---- emploi du temps / hors ligne ---------------------------------------
  ['Préparer la semaine', 'Prepare the week'],
  ['Téléchargez les leçons à l&#x27;avance : elles resteront disponibles en classe même sans connexion.',
   'Download the lessons ahead of time: they stay available in class even with no connection.'],
  ['Leçons de la semaine', 'Lessons this week'],
  ['≈ 3,4 Mo à télécharger', '≈ 3.4 MB to download'],
  ['Télécharger la semaine', 'Download the week'],
  ['Accès hors ligne actif —', 'Offline access on —'],
  ['. Le retour en ligne est automatique dès que le réseau revient.',
   '. Syncing resumes on its own as soon as the network is back.'],
  ['5 jours restants', '5 days left'],
  ['Mercredi 12 novembre', 'Wednesday 12 November'],
  ['7 cours · 2 pauses', '7 lessons · 2 breaks'],
  ['Reading comprehension', 'Reading comprehension'],

  // ---- saisie des résultats ----------------------------------------------
  ['Saisie des résultats', 'Entering results'],
  ['Mathématiques — Fractions simples · contrôle sur 10 · 36 élèves',
   'Mathematics — Simple fractions · test out of 10 · 36 pupils'],
  ['Le contrôle du jour', "Today's test"],
  ['Cinq questions, corrigées ensemble en classe. La saisie prend une trentaine de secondes pour toute la classe.',
   'Five questions, marked together in class. Entering the whole class takes about thirty seconds.'],
  ['Saisis', 'Entered'],
  ['il reste 32 élèves', '32 pupils left'],
  ['À suivre', 'To watch'],
  ['sous 50 % de bonnes réponses', 'below 50% correct'],
  ['Tout marquer acquis', 'Mark all as got it'],
  ['puis corrigez seulement les élèves en difficulté', 'then correct only the pupils who struggled'],
  ['Raccourcis clavier', 'Keyboard shortcuts'],
  ['Acquis · 10/10', 'Got it · 10/10'],
  ['À renforcer · 4/10', 'Needs work · 4/10'],
  ['Non acquis · 0/10', 'Not yet · 0/10'],
  ['Acquis', 'Got it'], ['À renforcer', 'Needs work'], ['Non acquis', 'Not yet'],
  ['non saisi', 'not entered'],

  // ---- vue classe ---------------------------------------------------------
  ['Ma classe — vue d&#x27;ensemble', 'My class — overview'],
  ['36 élèves · 28 contrôles depuis la rentrée', '36 pupils · 28 tests since the start of the year'],
  ['Moyenne de la classe', 'Class average'],
  ['+0,6 depuis octobre', '+0.6 since October'],
  ['Élèves évalués', 'Pupils assessed'],
  ['sur 36 inscrits', 'of 36 enrolled'],
  ['Leçons enseignées', 'Lessons taught'],
  ['sur 32 prévues', 'of 32 planned'],
  ['Répartition des élèves', 'Spread of pupils'],
  ['&lt; 8 : 2 élèves', '&lt; 8 : 2 pupils'],
  ['8-10 : 2 élèves', '8-10 : 2 pupils'],
  ['10-12 : 7 élèves', '10-12 : 7 pupils'],
  ['12-14 : 11 élèves', '12-14 : 11 pupils'],
  ['14-16 : 9 élèves', '14-16 : 9 pupils'],
  ['16+ : 5 élèves', '16+ : 5 pupils'],
  ['5 leçons à revoir', '5 lessons to redo'],
  ['4 leçons à revoir', '4 lessons to redo'],
  ['3 leçons à revoir', '3 lessons to redo'],
  ['2 leçons à revoir', '2 lessons to redo'],

  // ---- tableau de bord direction -----------------------------------------
  ['218 élèves · 5 classes évaluées', '218 pupils · 5 classes assessed'],
  ['Une classe demande votre attention', 'One class needs your attention'],
  ['accuse', 'is'],
  ['3 semaines de retard', '3 weeks behind'],
  ['sur l&#x27;unité 3.', 'on unit 3.'],
  ['Ouvrir la console de l&#x27;école', 'Open the school console'],
  ['Élèves suivis', 'Pupils tracked'],
  ['196 avec au moins un résultat', '196 with at least one result'],
  ['Moyenne de l&#x27;école', 'School average'],
  ['Élèves sous la moyenne', 'Pupils below average'],
  ['21 % des élèves évalués', '21% of pupils assessed'],
  ['Classes à rattraper', 'Classes to catch up'],
  ['sur 5 classes suivies', 'of 5 classes tracked'],
  ['Avance et retard sur la répartition', 'Ahead of and behind the scheme of work'],
  ['Écart estimé en semaines entre les leçons réellement enseignées et le calendrier officiel.',
   'Estimated gap, in weeks, between the lessons actually taught and the official calendar.'],
  ['à jour', 'on track'],
  ['+1 sem', '+1 wk'], ['−1 sem', '−1 wk'], ['−3 sem', '−3 wk'],
  ['En retard', 'Behind'], ['À jour', 'On track'], ['En avance', 'Ahead'],
  ['Pas encore commencé', 'Not started'],
  ['Aperçu des classes', 'Classes at a glance'],
  ['38 élèves', '38 pupils'], ['34 élèves', '34 pupils'],
  ['36 élèves · en retard', '36 pupils · behind'],
  ['Signalement pédagogique', 'Teaching alert'],
  ['Les fractions simples', 'Simple fractions'],
  ['42 % d&#x27;échec', '42% failure'],
  ['sur 38 contrôles. À reprendre en classe.', 'across 38 tests. Worth going over again in class.'],

  // ---- espace parent ------------------------------------------------------
  ['Cette semaine,', 'This week,'],
  ['a été évalué sur', 'was assessed on'],
  ['5 leçons', '5 lessons'],
  ['. Tout va bien en', '. All is well in'],
  ['français', 'French'],
  ['. Une leçon est à revoir à la maison :', '. One lesson needs going over at home:'],
  ['. Une leçon est à revoir :', '. One lesson to go over:'],
  ['les fractions simples', 'simple fractions'],
  ['les fractions', 'fractions'],
  ['Comment l&#x27;aider, concrètement', 'How to help, in practice'],
  ['Comment l&#x27;aider ce soir', 'How to help this evening'],
  ['Prenez une bande de papier. Demandez à Junior de la couper en 2 parts égales, puis en 4. Demandez-lui quelle part est la plus grande, et pourquoi.',
   'Take a strip of paper. Ask Junior to cut it into 2 equal parts, then into 4. Ask him which share is bigger, and why.'],
  ['Prenez une bande de papier. Demandez à Junior de la couper en 2 parts égales, puis en 4.',
   'Take a strip of paper. Ask Junior to cut it into 2 equal parts, then into 4.'],
  ['Revoir cette leçon ensemble', 'Go over this lesson together'],
  ['Moyenne de Junior', "Junior's average"],
  ['Moyenne', 'Average'],
  ['12 contrôles corrigés', '12 tests marked'],
  ['12 contrôles · 1 à revoir', '12 tests · 1 to redo'],
  ['À revoir à la maison', 'To go over at home'],
  ['À revoir', 'To redo'],
  ['à retravailler ensemble', 'to work on together'],
  ['Messages', 'Messages'], ['non lu', 'unread'],
  ['Boîte de réception', 'Inbox'],
  ['1 nouveau message ·', '1 new message ·'],
  ['Le contenu officiel de la leçon, tel que l&#x27;enseignant l&#x27;a fait en classe.',
   'The official lesson content, exactly as the teacher taught it in class.'],
  ['Les fractions simples (1/2, 1/4)', 'Simple fractions (1/2, 1/4)'],
  ['Dernier contrôle : 4/10 · 12 novembre', 'Last test: 4/10 · 12 November'],
  ['Dernier contrôle : 4/10', 'Last test: 4/10'],
  ['Leçons récemment réussies', 'Recently passed lessons'],
  ['Français — le complément d&#x27;objet direct', 'French — the direct object'],
  ['Français — le COD', 'French — direct object'],
  ['évaluée le 10 novembre', 'assessed on 10 November'],
  ['évaluée le 8 novembre', 'assessed on 8 November'],
  ['Sciences — les états de l&#x27;eau', 'Science — the states of water'],
  ['leçon', 'lesson'],

  // ---- messagerie ---------------------------------------------------------
  ['Les messages de l&#x27;école au sujet de Junior', 'Messages from the school about Junior'],
  ['Nouveaux (1)', 'New (1)'],
  ['Leçon à revoir ce soir', 'A lesson to go over this evening'],
  ['aujourd&#x27;hui, 16 h 40', 'today, 16:40'],
  ['aujourd&#x27;hui', 'today'],
  ['Nouveau', 'New'], ['Historique', 'Earlier'],
  ['Félicitations pour le contrôle de français', 'Well done on the French test'],
  ['10 novembre', '10 November'], ['6 novembre', '6 November'], ['2 novembre', '2 November'],
  ['Réunion de parents — samedi 15', 'Parents’ meeting — Saturday the 15th'],
  ['Direction ·', 'Head Teacher ·'],
  ['Fournitures du deuxième trimestre', 'Second-term supplies'],
  ['Bonjour Monsieur Abena,', 'Dear Mr. Ebong,'],
  ['Junior a eu un peu de difficulté aujourd&#x27;hui sur le partage en parts égales. N&#x27;hésitez pas à refaire le pliage de la bande de papier avec lui ce soir, cela ancre très bien la notion de moitié. Il a par ailleurs très bien réussi le contrôle de français de lundi.',
   'Junior found sharing into equal parts a little hard today. Do try the paper-strip folding with him again this evening — it fixes the idea of a half very well. He also did very well in Monday’s French test.'],
  ['Bien cordialement.', 'Kind regards.'],
  ['Ouvrir la leçon concernée', 'Open the lesson'],
  ['Répondre', 'Reply'],

  // ---- nombres : virgule décimale française → point ----------------------
  ['13,4', '13.4'], ['12,8', '12.8'], ['14,5', '14.5'], ['14,2', '14.2'],
  ['13,1', '13.1'], ['10,8', '10.8'], ['12,4', '12.4'],

  // ---- horaires : « 09 h 00 » → « 09:00 » --------------------------------
  ['09 h 00', '09:00'], ['10 h 00', '10:00'], ['11 h 00', '11:00'],
  ['13 h 20', '13:20'], ['14 h 05', '14:05'],
  ['08 h 00', '08:00'], ['08 h 45', '08:45'], ['09 h 30', '09:30'],
  ['09 h 50', '09:50'], ['10 h 35', '10:35'], ['11 h 20', '11:20'], ['12 h 05', '12:05'],
  ['13 h 20', '13:20'],

  // ---- restes -------------------------------------------------------------
  ['Unité', 'Unit'], ['Semaine', 'Week'], ['Classe', 'Class'],
  ['Élèves', 'Pupils'], ['élèves', 'pupils'],
  ['Leçons', 'Lessons'], ['leçons', 'lessons'],
];

let s = fs.readFileSync('preview-static.html', 'utf8');

// Les espaces insécables de la typographie française (U+00A0, U+202F, U+2009)
// se cachent avant « ? », « : » et dans les guillemets. Sans cette
// normalisation, une règle qui a l'air juste ne s'applique jamais.
s = s.replace(/[\u00a0\u202f\u2009]/g, ' ');

// UN SEUL PASSAGE, la plus longue chaîne d'abord.
//
// Deux pièges, tous deux payés comptant :
//   1. l'ordre — « Ouvrir la leçon » mangeait « Ouvrir la leçon concernée » ;
//   2. le rescan — en enchaînant des `replaceAll`, la règle « Classe → Class »
//      repassait sur « Classes at a glance » déjà traduit et écrivait « Classs ».
// Une alternation unique règle les deux : chaque caractère n'est examiné qu'une
// fois, et la première alternative qui correspond est la plus longue.
const regles = [...T].sort((a, b) => b[0].length - a[0].length);
const table = new Map(regles.map(([fr, en]) => [fr, en]));
const motif = new RegExp(
  regles.map(([fr]) => fr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
s = s.replace(motif, (m) => table.get(m));
fs.writeFileSync('preview-en.html', s);

// Contrôle : ce qui reste de français visible.
const sansCode = s.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
const restes = [...new Set([...sansCode.matchAll(/>([^<>]+)</g)].map((m) => m[1].trim()))]
  .filter((t) => /[àâäéèêëïîôöùûüçœÀÂÉÈÊËÏÎÔÖÙÛÜÇ]|\b(le|la|les|des|une|un|du|et|pour|dans|sur|avec|est|sont|leçon|élève|classe|semaine)\b/i.test(t));
console.log(`preview-en.html écrit · ${T.length} règles`);
if (restes.length) {
  console.log(`\n⚠ ${restes.length} chaînes encore suspectes :`);
  restes.forEach((r) => console.log('   ' + r.slice(0, 110)));
} else {
  console.log('Aucun reste de français détecté.');
}
