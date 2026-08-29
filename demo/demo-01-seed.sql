-- ============================================================================
-- EduCam — JEU DE DONNÉES DE DÉMONSTRATION
-- Dernière mise à jour : 2026-08-15 UTC
-- À exécuter dans l'éditeur SQL de Supabase, d'un seul bloc.
--
-- CE QUE ÇA INSTALLE
--   3 écoles · 8 classes · 240 élèves · plusieurs milliers de notes sur 8 semaines
--   12 comptes enseignants/direction/superadmin · 16 comptes parents
--   emplois du temps · messages · observations · journal d'activité
--
-- CE QUE ÇA NE TOUCHE PAS
--   Aucune ligne existante n'est modifiée ni supprimée. Le script n'AJOUTE que
--   des lignes, toutes marquées : écoles « DÉMO · … », comptes « @demo.educam.cm ».
--   `demo-00-teardown.sql` les enlève toutes, et rien d'autre.
--
--   UNE SEULE EXCEPTION, signalée : si aucun emploi du temps de référence
--   n'existe pour le CM1, le script en installe un (journée 08 h–16 h). Il est
--   partagé, donc NON marqué, donc NON supprimé par le teardown — c'est voulu,
--   c'est le gabarit que `claude/timetable-cm1-8to4.sql` devait poser de toute façon.
--
-- IDEMPOTENT : le script commence par rejouer la suppression. Relançable.
--
-- MOT DE PASSE DE TOUS LES COMPTES DE DÉMO :  Demo2026!
--
-- ⚠️ `claude/timetable-cm1-8to4.sql` fait `DELETE FROM timetable_slots WHERE
--    level='cm1'`. Exécuté APRÈS ce seed, il efface les emplois du temps des
--    classes de démo. À passer AVANT, ou pas du tout.
-- ============================================================================


-- ============================================================================
-- 0 · CONTRÔLE PRÉALABLE
--     Le seed ne fabrique aucune leçon : il s'appuie sur le contenu réel.
-- ============================================================================
do $$
declare n_cm1 int; n_units int;
begin
  select count(*), count(distinct unit_number) into n_cm1, n_units
    from public.lessons where level = 'cm1';
  if n_cm1 = 0 then
    raise exception 'Aucune leçon CM1 en base. Chargez le contenu avant de lancer le seed.';
  end if;
  raise notice 'Contrôle préalable : % leçons CM1 sur % unités.', n_cm1, n_units;
end $$;


-- ============================================================================
-- 1 · REMISE À ZÉRO
-- ============================================================================
begin;

create temporary table _demo_ids on commit drop as
with s as (select id from public.schools where name like 'DÉMO · %'),
     t as (select id from public.teachers where school_id in (select id from s)
           union select id from public.teachers
                  where id in (select id from auth.users where email like '%@demo.educam.cm')),
     st as (select id from public.students where school_id in (select id from s)),
     p as (select id from public.parents where student_id in (select id from st)
           union select id from public.parents
                  where id in (select id from auth.users where email like '%@demo.educam.cm')),
     u as (select id from auth.users where email like '%@demo.educam.cm')
select (select coalesce(array_agg(id),'{}') from s)  as schools,
       (select coalesce(array_agg(id),'{}') from t)  as teachers,
       (select coalesce(array_agg(id),'{}') from st) as students,
       (select coalesce(array_agg(id),'{}') from p)  as parents,
       (select coalesce(array_agg(id),'{}') from u)  as users;

delete from public.daily_results  where school_id  in (select unnest(schools) from _demo_ids)
                                     or student_id in (select unnest(students) from _demo_ids)
                                     or teacher_id in (select unnest(teachers) from _demo_ids);
delete from public.activity_log   where school_id in (select unnest(schools) from _demo_ids)
                                     or actor_id  in (select unnest(teachers) from _demo_ids)
                                     or actor_id  in (select unnest(parents) from _demo_ids);
delete from public.messages       where school_id  in (select unnest(schools) from _demo_ids)
                                     or student_id in (select unnest(students) from _demo_ids);
delete from public.school_observations where school_id in (select unnest(schools) from _demo_ids);
delete from public.lessons_taught     where teacher_id in (select unnest(teachers) from _demo_ids);
delete from public.teacher_readiness  where teacher_id in (select unnest(teachers) from _demo_ids);
delete from public.lesson_feedback    where teacher_id in (select unnest(teachers) from _demo_ids);
delete from public.timetable_slots    where owner_teacher_id in (select unnest(teachers) from _demo_ids);
delete from public.parents  where id in (select unnest(parents) from _demo_ids);
delete from public.students where id in (select unnest(students) from _demo_ids);
delete from public.teachers where id in (select unnest(teachers) from _demo_ids);
delete from public.schools  where id in (select unnest(schools) from _demo_ids);
delete from auth.users      where id in (select unnest(users) from _demo_ids);

