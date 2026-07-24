-- ============================================================
-- Nombres et Calculs - Unite 3 (L'ecole) - Lecon 3
-- « La division euclidienne »
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
     AND level='cm1' AND unit_number=3;

  SELECT id INTO v_intro    FROM lesson_sections WHERE lesson_id=v_lesson AND section_type='intro';
  SELECT id INTO v_content  FROM lesson_sections WHERE lesson_id=v_lesson AND section_type='content';
  SELECT id INTO v_activity FROM lesson_sections WHERE lesson_id=v_lesson AND section_type='activity';
  SELECT id INTO v_exercise FROM lesson_sections WHERE lesson_id=v_lesson AND section_type='exercise';

  DELETE FROM lesson_sections WHERE lesson_id=v_lesson AND section_type='video';
  DELETE FROM section_blocks  WHERE section_id IN (v_intro, v_content, v_activity, v_exercise);

  -- INTRO ---------------------------------------------------------------
  INSERT INTO section_blocks (section_id, block_order, block_type, text_content, media_url, caption, alt_text) VALUES
  (v_intro, 1, 'text',
   'Le maître a 156 cahiers à distribuer à 25 élèves de manière égale. Combien chaque élève recevra-t-il ? Et combien restera-t-il ? Pour répondre, il faut faire une division. C''est le contraire de la multiplication : au lieu de regrouper, on partage !',
   NULL, NULL, NULL),
  (v_intro, 2, 'image', NULL,
   'https://brrutnxaizdllthgcnqm.supabase.co/storage/v1/object/public/lesson-images/nc-u3-l3/intro-partage.png',
   'Partager également des cahiers entre les élèves, c''est faire une division.',
   'Un enseignant distribue des cahiers de façon égale à des élèves assis à leurs pupitres dans une classe camerounaise.');

  -- CONTENT -------------------------------------------------------------
  INSERT INTO section_blocks (section_id, block_order, block_type, text_content, media_url, caption, alt_text) VALUES
  (v_content, 1, 'text',
   'LA DIVISION EUCLIDIENNE
Diviser, c''est partager en parts égales, ou chercher combien de fois un nombre est contenu dans un autre.
Une division a quatre éléments : le dividende (le nombre qu''on partage), le diviseur (le nombre de parts), le quotient (le résultat) et le reste (ce qui reste). Pour 156 ÷ 25, on écrit : 156 = 25 × 6 + 6.
Règle d''or : le reste est toujours plus petit que le diviseur (regarde le schéma).',
   NULL, NULL, NULL),
  (v_content, 2, 'image', NULL,
   'https://brrutnxaizdllthgcnqm.supabase.co/storage/v1/object/public/lesson-images/nc-u3-l3/division-elements.svg',
   'Les quatre éléments d''une division : dividende, diviseur, quotient et reste.',
   'Schéma de l''égalité 156 = 25 × 6 + 6 avec chaque terme identifié : dividende, diviseur, quotient, reste.'),
  (v_content, 3, 'text',
   'POSER UNE DIVISION
On cherche combien de fois le diviseur est contenu dans le dividende.
Dans 15, combien de fois 25 ? Zéro fois. On prend donc 156. Dans 156, combien de fois 25 ? Six fois, car 25 × 6 = 150. On soustrait : 156 − 150 = 6. Il reste 6, et 6 est bien plus petit que 25. Le quotient est 6 et le reste est 6.',
   NULL, NULL, NULL),
  (v_content, 4, 'image', NULL,
   'https://brrutnxaizdllthgcnqm.supabase.co/storage/v1/object/public/lesson-images/nc-u3-l3/division-posee.svg',
   'La division posée : on cherche le quotient, on soustrait, et on obtient le reste.',
   'Division posée de 156 par 25 dans une potence, avec le quotient 6, la soustraction 156 − 150 et le reste 6.'),
  (v_content, 5, 'text',
   'LA PREUVE DE LA DIVISION
Pour vérifier une division, on fait : (diviseur × quotient) + reste = dividende. Ici : (25 × 6) + 6 = 150 + 6 = 156. On retrouve le dividende de départ : la division est correcte !',
   NULL, NULL, NULL),
  (v_content, 6, 'image', NULL,
   'https://brrutnxaizdllthgcnqm.supabase.co/storage/v1/object/public/lesson-images/nc-u3-l3/preuve-division.svg',
   'La preuve : (25 × 6) + 6 = 156, on retrouve bien le dividende.',
   'Schéma de la preuve de la division montrant (25 × 6) + 6 = 150 + 6 = 156.'),
  (v_content, 7, 'text',
   'DES EXEMPLES DE LA VIE COURANTE
Exemple 1 : un commerçant a 2 340 oranges à ranger dans des caisses de 48. 2 340 ÷ 48 = 48 caisses et il reste 36 oranges. Comme il reste des oranges, il lui faudra une caisse de plus, soit 49 caisses (la dernière n''étant pas pleine).
Exemple 2 : l''école reçoit une subvention de 875 000 FCFA à répartir entre 7 classes. 875 000 ÷ 7 = 125 000 FCFA par classe, reste 0 : c''est une division exacte.
Quand le reste est 0, on dit que le dividende est divisible par le diviseur. Par exemple 24 = 6 × 4 + 0 : 24 est divisible par 6, et 6 est un diviseur de 24.',
   NULL, NULL, NULL),
  (v_content, 8, 'image', NULL,
   'https://brrutnxaizdllthgcnqm.supabase.co/storage/v1/object/public/lesson-images/nc-u3-l3/oranges-caisses.png',
   'Ranger 2 340 oranges dans des caisses de 48 : combien de caisses, combien reste-t-il ?',
   'Un marché camerounais avec des caisses en bois remplies d''oranges qu''un vendeur range soigneusement.'),
  (v_content, 9, 'video', NULL,
   '[[nc-u3-l3/video-division.mp4]]',
   'Vidéo : partager et poser une division.',
   NULL);

  -- ACTIVITY ------------------------------------------------------------
  INSERT INTO section_blocks (section_id, block_order, block_type, text_content, media_url, caption, alt_text) VALUES
  (v_activity, 1, 'text',
   'Exercice 1 — Le partage (10 min) : partager 156 objets (haricots, bâtonnets ou cahiers imaginés) entre des groupes de 25. Combien chaque groupe reçoit-il ? Combien reste-t-il ?
Exercice 2 — Le problème des caisses (10 min) : « Un commerçant a 500 mangues à ranger dans des caisses de 24. Combien de caisses pleines ? Combien de mangues restantes ? Combien de caisses en tout ? »
Exercice 3 — La preuve (5 min) : pour chaque division posée, vérifier le résultat avec (diviseur × quotient) + reste = dividende.',
   NULL, NULL, NULL),
  (v_activity, 2, 'image', NULL,
   'https://brrutnxaizdllthgcnqm.supabase.co/storage/v1/object/public/lesson-images/nc-u3-l3/activite-partage.png',
   'En classe : on partage des objets en groupes égaux pour comprendre le quotient et le reste.',
   'Des élèves camerounais répartissent une pile de bâtonnets en groupes égaux, guidés par leur enseignant.');

  -- EXERCISE ------------------------------------------------------------
  INSERT INTO section_blocks (section_id, block_order, block_type, text_content, media_url, caption, alt_text) VALUES
  (v_exercise, 1, 'text',
   'À toi de jouer ! Réponds aux questions suivantes. Pose bien chaque division, trouve le quotient et le reste, et n''oublie pas de faire la preuve.',
   NULL, NULL, NULL);

END $$;
