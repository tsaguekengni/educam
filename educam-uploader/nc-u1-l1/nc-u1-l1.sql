-- ============================================================
-- Nombres et Calculs - Unite 1 (La nature) - Lecon 1  [REBUILD v2]
-- « Les nombres entiers et les operations de base »
-- Child-friendly charter voice: warm guide, bite-size blocks,
-- recurring kids Amadou & Aicha, CE1-CE2 rappel, show/guide/do.
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
     AND level='cm1' AND unit_number=1;

  SELECT id INTO v_intro    FROM lesson_sections WHERE lesson_id=v_lesson AND section_type='intro';
  SELECT id INTO v_content  FROM lesson_sections WHERE lesson_id=v_lesson AND section_type='content';
  SELECT id INTO v_activity FROM lesson_sections WHERE lesson_id=v_lesson AND section_type='activity';
  SELECT id INTO v_exercise FROM lesson_sections WHERE lesson_id=v_lesson AND section_type='exercise';

  -- Dedicated BILAN section (renders section_blocks in projector mode, unlike 'exercise').
  -- section_type has no CHECK constraint; sections load ordered by section_order.
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
   'Salut, moi c''est Amadou, et voici mon amie Aïcha ! 👋 Aujourd''hui, on t''emmène avec nous au marché de Yaoundé. Ouvre grand les yeux : les nombres sont partout !',
   NULL, NULL, NULL),
  (v_intro, 2, 'image', NULL,
   '[[nc-u1-l1/intro-marche.png]]',
   'Au marché, papa achète un grand sac de riz. Combien ça coûte ? Ce sont des nombres !',
   'Un papa achète un sac de riz à une vendeuse dans un marché camerounais animé.'),
  (v_intro, 3, 'text',
   'Tu te souviens ? En CE1 et en CE2, tu savais déjà lire, écrire et comparer des nombres, et faire des additions et des soustractions. Bravo, tu as déjà tout ce qu''il faut ! 💪',
   NULL, NULL, NULL),
  (v_intro, 4, 'text',
   'Aujourd''hui, on va aller plus loin ensemble : ranger les élèves en groupes, apprivoiser des nombres GÉANTS, et calculer comme des champions. On y va ? 🚀',
   NULL, NULL, NULL);

  -- ===================== CONTENT =====================
  -- --- Concept A : les ensembles / Venn ---
  INSERT INTO section_blocks (section_id, block_order, block_type, text_content, media_url, caption, alt_text) VALUES
  (v_content, 1, 'text',
   'Dans la classe d''Aïcha, certains élèves parlent français, d''autres parlent anglais. Et quelques-uns… parlent les deux ! Comment les ranger sans se tromper ?',
   NULL, NULL, NULL),
  (v_content, 2, 'text',
   'On dessine deux cercles : un pour le français, un pour l''anglais. Là où les cercles se croisent, on met ceux qui parlent les deux langues. Ce dessin magique s''appelle un diagramme de Venn.',
   NULL, NULL, NULL),
  (v_content, 3, 'image', NULL,
   '[[nc-u1-l1/venn-langues.svg]]',
   'Le petit espace du milieu s''appelle l''intersection : c''est ce que les deux groupes ont en commun.',
   'Diagramme de Venn avec un cercle « français », un cercle « anglais » et une intersection au milieu contenant Chantal et David.'),
  (v_content, 4, 'text',
   'On essaie ensemble ? Chantal parle français ET anglais. Dans quelle partie du dessin va-t-elle ?… Au milieu, dans l''intersection ! Tu as trouvé ? Génial ! 🌟',
   NULL, NULL, NULL),
  -- --- Concept B : les grands nombres ---
  (v_content, 5, 'text',
   'Au marché, Aïcha voit une affiche avec ce nombre : 345 678 912. « Waouh, il est énooorme ! » dit-elle. Pas de panique — on va le dompter ensemble. 🦁',
   NULL, NULL, NULL),
  (v_content, 6, 'image', NULL,
   '[[nc-u1-l1/grands-nombres-reveal.svg]]',
   'Le secret : couper le grand nombre en familles de 3 chiffres, puis les ranger dans leurs maisons.',
   'Séquence en 4 étapes qui transforme 345678912 en 345 678 912 en le rangeant en familles millions, mille, unités.'),
  (v_content, 7, 'text',
   'Chaque famille a un nom : les millions, les mille, les unités. Et dans chaque famille, il y a 3 places : les centaines, les dizaines, les unités. C''est bien rangé, comme des tiroirs !',
   NULL, NULL, NULL),
  (v_content, 8, 'image', NULL,
   '[[nc-u1-l1/tableau-numeration.svg]]',
   'Range chaque chiffre dans son tiroir, et lis famille par famille : 345 millions, 678 mille, 912.',
   'Tableau de numération de 345 678 912 avec les classes millions, mille et unités colorées.'),
  (v_content, 9, 'text',
   'Décomposer un nombre, c''est juste le casser en morceaux, comme un puzzle. Je te montre : 345 678 912, c''est 345 millions + 678 mille + 912.',
   NULL, NULL, NULL),
  (v_content, 10, 'image', NULL,
   '[[nc-u1-l1/decomposition.svg]]',
   'Trois morceaux qu''on rassemble : les millions, les mille et les unités.',
   'Décomposition de 345 678 912 en 345 000 000 + 678 000 + 912 sous forme de trois blocs colorés.'),
  (v_content, 11, 'text',
   'Et pour comparer deux nombres ? On regarde d''abord qui a le plus de chiffres — c''est le plus grand ! S''ils en ont autant, on compare de gauche à droite, chiffre par chiffre. Facile, non ? 😉',
   NULL, NULL, NULL),
  -- --- Concept C : addition & soustraction ---
  (v_content, 12, 'text',
   'Retour au marché avec Amadou ! Il achète du riz à 18 500 F et de l''huile à 3 750 F. Combien va-t-il payer en tout ? On additionne !',
   NULL, NULL, NULL),
  (v_content, 13, 'image', NULL,
   '[[nc-u1-l1/addition-ladder.svg]]',
   'Le secret de l''addition : bien aligner les rangs, et ne pas oublier la retenue.',
   'Addition posée de 18 500 + 3 750 = 22 250 avec les retenues et une question d''entraînement.'),
  (v_content, 14, 'text',
   'Maintenant, Aïcha paie avec 50 000 F un achat de 12 800 F. La vendeuse doit lui rendre la monnaie : on soustrait pour savoir combien.',
   NULL, NULL, NULL),
  (v_content, 15, 'image', NULL,
   '[[nc-u1-l1/soustraction-ladder.svg]]',
   'Pour soustraire : on aligne les rangs, et si besoin on emprunte au voisin de gauche.',
   'Soustraction posée de 50 000 − 12 800 = 37 200 avec une question d''entraînement.'),
  (v_content, 16, 'text',
   'Ça a l''air costaud ? Voici un super-pouvoir pour calculer dans ta tête, super vite. 👇',
   NULL, NULL, NULL),
  (v_content, 17, 'image', NULL,
   '[[nc-u1-l1/calcul-mental.svg]]',
   'Ajouter 9, c''est ajouter 10 puis enlever 1. Un vrai tour de magie !',
   'Schéma montrant 47 + 10 = 57 puis − 1 = 56, donc 47 + 9 = 56.'),
  (v_content, 18, 'video', NULL,
   '[[nc-u1-l1/video-lecon1.mp4]]',
   'Regarde la vidéo : Amadou et Aïcha récapitulent tout en une minute ! 🎬',
   NULL);

  -- ===================== ACTIVITY =====================
  INSERT INTO section_blocks (section_id, block_order, block_type, text_content, media_url, caption, alt_text) VALUES
  (v_activity, 1, 'text',
   'À ton tour de jouer avec nous ! 🎲 Jeu 1 — Les cercles : range tes camarades dans deux cercles (par exemple « aime le football » et « aime la course »), et trouve qui va au milieu.',
   NULL, NULL, NULL),
  (v_activity, 2, 'text',
   'Jeu 2 — Le petit marché : avec de la fausse monnaie, achète du riz, de l''huile et du savon, puis rends la monnaie sur 50 000 F. Jeu 3 — La course mentale : qui ajoute 9 le plus vite ? 🏁',
   NULL, NULL, NULL),
  (v_activity, 3, 'image', NULL,
   '[[nc-u1-l1/activite-marche.png]]',
   'On rejoue le marché en classe : on compte, on paie, on rend la monnaie… et on s''amuse !',
   'Des élèves camerounais jouent au marché en classe avec de la fausse monnaie, guidés par leur enseignant.');

  -- ===================== EXERCISE =====================
  -- NOTE: the 'exercise' section renders questions from the exercises TABLE,
  -- not section_blocks, so no text blocks are placed here (they would be invisible).

  -- ===================== BILAN (recap + trace ecrite + devoir) =====================
  INSERT INTO section_blocks (section_id, block_order, block_type, text_content, media_url, caption, alt_text) VALUES
  (v_bilan, 1, 'text',
   'Récapitulons ! 🎈 Aujourd''hui, avec Amadou et Aïcha, tu as appris à ranger des élèves dans un diagramme de Venn, à lire et décomposer de très grands nombres, et à poser tes additions et tes soustractions. Bravo, champion ! 🎉',
   NULL, NULL, NULL),
  (v_bilan, 2, 'text',
   '**📋 À RECOPIER DANS TON CAHIER**

**Leçon : Les nombres entiers et les opérations de base**',
   NULL, NULL, NULL),
  (v_bilan, 3, 'text',
   '**1. Les ensembles.** Un diagramme de Venn range les éléments dans des cercles. L''intersection contient ce qui appartient aux deux ensembles à la fois. La réunion contient tous les éléments des deux cercles.
Exemple : les élèves qui parlent français et anglais se placent au milieu.',
   NULL, NULL, NULL),
  (v_bilan, 4, 'image', NULL,
   '[[nc-u1-l1/venn-cahier.svg]]',
   'Dessine ce diagramme dans ton cahier.',
   'Diagramme de Venn simple : un cercle français, un cercle anglais et leur intersection au milieu.'),
  (v_bilan, 5, 'text',
   '**2. Les grands nombres.** Un nombre s''organise en classes de trois chiffres : les millions, les mille, les unités ; chaque classe a ses centaines, dizaines et unités. Décomposer, c''est séparer ces familles. Pour comparer deux nombres, on compare d''abord le nombre de chiffres, puis les chiffres de gauche à droite.
Exemple : 345 678 912 = 345 millions + 678 mille + 912.',
   NULL, NULL, NULL),
  (v_bilan, 6, 'image', NULL,
   '[[nc-u1-l1/tableau-numeration.svg]]',
   'Recopie ce tableau de numération dans ton cahier.',
   'Tableau de numération de 345 678 912 avec les classes millions, mille et unités.'),
  (v_bilan, 7, 'text',
   '**3. Additionner et soustraire.** On aligne les chiffres selon leur rang, puis on calcule de droite à gauche sans oublier les retenues. Astuce de calcul mental : ajouter 9, c''est ajouter 10 puis enlever 1.
Exemple : 18 500 + 3 750 = 22 250 ; 50 000 − 12 800 = 37 200.',
   NULL, NULL, NULL),
  (v_bilan, 8, 'image', NULL,
   '[[nc-u1-l1/operations-cahier.svg]]',
   'Recopie ces deux opérations posées dans ton cahier.',
   'Une addition posée 18 500 + 3 750 = 22 250 et une soustraction posée 50 000 − 12 800 = 37 200.'),
  (v_bilan, 9, 'text',
   '**✏️ MON DEVOIR**

1. Écris et décompose le nombre 207 460 315 (en millions, mille et unités).
2. Calcule : 24 600 + 8 750, puis 60 000 − 15 300.
3. Range dans un diagramme de Venn tes camarades qui aiment le football et ceux qui aiment la course : qui se place au milieu ?
4. À la maison : trouve trois grands nombres sur des emballages ou des panneaux, écris-les dans ton cahier et lis-les à voix haute.',
   NULL, NULL, NULL);

END $$;