commit;


-- ============================================================================
-- 2 · DEUX OUTILS, tous deux supprimés par le teardown
-- ============================================================================

-- 2.1 Créer un compte de connexion.
--
-- `teachers.id` et `parents.id` sont des clés étrangères vers `auth.users` :
-- impossible de créer un enseignant ou un parent sans compte. L'éditeur SQL de
-- Supabase a les droits pour écrire dans le schéma `auth` ; l'application, non.
--
-- `search_path` inclut `extensions` : sur Supabase, pgcrypto (crypt, gen_salt)
-- y est installé et non dans `public`.
create or replace function public.educam_demo_user(p_email text, p_password text, p_name text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare uid uuid; has_provider_id boolean;
begin
  select id into uid from auth.users where email = p_email;
  if uid is not null then return uid; end if;   -- déjà là : on ne recrée pas

  uid := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
    p_email, crypt(p_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_name),
    now(), now(), '', '', '', ''
  );

  -- `auth.identities.provider_id` existe depuis GoTrue v2, pas avant : on
  -- regarde plutôt que de supposer, sinon le seed casse sur un projet ancien.
  select exists (select 1 from information_schema.columns
                  where table_schema='auth' and table_name='identities'
                    and column_name='provider_id') into has_provider_id;

  if has_provider_id then
    insert into auth.identities (id, user_id, provider_id, identity_data, provider,
                                 last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, uid::text,
            jsonb_build_object('sub', uid::text, 'email', p_email,
                               'email_verified', true, 'phone_verified', false),
            'email', now(), now(), now());
  else
    insert into auth.identities (id, user_id, identity_data, provider,
                                 last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid,
            jsonb_build_object('sub', uid::text, 'email', p_email),
            'email', now(), now(), now());
  end if;

  return uid;
end $$;

-- ⚠️ SÉCURITÉ — une fonction SECURITY DEFINER qui crée des comptes ne doit
-- JAMAIS être appelable depuis l'application. On la ferme à tout le monde
-- sauf au propriétaire de la session SQL.
revoke all on function public.educam_demo_user(text, text, text) from public;
do $$
begin
  -- `anon` et `authenticated` n'existent que sur Supabase : on les retire
  -- seulement s'ils sont là, pour que le fichier reste rejouable ailleurs.
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.educam_demo_user(text, text, text) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on function public.educam_demo_user(text, text, text) from authenticated';
  end if;
end $$;

-- 2.2 Hasard REPRODUCTIBLE.
--
-- `random()` donnerait une démo différente à chaque exécution : impossible à
-- répéter devant un public, impossible à corriger si un chiffre choque.
-- Ici la même graine donne toujours le même nombre.
create or replace function public.educam_demo_rnd(seed text, lo int, hi int)
returns int language sql immutable as $$
  select lo + ((('x' || substr(md5(seed),1,8))::bit(32)::bigint & 2147483647) % (hi - lo + 1))::int;
$$;


-- ============================================================================
-- 3 · LES TROIS ÉCOLES  (identifiants fixes, manifestement synthétiques)
-- ============================================================================
insert into public.schools (id, name, region, staff_code) values
  ('11111111-1111-4111-8111-111111111111', 'DÉMO · École publique de Deido',        'Littoral', 'DEMO-DEIDO'),
  ('22222222-2222-4222-8222-222222222222', 'DÉMO · Complexe scolaire Les Palmiers', 'Littoral', 'DEMO-PALMIERS'),
  ('33333333-3333-4333-8333-333333333333', 'DÉMO · École catholique Saint-Michel',  'Ouest',    'DEMO-SAINTMICHEL');


-- ============================================================================
-- 4 · LES HUIT CLASSES
--
-- `couverture[u]` = fraction des leçons de l'unité u réellement enseignées.
-- C'est CE tableau qui dessine la carte de chaleur du directeur. Le calcul de
-- l'écart est `round((enseignées / attendues − 1) × 3)`, borné à [−3, +2]
-- (weeksFromRatio, src/app/schooldashboard.js) :
--
--   1.00 → « à jour »   0.67 → « −1 sem »   0.34 → « −2 sem »   0.08 → « −3 sem »
--   0.00 → aucune ligne dans educam_coverage → « pas encore commencé »
--
-- Les classes CM2/CE1/CE2 sont volontairement à 0 : il n'existe de contenu que
-- pour le CM1, et une école réelle a des classes qui n'ont pas encore démarré.
-- C'est un argument, pas un manque : l'écran le dit au lieu d'inventer.
-- ============================================================================
create temporary table _demo_classes (
  rang int, ecole uuid, label text, niveau text, effectif int, moyenne numeric,
  ens_nom text, ens_mail text, couverture numeric[]
);

