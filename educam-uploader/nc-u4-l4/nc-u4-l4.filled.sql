-- ============================================================
-- Nombres et Calculs - Unite 4 (Les metiers) - Lecon 4
-- « Les nombres decimaux et les fractions »
-- Media tokens are replaced with public URLs by upload-lesson.mjs,
-- producing the .filled.sql to run. Safe to re-run.
-- ============================================================

DO $$
DECLARE
  v_lesson   INTEGER;
  v_intro    INTEGER;
  v_content  INTEGER;
  v_activity INTEGER;
  v_exercise INTEGER;
BEGIN
  SELECT id INTO v_lesson FROM lessons
   WHERE subject_id='maths' AND component_id='nombres-calculs'
     AND level='cm1' AND unit_number=4;

  SELECT id INTO v_intro    FROM lesson_sections WHERE lesson_id=v_lesson AND section_type='intro';
  SELECT id INTO v_content  FROM lesson_sections WHERE lesson_id=v_lesson AND section_type='content';
  SELECT id INTO v_activity FROM lesson_sections WHERE lesson_id=v_lesson AND section_type='activity';
  SELECT id INTO v_exercise FROM lesson_sections WHERE lesson_id=v_lesson AND section_type='exercise';

  DELETE FROM lesson_sections WHERE lesson_id=v_lesson AND section_type='video';
  DELETE FROM section_blocks  WHERE section_id IN (v_intro, v_content, v_activity, v_exercise);

  -- INTRO ---------------------------------------------------------------
  INSERT INTO section_blocks (section_id, block_order, block_type, text_content, media_url, caption, alt_text) VALUES
  (v_intro, 1, 'text',
   'Quand tu achètes 1,5 kg de viande chez le boucher ou que papa met 2,5 litres d''essence dans sa moto, tu utilises des nombres décimaux. Et quand maman coupe une tarte en 4 parts égales et t''en donne 3, tu manges les 3/4 de la tarte : c''est une fraction !',
   NULL, NULL, NULL),
  (v_intro, 2, 'image', NULL,
   'https://brrutnxaizdllthgcnqm.supabase.co/storage/v1/object/public/lesson-images/nc-u4-l4/intro-boucherie.png',
   'Chez le boucher, on pèse la viande en nombres décimaux : 1,5 kg, 1,75 kg…',
   'Un boucher camerounais pèse un morceau de viande sur une balance pour un client à son étal.');

  -- CONTENT -------------------------------------------------------------
  INSERT INTO section_blocks (section_id, block_order, block_type, text_content, media_url, caption, alt_text) VALUES
  (v_content, 1, 'text',
   'PARTIE 1 — LES NOMBRES DÉCIMAUX
Un nombre décimal a une virgule qui sépare la partie entière de la partie décimale. Dans 23,457, on lit après la virgule : 4 dixièmes, 5 centièmes, 7 millièmes (regarde le tableau).
Encadrer un décimal : 23,457 est entre 23,4 et 23,5 (au dixième près), et entre 23 et 24 (à l''unité près).
Arrondir un décimal : pour arrondir 23,457 au dixième, on regarde le centième (5) : il fait monter → 23,5.
Dans la vie : l''essence à 730,5 FCFA le litre s''arrondit à 731 FCFA à l''unité ; une taille de 1,45 m s''arrondit à 1,5 m au dixième.',
   NULL, NULL, NULL),
  (v_content, 2, 'image', NULL,
   'https://brrutnxaizdllthgcnqm.supabase.co/storage/v1/object/public/lesson-images/nc-u4-l4/decimaux-tableau.svg',
   'La virgule sépare la partie entière (dizaines, unités) de la partie décimale (dixièmes, centièmes, millièmes).',
   'Tableau de numération décimale du nombre 23,457 avec la partie entière et la partie décimale.'),
  (v_content, 3, 'text',
   'PARTIE 2 — LES FRACTIONS
Une fraction, c''est le partage d''un tout en parts égales. On écrit 3/4 et on lit « trois quarts ».
Le numérateur (en haut) indique combien de parts on prend ; le dénominateur (en bas) indique en combien de parts on a partagé le tout (regarde le schéma).',
   NULL, NULL, NULL),
  (v_content, 4, 'image', NULL,
   'https://brrutnxaizdllthgcnqm.supabase.co/storage/v1/object/public/lesson-images/nc-u4-l4/fraction-trois-quarts.svg',
   'Dans 3/4 : le numérateur 3 est le nombre de parts prises, le dénominateur 4 le nombre total de parts.',
   'Un disque partagé en quatre quarts égaux dont trois sont coloriés, à côté de la fraction 3/4 annotée.'),
  (v_content, 5, 'image', NULL,
   'https://brrutnxaizdllthgcnqm.supabase.co/storage/v1/object/public/lesson-images/nc-u4-l4/partage-tarte.png',
   'Partager une tarte en 4 parts égales : chaque part est un quart.',
   'Une maman coupe une tarte ronde en quatre parts égales et en donne à des enfants.'),
  (v_content, 6, 'text',
   'LA FRACTION DÉCIMALE
Une fraction décimale a pour dénominateur 10, 100 ou 1000 : 1/10 = 0,1 ; 25/100 = 0,25 ; 7/1000 = 0,007.
On peut donc écrire un décimal sous forme de fraction : 0,5 = 5/10 = 1/2 ; 0,25 = 25/100 = 1/4 ; 0,75 = 75/100 = 3/4.
Comparer une fraction à 1 : si le numérateur est plus petit que le dénominateur, la fraction est plus petite que 1 (3/4 < 1) ; s''ils sont égaux, elle vaut 1 (4/4 = 1) ; si le numérateur est plus grand, elle est plus grande que 1 (5/4 > 1).',
   NULL, NULL, NULL),
  (v_content, 7, 'image', NULL,
   'https://brrutnxaizdllthgcnqm.supabase.co/storage/v1/object/public/lesson-images/nc-u4-l4/decimal-fraction.svg',
   'Un décimal et une fraction décimale décrivent la même quantité : 0,5 = 5/10 = 1/2.',
   'Trois barres partagées montrant 0,5 = 5/10 = 1/2, 0,25 = 25/100 = 1/4 et 0,75 = 75/100 = 3/4.'),
  (v_content, 8, 'text',
   'PARTIE 3 — LA DIVISIBILITÉ
On peut savoir si un nombre est divisible par un autre sans faire la division, grâce à des critères (regarde le tableau) : par 2 si le dernier chiffre est pair ; par 5 si le dernier chiffre est 0 ou 5 ; par 3 si la somme des chiffres est divisible par 3 ; par 9 si la somme des chiffres est divisible par 9.',
   NULL, NULL, NULL),
  (v_content, 9, 'image', NULL,
   'https://brrutnxaizdllthgcnqm.supabase.co/storage/v1/object/public/lesson-images/nc-u4-l4/divisibilite.svg',
   'Les critères de divisibilité par 2, 3, 5 et 9 avec un exemple pour chacun.',
   'Tableau des critères de divisibilité par 2, 3, 5 et 9 avec la règle et un exemple sur chaque ligne.'),
  (v_content, 10, 'video', NULL,
   '[[nc-u4-l4/video-decimaux-fractions.mp4]]',
   'Vidéo : décimaux et fractions, deux façons d''écrire la même quantité.',
   NULL);

  -- ACTIVITY ------------------------------------------------------------
  INSERT INTO section_blocks (section_id, block_order, block_type, text_content, media_url, caption, alt_text) VALUES
  (v_activity, 1, 'text',
   'Exercice 1 — Les fractions avec du papier (10 min) : plier une feuille en 2 (montrer 1/2), puis en 4 (1/4, 2/4, 3/4), puis en 8. Colorier des fractions.
Exercice 2 — Le marché décimal (10 min) : « Papa achète 2,5 kg de riz à 700 FCFA/kg et 1,75 kg de viande à 3 200 FCFA/kg. » Calculer le prix de chaque article et le total.
Exercice 3 — Divisibilité express (5 min) : l''enseignant dit un nombre, les élèves disent par quoi il est divisible (2, 3, 5, 9).',
   NULL, NULL, NULL),
  (v_activity, 2, 'image', NULL,
   'https://brrutnxaizdllthgcnqm.supabase.co/storage/v1/object/public/lesson-images/nc-u4-l4/activite-fractions.png',
   'En classe : on plie et on colorie du papier pour voir les fractions 1/2, 1/4, 3/4.',
   'Des élèves camerounais plient et colorient des feuilles pour représenter des fractions, guidés par leur enseignant.');

  -- EXERCISE ------------------------------------------------------------
  INSERT INTO section_blocks (section_id, block_order, block_type, text_content, media_url, caption, alt_text) VALUES
  (v_exercise, 1, 'text',
   'À toi de jouer ! Réponds aux questions suivantes. Fais bien attention à la virgule des décimaux, au numérateur et au dénominateur des fractions, et pense aux critères de divisibilité.',
   NULL, NULL, NULL);

END $$;
