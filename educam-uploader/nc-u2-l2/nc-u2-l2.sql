-- ============================================================
-- Nombres et Calculs - Unite 2 (Le village, la ville) - Lecon 2  [REBUILD v2]
-- « Encadrer, arrondir et multiplier les nombres entiers »
-- Charter voice: Amadou & Aicha, CE1-CE2 rappel, bite-size, show/guide/do.
-- Media tokens replaced by upload-lesson.mjs -> .filled.sql. Safe to re-run.
-- ============================================================

DO $$
DECLARE
  v_lesson   INTEGER;
  v_intro    INTEGER;
  v_content  INTEGER;
  v_activity INTEGER;
  v_exercise INTEGER;
  v_bilan    INTEGER;
BEGIN
  SELECT id INTO v_lesson FROM lessons
   WHERE subject_id='maths' AND component_id='nombres-calculs'
     AND level='cm1' AND unit_number=2;

  SELECT id INTO v_intro    FROM lesson_sections WHERE lesson_id=v_lesson AND section_type='intro';
  SELECT id INTO v_content  FROM lesson_sections WHERE lesson_id=v_lesson AND section_type='content';
  SELECT id INTO v_activity FROM lesson_sections WHERE lesson_id=v_lesson AND section_type='activity';
  SELECT id INTO v_exercise FROM lesson_sections WHERE lesson_id=v_lesson AND section_type='exercise';

  -- Dedicated BILAN section (the 'exercise' section renders the exercises TABLE, not blocks).
  SELECT id INTO v_bilan FROM lesson_sections WHERE lesson_id=v_lesson AND section_type='bilan';
  IF v_bilan IS NULL THEN
    INSERT INTO lesson_sections (lesson_id, section_order, section_type, title, icon)
    VALUES (v_lesson,
            (SELECT COALESCE(MAX(section_order),0)+1 FROM lesson_sections WHERE lesson_id=v_lesson),
            'bilan', 'Bilan — À recopier', '📋')
    RETURNING id INTO v_bilan;
  END IF;

  DELETE FROM lesson_sections WHERE lesson_id=v_lesson AND section_type='video';
  DELETE FROM section_blocks  WHERE section_id IN (v_intro, v_content, v_activity, v_exercise, v_bilan);

  -- ===================== INTRO =====================
  INSERT INTO section_blocks (section_id, block_order, block_type, text_content, media_url, caption, alt_text) VALUES
  (v_intro, 1, 'text',
   'Au dernier cours, nous avons vu les ensembles et le diagramme de Venn, les grands nombres jusqu''à 9 chiffres, et les additions et soustractions. Aujourd''hui, nous allons apprendre à encadrer, arrondir et multiplier les nombres. 🚀',
   NULL, NULL, NULL),
  (v_intro, 2, 'text',
   'Mais d''abord, corrigeons ensemble le devoir de la dernière fois ! ✅ Le nombre 207 460 315 se décompose en 207 millions + 460 mille + 315. Pour les opérations : 24 600 + 8 750 = 33 350, et 60 000 − 15 300 = 44 700. Et dans le diagramme de Venn, les camarades qui aiment à la fois le football et la course se placent au milieu. As-tu bon ? Bravo !',
   NULL, NULL, NULL),
  (v_intro, 3, 'text',
   'Nous revoilà avec Amadou et Aïcha ! 👋 Amadou veut acheter 25 cahiers pour la rentrée — comment calculer vite le prix total ? Et sur la route, un panneau annonce « Douala : environ 4 millions d''habitants ». Environ ? Viens voir !',
   NULL, NULL, NULL),
  (v_intro, 4, 'image', NULL,
   '[[nc-u2-l2/intro-boutique.png]]',
   'À la boutique, Amadou compte ses cahiers. Pour aller vite, on va multiplier !',
   'Un garçon achète une pile de cahiers dans une petite boutique camerounaise de fournitures scolaires.'),
  (v_intro, 5, 'text',
   'Tu te souviens ? En CE1 et CE2, tu as appris tes tables de multiplication et à comparer les nombres. Ce sont exactement les outils dont on a besoin aujourd''hui ! 💪',
   NULL, NULL, NULL);

  -- ===================== CONTENT =====================
  -- --- Concept A : encadrer ---
  INSERT INTO section_blocks (section_id, block_order, block_type, text_content, media_url, caption, alt_text) VALUES
  (v_content, 1, 'text',
   'Aïcha a un nombre : 7 845. Il joue à cache-cache entre deux nombres ronds. Encadrer, c''est trouver sa cachette !',
   NULL, NULL, NULL),
  (v_content, 2, 'image', NULL,
   '[[nc-u2-l2/encadrement.svg]]',
   'Le nombre se cache toujours entre le rond juste en dessous et celui juste au-dessus.',
   'Deux droites graduées : 7 845 encadré par 7 800 et 7 900, et 345 678 encadré par 345 000 et 346 000.'),
  (v_content, 3, 'text',
   'On essaie ensemble ? Entre quelles centaines se cache 7 845 ?… Entre 7 800 et 7 900 ! Bravo, tu l''as trouvé. 🎯',
   NULL, NULL, NULL),
  -- --- Concept B : arrondir ---
  (v_content, 4, 'text',
   'Maintenant, on veut le nombre rond le PLUS PROCHE. Ça s''appelle arrondir. C''est comme choisir la maison la plus proche de chez toi.',
   NULL, NULL, NULL),
  (v_content, 5, 'image', NULL,
   '[[nc-u2-l2/arrondir.svg]]',
   'La règle : le chiffre juste après décide. 5 ou plus, on monte ; moins de 5, on descend.',
   'Droite graduée entre 7 800 et 7 900 : 7 845 descend vers 7 800, 7 867 monte vers 7 900.'),
  (v_content, 6, 'text',
   'On essaie ? Pour arrondir 7 845 à la centaine, on regarde les dizaines : 4. Comme 4 est plus petit que 5, on descend → 7 800. Tu as suivi ? Super ! 🌟',
   NULL, NULL, NULL),
  -- --- Concept C : multiplication ---
  (v_content, 7, 'text',
   'Multiplier, c''est additionner plusieurs fois le même nombre, mais en beaucoup plus rapide. Un commerçant achète 26 sacs de café à 2 453 F : Amadou l''aide à calculer le total.',
   NULL, NULL, NULL),
  (v_content, 8, 'image', NULL,
   '[[nc-u2-l2/multiplication-posee.svg]]',
   'On multiplie par 6, puis par 20, et on additionne les deux morceaux. Un chiffre à la fois !',
   'Multiplication posée 2 453 × 26 = 63 778 en étapes, avec une question d''entraînement.'),
  (v_content, 9, 'image', NULL,
   '[[nc-u2-l2/commercant-cafe.png]]',
   'Le commerçant et ses 26 sacs de café : un vrai problème de multiplication.',
   'Un commerçant camerounais debout à côté de nombreux sacs de café empilés, avec des collines vertes derrière.'),
  (v_content, 10, 'text',
   'Ça fait beaucoup de chiffres ? Pas de panique ! On avance étape par étape, et à la fin tout se met en place. Tu vas voir, c''est un jeu. 😎',
   NULL, NULL, NULL),
  -- --- Concept D : preuve par 9 + astuce ---
  (v_content, 11, 'text',
   'Comment savoir si on ne s''est pas trompé, sans tout recommencer ? On utilise un tour magique : la preuve par 9.',
   NULL, NULL, NULL),
  (v_content, 12, 'image', NULL,
   '[[nc-u2-l2/preuve-par-9.svg]]',
   'On réduit chaque nombre à un seul chiffre. Si les deux côtés sont égaux, c''est gagné !',
   'Schéma de la preuve par 9 pour 2 453 × 26 = 63 778 : les deux côtés donnent 4.'),
  (v_content, 13, 'text',
   'Et voici un cadeau : un super-pouvoir pour retenir la table de 9 sans effort. 👇',
   NULL, NULL, NULL),
  (v_content, 14, 'image', NULL,
   '[[nc-u2-l2/astuce-table-9.svg]]',
   'Dans la table de 9, les deux chiffres du résultat font toujours 9. Magique !',
   'Table de multiplication de 9 montrant que la somme des chiffres de chaque résultat vaut 9.'),
  (v_content, 15, 'video', NULL,
   '[[nc-u2-l2/video-multiplication.mp4]]',
   'Regarde la vidéo : Amadou et Aïcha posent une multiplication en une minute ! 🎬',
   NULL);

  -- ===================== ACTIVITY =====================
  INSERT INTO section_blocks (section_id, block_order, block_type, text_content, media_url, caption, alt_text) VALUES
  (v_activity, 1, 'text',
   'À toi de jouer avec nous ! 🎲 Jeu 1 — Les prix arrondis : l''enseignant écrit des prix (tomates 2 375 F, poisson 8 640 F) et tu les arrondis à la centaine, puis au millier.',
   NULL, NULL, NULL),
  (v_activity, 2, 'text',
   'Jeu 2 — Le grand calcul : « L''école commande 35 livres à 1 850 F. » Calcule le total, puis vérifie avec la preuve par 9. Jeu 3 — La course des tables : le premier à donner le bon produit gagne un point ! 🏁',
   NULL, NULL, NULL),
  (v_activity, 3, 'image', NULL,
   '[[nc-u2-l2/activite-tables.png]]',
   'En classe : la course des tables de multiplication. Le plus rapide gagne un point !',
   'Des élèves camerounais lèvent la main pendant un jeu rapide de tables de multiplication, guidés par leur enseignant.');

  -- ===================== EXERCISE =====================
  -- NOTE: the 'exercise' section renders questions from the exercises TABLE,
  -- not section_blocks, so no text blocks are placed here (they would be invisible).

  -- ===================== BILAN (recap + trace ecrite + devoir) =====================
  INSERT INTO section_blocks (section_id, block_order, block_type, text_content, media_url, caption, alt_text) VALUES
  (v_bilan, 1, 'text',
   'Récapitulons ! 🎈 Aujourd''hui, avec Amadou et Aïcha, tu as appris à encadrer un nombre entre deux nombres ronds, à l''arrondir au plus proche, et à poser une multiplication — sans oublier la preuve par 9 pour vérifier. Bravo, champion ! 🎉',
   NULL, NULL, NULL),
  (v_bilan, 2, 'text',
   '**📋 À RECOPIER DANS TON CAHIER**

**Leçon : Encadrer, arrondir et multiplier les nombres entiers**',
   NULL, NULL, NULL),
  (v_bilan, 3, 'text',
   '**1. Encadrer un nombre.** Encadrer un nombre, c''est le placer entre deux nombres ronds : l''un juste en dessous, l''autre juste au-dessus.
Exemple : 7 800 < 7 845 < 7 900 (à la centaine près).',
   NULL, NULL, NULL),
  (v_bilan, 4, 'image', NULL,
   '[[nc-u2-l2/encadrement-cahier.svg]]',
   'Recopie cette droite graduée dans ton cahier.',
   'Droite graduée montrant 7 845 encadré entre 7 800 et 7 900.'),
  (v_bilan, 5, 'text',
   '**2. Arrondir un nombre.** Arrondir, c''est choisir le nombre rond le plus proche. On regarde le chiffre qui suit le rang choisi : s''il est 5 ou plus, on arrondit au nombre supérieur ; s''il est inférieur à 5, au nombre inférieur.
Exemple : 7 845 ≈ 7 800 ; 7 867 ≈ 7 900.',
   NULL, NULL, NULL),
  (v_bilan, 6, 'image', NULL,
   '[[nc-u2-l2/arrondir-cahier.svg]]',
   'Recopie cette droite graduée et la règle dans ton cahier.',
   'Droite graduée : 7 845 arrondi à 7 800, 7 867 arrondi à 7 900, avec la règle du milieu.'),
  (v_bilan, 7, 'text',
   '**3. La multiplication.** On pose l''opération et on additionne les produits partiels. La preuve par 9 permet de vérifier le résultat. Astuce : dans la table de 9, la somme des deux chiffres du résultat vaut toujours 9.
Exemple : 2 453 × 26 = 63 778.',
   NULL, NULL, NULL),
  (v_bilan, 8, 'image', NULL,
   '[[nc-u2-l2/multiplication-cahier.svg]]',
   'Recopie cette multiplication posée dans ton cahier.',
   'Multiplication posée 2 453 × 26 = 63 778 avec les produits partiels 14 718 et 49 060.'),
  (v_bilan, 9, 'text',
   '**✏️ MON DEVOIR**

1. Encadre 4 562 à la centaine près, puis au millier près.
2. Arrondis 38 720 au millier près, et 7 145 à la centaine près.
3. Calcule 1 458 × 32, puis vérifie ton résultat avec la preuve par 9.
4. À la maison : relève trois prix (au marché ou sur des emballages), écris-les dans ton cahier et arrondis-les au millier près.',
   NULL, NULL, NULL);

END $$;