insert into _demo_classes values
 (1,'11111111-1111-4111-8111-111111111111','CM1-A','cm1',36,10.6,'Mme Michèle KAMGA',  'kamga@demo.educam.cm',  array[1.00,1.00,0.08,0,0,0,0,0]),
 (2,'11111111-1111-4111-8111-111111111111','CM1-B','cm1',34,13.4,'M. Bertrand MBIDA',  'mbida@demo.educam.cm',  array[1.00,1.00,0.67,0,0,0,0,0]),
 (3,'11111111-1111-4111-8111-111111111111','CM2-A','cm2',30,12.5,'Mme Georgette NOAH', 'noah@demo.educam.cm',   array[0,0,0,0,0,0,0,0]),
 (4,'11111111-1111-4111-8111-111111111111','CE2-A','ce2',28,12.0,'M. Landry OWONA',    'owona@demo.educam.cm',  array[0,0,0,0,0,0,0,0]),
 (5,'22222222-2222-4222-8222-222222222222','CM1-A','cm1',32,15.0,'Mme Estelle NGUELE', 'nguele@demo.educam.cm', array[1.00,1.00,1.00,0,0,0,0,0]),
 (6,'22222222-2222-4222-8222-222222222222','CE1-A','ce1',26,12.0,'Mme Carine BELINGA', 'belinga@demo.educam.cm',array[0,0,0,0,0,0,0,0]),
 (7,'33333333-3333-4333-8333-333333333333','CM1-A','cm1',30,12.4,'M. Aristide TAMO',   'tamo@demo.educam.cm',   array[1.00,0.67,0.34,0,0,0,0,0]),
 (8,'33333333-3333-4333-8333-333333333333','CM2-A','cm2',24,12.2,'Mme Yolande MENGUE', 'mengue@demo.educam.cm', array[0,0,0,0,0,0,0,0]);


-- ============================================================================
-- 5 · L'EMPLOI DU TEMPS DE RÉFÉRENCE DU CM1
--     Installé UNIQUEMENT s'il n'y en a pas. Journée 08 h–16 h, 7 cours de
--     45 min, récréations et déjeuner visibles (subject_id 'pause' / 'etude'
--     → cartes non cliquables, aucun changement de code).
-- ============================================================================
insert into public.timetable_slots
  (level, day_of_week, slot_order, start_time, end_time, subject_id, component_id, subject_name, component_name)
select * from (values
 ('cm1',1,1,'08:00','08:45','francais','expression-orale','Français','Expression orale'),
 ('cm1',1,2,'08:45','09:30','maths','nombres-calculs','Mathématiques','Nombres et calculs'),
 ('cm1',1,3,'09:30','09:50','pause','recreation','Récréation',''),
 ('cm1',1,4,'09:50','10:35','sciences','sciences-vie','Sciences','Sciences de la vie'),
 ('cm1',1,5,'10:35','11:20','english','listening','English','Listening and Speaking'),
 ('cm1',1,6,'11:20','12:05','francais','grammaire','Français','Grammaire'),
 ('cm1',1,7,'12:05','13:20','pause','dejeuner','Pause déjeuner',''),
 ('cm1',1,8,'13:20','14:05','arts','musique','Arts','Musique'),
 ('cm1',1,9,'14:05','14:50','eps','athletisme','EPS','Activités athlétiques'),
 ('cm1',1,10,'14:50','15:05','pause','recreation','Récréation',''),
 ('cm1',1,11,'15:05','16:00','etude','devoirs','Étude surveillée','Devoirs'),
 ('cm1',2,1,'08:00','08:45','francais','conjugaison','Français','Conjugaison'),
 ('cm1',2,2,'08:45','09:30','maths','mesures-grandeurs','Mathématiques','Mesures et grandeurs'),
 ('cm1',2,3,'09:30','09:50','pause','recreation','Récréation',''),
 ('cm1',2,4,'09:50','10:35','sciences','sciences-physiques','Sciences','Sciences physiques'),
 ('cm1',2,5,'10:35','11:20','english','reading','English','Reading'),
 ('cm1',2,6,'11:20','12:05','francais','vocabulaire','Français','Vocabulaire'),
 ('cm1',2,7,'12:05','13:20','pause','dejeuner','Pause déjeuner',''),
 ('cm1',2,8,'13:20','14:05','shs','morale','Sciences humaines','Éducation morale'),
 ('cm1',2,9,'14:05','14:50','tic','env-info','TIC','Environnements informatiques'),
 ('cm1',2,10,'14:50','15:05','pause','recreation','Récréation',''),
 ('cm1',2,11,'15:05','16:00','etude','devoirs','Étude surveillée','Devoirs'),
 ('cm1',3,1,'08:00','08:45','francais','orthographe','Français','Orthographe'),
 ('cm1',3,2,'08:45','09:30','maths','geometrie','Mathématiques','Géométrie et espace'),
 ('cm1',3,3,'09:30','09:50','pause','recreation','Récréation',''),
 ('cm1',3,4,'09:50','10:35','sciences','technologies','Sciences','Technologies'),
 ('cm1',3,5,'10:35','11:20','english','writing','English','Writing'),
 ('cm1',3,6,'11:20','12:05','francais','grammaire','Français','Grammaire'),
 ('cm1',3,7,'12:05','13:20','pause','dejeuner','Pause déjeuner',''),
 ('cm1',3,8,'13:20','14:05','langues','langue-nationale','Langues nationales','Langue nationale'),
 ('cm1',3,9,'14:05','14:50','devperso','artisanat','Dév. personnel','Artisanat'),
 ('cm1',3,10,'14:50','15:05','pause','recreation','Récréation',''),
 ('cm1',3,11,'15:05','16:00','etude','devoirs','Étude surveillée','Devoirs'),
 ('cm1',4,1,'08:00','08:45','francais','litterature','Français','Littérature'),
 ('cm1',4,2,'08:45','09:30','maths','statistiques','Mathématiques','Statistiques'),
 ('cm1',4,3,'09:30','09:50','pause','recreation','Récréation',''),
 ('cm1',4,4,'09:50','10:35','sciences','sciences-terre','Sciences','Sciences de la Terre'),
 ('cm1',4,5,'10:35','11:20','english','grammar','English','Grammar'),
 ('cm1',4,6,'11:20','12:05','francais','conjugaison','Français','Conjugaison'),
 ('cm1',4,7,'12:05','13:20','pause','dejeuner','Pause déjeuner',''),
 ('cm1',4,8,'13:20','14:05','shs','histoire','Sciences humaines','Histoire'),
 ('cm1',4,9,'14:05','14:50','eps','sports-co','EPS','Sports collectifs'),
 ('cm1',4,10,'14:50','15:05','pause','recreation','Récréation',''),
 ('cm1',4,11,'15:05','16:00','etude','devoirs','Étude surveillée','Devoirs'),
 ('cm1',5,1,'08:00','08:45','francais','production-ecrits','Français','Production d''écrits'),
 ('cm1',5,2,'08:45','09:30','maths','nombres-calculs','Mathématiques','Nombres et calculs'),
 ('cm1',5,3,'09:30','09:50','pause','recreation','Récréation',''),
 ('cm1',5,4,'09:50','10:35','sciences','environnement','Sciences','Environnement'),
 ('cm1',5,5,'10:35','11:20','shs','citoyennete','Sciences humaines','Éducation à la citoyenneté'),
 ('cm1',5,6,'11:20','12:05','francais','vocabulaire','Français','Vocabulaire'),
 ('cm1',5,7,'12:05','13:20','pause','dejeuner','Pause déjeuner',''),
 ('cm1',5,8,'13:20','14:05','tic','production-tic','TIC','Production avec les outils TIC'),
 ('cm1',5,9,'14:05','14:50','arts','arts-visuels','Arts','Arts visuels'),
 ('cm1',5,10,'14:50','15:05','pause','recreation','Récréation',''),
 ('cm1',5,11,'15:05','16:00','etude','devoirs','Étude surveillée','Devoirs')
) as v
where not exists (
  select 1 from public.timetable_slots where level = 'cm1' and owner_teacher_id is null
);


-- ============================================================================
-- 6 · TOUT LE RESTE
-- ============================================================================
do $$
declare
  v_pass  constant text := 'Demo2026!';
  v_fin   constant date := current_date - 1;   -- dernier jour évalué
  v_ecart constant int  := 3;                  -- jours entre deux leçons évaluées

  s_deido constant uuid := '11111111-1111-4111-8111-111111111111';
  s_palm  constant uuid := '22222222-2222-4222-8222-222222222222';
  s_mich  constant uuid := '33333333-3333-4333-8333-333333333333';

  -- Prénoms et noms camerounais, parcourus avec deux pas premiers différents
  -- (7 et 13) : les couples ne se répètent pas avant longtemps.
  v_prenoms constant text[] := array[
    'Patrick','Marie','Jean','Joseph','Christiane','Alice','Bernard','Rose','Éric','Estelle',
    'Cédric','Nadège','Serge','Yolande','Aristide','Larissa','Ghislain','Carine','Landry','Sandrine',
    'Achille','Prudence','Boris','Mireille','Armand','Solange','Steve','Bertrande','Franck','Diane',
    'Hervé','Julienne','Willy','Odette','Brice','Chantal','Ulrich','Sylvie','Rodrigue','Laure'];
  v_noms constant text[] := array[
    'ABENA','ATANGANA','BEKOLO','BILOA','DJOMO','EBALE','ESSOMBA','ETOUNDI','FOUDA','KAMDEM',
    'KAMGA','KENFACK','MANGA','MBALLA','MBIDA','MENGUE','NANA','NDONGO','NGONO','NGUELE',
    'NJIKE','NKOLO','NOAH','ONANA','OWONA','SAMA','TCHATCHOUA','TCHOUA','TSAGUE','WANDJI',
    'ZANGA','ABEGA','AMOUGOU','BELINGA','EDOA','EYENGA','MEKONGO','NGOA','TAMO','BIKONO'];
  v_alpha constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   -- sans I L O 0 1

  c record; r record;
  t_id uuid; st_id uuid; p_id uuid;
  -- La leçon « difficile » est choisie une fois pour TOUTE l'école de Deido.
  -- Choisie par classe, elle aurait été diluée : `educam_hard_lessons` agrège
  -- par école, donc une classe sur deux en échec ne fait que 21 % au total,
  -- pas 42 % — la carte du directeur restait muette. Vérifié sur banc d'essai.
  i int; k int; n int; essai int; n_tpl int;
  v_lecons bigint[]; v_lecon bigint; v_dure bigint := null;
  v_date date; v_quand timestamptz;
  v_note int; v_total int; v_aptitude numeric;
  v_code text; v_h text; v_nom text; v_titre_dure text;
  v_eleves uuid[];
  v_junior uuid;
begin

  -- La notion que toute l'école de Deido a mal comprise : une leçon de l'unité 2,
  -- enseignée par les DEUX classes de CM1, donc visible dans l'agrégat d'école.
  -- De préférence une leçon de mathématiques : le message envoyé au parent
  -- parle d'un partage en parts égales, il doit rester crédible.
  select l.id, l.title into v_dure, v_titre_dure from public.lessons l
   where l.level = 'cm1' and l.unit_number = 2
   order by (l.subject_id = 'maths') desc, l.week_number desc, l.id
   limit 1;

  -- ==========================================================================
  -- 6.1 Superadministrateur et directions
  -- ==========================================================================
  t_id := public.educam_demo_user('admin@demo.educam.cm', v_pass, 'Direction Mansa Musa (démo)');
  insert into public.teachers (id, full_name, level, role, school_id, class_label)
  values (t_id, 'Direction Mansa Musa (démo)', 'cm1', 'admin', s_deido, null);

  t_id := public.educam_demo_user('direction.deido@demo.educam.cm', v_pass, 'Mme Solange ATANGANA');
  insert into public.teachers (id, full_name, level, role, school_id, class_label)
  values (t_id, 'Mme Solange ATANGANA', 'cm1', 'school_admin', s_deido, 'Direction');

  t_id := public.educam_demo_user('direction.palmiers@demo.educam.cm', v_pass, 'M. Christian NANA');
  insert into public.teachers (id, full_name, level, role, school_id, class_label)
  values (t_id, 'M. Christian NANA', 'cm1', 'school_admin', s_palm, 'Direction');

  t_id := public.educam_demo_user('direction.saintmichel@demo.educam.cm', v_pass, 'Mme Marie-Claire EDOA');
  insert into public.teachers (id, full_name, level, role, school_id, class_label)
  values (t_id, 'Mme Marie-Claire EDOA', 'cm1', 'school_admin', s_mich, 'Direction');

  -- ==========================================================================
  -- 6.2 Les classes, une par une
  -- ==========================================================================
  for c in select * from _demo_classes order by rang loop

    -- ---- l'enseignant ------------------------------------------------------
    t_id := public.educam_demo_user(c.ens_mail, v_pass, c.ens_nom);
    insert into public.teachers (id, full_name, level, role, school_id, class_label)
    values (t_id, c.ens_nom, c.niveau, 'teacher', c.ecole, c.label);

    -- ---- son emploi du temps, copié du gabarit du niveau --------------------
    -- Exactement ce que fait l'inscription d'un enseignant dans page.js.
    select count(*) into n_tpl from public.timetable_slots
     where level = c.niveau and owner_teacher_id is null;

    insert into public.timetable_slots
      (level, day_of_week, slot_order, start_time, end_time, subject_id, component_id,
       subject_name, component_name, school_id, owner_teacher_id)
    select c.niveau, day_of_week, slot_order, start_time, end_time, subject_id, component_id,
           subject_name, component_name, c.ecole, t_id
      from public.timetable_slots
      -- Repli : si le niveau n'a pas de gabarit (seul le CM1 en a un), on
      -- reprend celui du CM1 en changeant l'étiquette de niveau. Une classe
      -- sans emploi du temps afficherait un accueil vide, ce qui n'est pas une
      -- vérité utile : c'est juste du contenu qui n'a pas encore été saisi.
     where owner_teacher_id is null
       and level = case when n_tpl > 0 then c.niveau else 'cm1' end;

    -- ---- les élèves --------------------------------------------------------
    v_eleves := '{}';
    for i in 1 .. c.effectif loop
      v_nom := v_prenoms[1 + ((c.rang * 7 + i * 7) % 40)] || ' '
            || v_noms[1 + ((c.rang * 3 + i * 13) % 40)];

      -- Code d'accès parent : 6 caractères, déterministe, sans I L O 0 1.
      -- `students.access_code` est UNIQUE et il peut déjà exister de vrais
      -- codes : on réessaie avec un sel, exactement comme schooladmin.js.
      essai := 0;
      loop
        v_h := md5('educam-demo-code-' || c.rang || '-' || i || '-' || essai);
        v_code := '';
        for k in 0 .. 5 loop
          v_code := v_code || substr(v_alpha,
                      1 + (('x' || substr(v_h, k*2+1, 2))::bit(8)::int % 31), 1);
        end loop;
        begin
          insert into public.students (school_id, teacher_id, full_name, access_code)
          values (c.ecole, t_id, v_nom, v_code)
          returning id into st_id;
          exit;
        exception when unique_violation then
          essai := essai + 1;
          if essai > 6 then raise; end if;
        end;
      end loop;

      v_eleves := v_eleves || st_id;
    end loop;

    -- Le premier élève de Deido CM1-A est l'enfant vedette de la démonstration.
    if c.rang = 1 then
      v_junior := v_eleves[1];
      update public.students set full_name = 'Junior ABENA' where id = v_junior;
    end if;

    -- ---- quelles leçons cette classe a-t-elle enseignées ? -----------------
    v_lecons := '{}';
    for r in
      select l.id,
             l.unit_number,
             row_number() over (partition by l.unit_number
                                order by l.week_number, l.subject_id, l.id) as rn,
             count(*)  over (partition by l.unit_number) as cnt
        from public.lessons l
       where l.level = c.niveau and l.unit_number between 1 and 8
       order by l.unit_number, l.week_number, l.subject_id, l.id
    loop
      if c.couverture[r.unit_number] > 0
         and r.rn <= ceil(c.couverture[r.unit_number] * r.cnt) then
        v_lecons := v_lecons || r.id;
      end if;
    end loop;

    n := coalesce(array_length(v_lecons, 1), 0);
    raise notice '% · % — % élèves, % leçons enseignées', c.label, c.ens_nom, c.effectif, n;

    -- ---- leçons enseignées, notes, journal ---------------------------------
    v_total := 10;
    for i in 1 .. n loop
      v_lecon := v_lecons[i];

      v_date := v_fin - ((n - i) * v_ecart);
      if extract(dow from v_date) = 0 then v_date := v_date - 2;
      elsif extract(dow from v_date) = 6 then v_date := v_date - 1; end if;

      -- Heures étalées de 7 minutes : quatre validations en moins de deux
      -- minutes déclencheraient la règle « rafale » de educam_anomalies pour
      -- rien, et la console d'anomalies s'allumerait sur toute la démo.
      v_quand := v_date + time '09:00' + (i * interval '7 minutes');

      insert into public.lessons_taught (teacher_id, lesson_id, taught_at)
      values (t_id, v_lecon, v_quand)
      on conflict (teacher_id, lesson_id) do nothing;

      -- Une OUVERTURE avant chaque validation — sinon la règle « enseignée
      -- sans avoir été ouverte » s'allume partout. Une exception volontaire
      -- (Mme NGUELE, 3ᵉ leçon) pour que la console ait un vrai cas.
      if not (c.rang = 5 and i = 3) then
        insert into public.activity_log (actor_id, actor_role, school_id, event_type, lesson_id, created_at)
        values (t_id, 'teacher', c.ecole, 'lesson_open', v_lecon, v_quand - interval '12 minutes');
      end if;

      insert into public.activity_log (actor_id, actor_role, school_id, event_type, lesson_id, created_at)
      values (t_id, 'teacher', c.ecole, 'mark_taught', v_lecon, v_quand);

      -- Deux leçons de M. MBIDA restent NON ÉVALUÉES : la règle « enseignée,
      -- pas encore évaluée » a ainsi de quoi se déclencher, sur un cas qui
      -- n'accuse personne.
      if c.rang = 2 and i in (2, 6) then continue; end if;

      insert into public.activity_log (actor_id, actor_role, school_id, event_type, lesson_id, created_at)
      values (t_id, 'teacher', c.ecole, 'results_entered', v_lecon, v_quand + interval '35 minutes');

      for k in 1 .. c.effectif loop
        st_id := v_eleves[k];

        -- Aptitude propre à l'élève, STABLE d'une leçon à l'autre : c'est ce
        -- qui rend la liste « élèves à suivre » cohérente au lieu d'aléatoire.
        v_aptitude := c.moyenne + (public.educam_demo_rnd('apt-' || st_id::text, -30, 30) / 10.0);
        if st_id = v_junior then v_aptitude := 14.6; end if;

        v_note := round((v_aptitude + (public.educam_demo_rnd(
                    'note-' || st_id::text || '-' || v_lecon::text, -15, 15) / 10.0)) / 2.0);

        -- La leçon difficile : environ 42 % de la classe passe sous la moitié.
        if v_dure is not null and v_lecon = v_dure and c.ecole = s_deido then
          -- 34 et non 42 : mesuré sur banc d'essai. Les échecs « naturels »
          -- des élèves faibles s'ajoutent, et l'agrégat d'école — c'est lui que
          -- le directeur voit — se pose alors autour de 41 %.
          if public.educam_demo_rnd('dur-' || st_id::text, 0, 99) < 34 then
            v_note := public.educam_demo_rnd('durn-' || st_id::text, 2, 4);
          end if;
          if st_id = v_junior then v_note := 4; end if;   -- son unique leçon à revoir
        end if;

        v_note := greatest(0, least(v_total, v_note));

        insert into public.daily_results
          (student_id, lesson_id, school_id, teacher_id, result_date, score, total, difficulty, entered_by)
        values (st_id, v_lecon, c.ecole, t_id, v_date, v_note, v_total,
                (v_note::numeric / v_total) < 0.5, t_id)
        on conflict (student_id, lesson_id, result_date) do nothing;
      end loop;
    end loop;

    -- ---- connexions de l'enseignant ----------------------------------------
    for i in 1 .. 12 loop
      insert into public.activity_log (actor_id, actor_role, school_id, event_type, created_at)
      values (t_id, 'teacher', c.ecole, 'login', v_fin - (i * 2) + time '07:40');
    end loop;

    -- ---- une rafale volontaire ---------------------------------------------
    -- M. TAMO valide cinq leçons en 90 secondes : exactement le comportement
    -- que la règle « rafale de validations » est là pour faire remarquer.
    -- Les ouvertures correspondantes restent à leur date d'origine, donc bien
    -- AVANT : la règle « enseignée sans être ouverte » ne se déclenche pas.
    if c.rang = 7 and n >= 5 then
      for i in 1 .. 5 loop
        update public.lessons_taught
           set taught_at = (v_fin - 1) + time '16:20' + (i * interval '18 seconds')
         where teacher_id = t_id and lesson_id = v_lecons[i];
        update public.activity_log
           set created_at = (v_fin - 1) + time '16:20' + (i * interval '18 seconds')
         where actor_id = t_id and event_type = 'mark_taught' and lesson_id = v_lecons[i];
      end loop;
    end if;

    -- ---- les parents --------------------------------------------------------
    -- Quatre comptes par classe CM1 : assez pour que la messagerie et
    -- l'adoption soient crédibles, pas assez pour noyer la console.
    if c.niveau = 'cm1' then
      for i in 1 .. 4 loop
        st_id := v_eleves[i];
        select full_name into v_nom from public.students where id = st_id;

        p_id := public.educam_demo_user(
                  'parent' || c.rang || i || '@demo.educam.cm', v_pass, 'Parent de ' || v_nom);
        insert into public.parents (id, full_name, student_id)
        values (p_id, 'M. ' || split_part(v_nom, ' ', 2), st_id);

        if c.rang = 1 and i = 1 then
          update public.parents set full_name = 'M. Paul ABENA' where id = p_id;
        end if;

        -- Trois parents ne se connectent JAMAIS. La règle « parent jamais
        -- connecté » doit avoir de vrais cas : c'est le signal d'adoption le
        -- plus important d'un pilote, et il ne sert à rien s'il est vide.
        if not (i = 4 and c.rang in (1, 5, 7)) then
          for k in 1 .. public.educam_demo_rnd('nlog-' || p_id::text, 3, 14) loop
            insert into public.activity_log (actor_id, actor_role, school_id, event_type, created_at)
            values (p_id, 'parent', c.ecole, 'login', v_fin - (k * 2) + time '19:25');
          end loop;
        end if;
      end loop;
    end if;

  end loop;

  -- ==========================================================================
  -- 6.3 Messages et observations
  -- ==========================================================================
  select id into t_id from public.teachers
   where school_id = s_deido and class_label = 'CM1-A' limit 1;

  insert into public.messages (school_id, sender_id, audience, student_id, subject, body, created_at)
  values
   (s_deido, t_id, 'parent', v_junior, 'Leçon à revoir ce soir',
    'Bonjour Monsieur ABENA,' || chr(10) || chr(10) ||
    'Junior a eu un peu de difficulté aujourd''hui sur la leçon « ' || coalesce(v_titre_dure, 'du jour') || ' ». ' ||
    'Reprenez-la avec lui ce soir depuis son espace : quelques minutes suffisent, et ' ||
    'cela ancre bien la notion. Il a par ailleurs très bien réussi le contrôle de ' ||
    'français de lundi.' || chr(10) || chr(10) || 'Bien cordialement.',
    now() - interval '6 hours'),
   (s_deido, t_id, 'parent', v_junior, 'Félicitations pour le contrôle de français',
    'Junior a obtenu 9/10 au contrôle de français. Bravo à lui, et merci de votre suivi à la maison.',
    now() - interval '5 days');

  select id into t_id from public.teachers
   where school_id = s_deido and role = 'school_admin' limit 1;

  insert into public.messages (school_id, sender_id, audience, student_id, subject, body, created_at)
  values (s_deido, t_id, 'parent', v_junior, 'Réunion de parents — samedi 15',
          'La réunion trimestrielle des parents se tiendra samedi à 9 h dans la salle polyvalente.',
          now() - interval '9 days');

  insert into public.school_observations (school_id, author_id, body, created_at)
  values
   (s_deido, t_id, 'CM1-A accuse trois semaines de retard sur l''unité 3. Point avec Mme KAMGA prévu lundi.',
    now() - interval '2 days'),
   (s_deido, t_id, 'La leçon « ' || coalesce(v_titre_dure, '—') ||
    ' » ressort à plus de 40 % d''échec sur les deux CM1. Notion à reprendre.',
    now() - interval '4 days');

  -- ==========================================================================
  -- 6.4 Connexions du superadministrateur et des directions
  -- ==========================================================================
  for r in select id, school_id, role from public.teachers
            where role in ('admin', 'school_admin')
              and id in (select id from auth.users where email like '%@demo.educam.cm')
  loop
    for i in 1 .. 20 loop
      insert into public.activity_log (actor_id, actor_role, school_id, event_type, created_at)
      values (r.id, case when r.role = 'admin' then 'admin' else 'school_admin' end,
              r.school_id, 'login', v_fin - i + time '08:05');
    end loop;
  end loop;

  raise notice 'Jeu de démonstration installé. Mot de passe de tous les comptes : %', v_pass;
end $$;

drop table if exists _demo_classes;


-- ============================================================================
-- 7 · CONTRÔLE RAPIDE (ne dépend d'aucune vue)
-- ============================================================================
select 'écoles' as objet, count(*)::text as valeur from public.schools where name like 'DÉMO · %'
union all select 'classes', count(*)::text from public.teachers
  where role = 'teacher' and school_id in (select id from public.schools where name like 'DÉMO · %')
union all select 'élèves', count(*)::text from public.students
  where school_id in (select id from public.schools where name like 'DÉMO · %')
union all select 'comptes parents', count(*)::text from public.parents
  where id in (select id from auth.users where email like '%@demo.educam.cm')
union all select 'notes saisies', count(*)::text from public.daily_results
  where school_id in (select id from public.schools where name like 'DÉMO · %')
union all select 'leçons enseignées', count(*)::text from public.lessons_taught lt
  join public.teachers t on t.id = lt.teacher_id
  where t.school_id in (select id from public.schools where name like 'DÉMO · %')
union all select 'lignes de journal', count(*)::text from public.activity_log
  where school_id in (select id from public.schools where name like 'DÉMO · %')
union all select 'comptes de connexion', count(*)::text from auth.users
  where email like '%@demo.educam.cm';
