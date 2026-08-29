-- ============================================================================
-- EduCam — SUPPRESSION COMPLÈTE DES DONNÉES DE DÉMONSTRATION
-- Dernière mise à jour : 2026-08-15 UTC
-- À exécuter dans l'éditeur SQL de Supabase.
--
-- CE FICHIER NE TOUCHE QUE LA DÉMO.
-- Tout ce que le seed crée porte une marque, et une seule :
--
--   • les écoles s'appellent « DÉMO · … »      → schools.name LIKE 'DÉMO · %'
--   • les comptes se terminent par @demo.educam.cm → auth.users.email
--
-- Rien d'autre n'est visé. Aucune ligne existante n'est modifiée par le seed,
-- donc aucune n'a besoin d'être restaurée ici : il suffit de supprimer.
--
-- ORDRE : on remonte les dépendances à la main plutôt que de se fier aux
-- CASCADE, parce que `lessons_taught`, `daily_results` et `activity_log`
-- pointent vers `auth.users` / `teachers` avec des règles différentes
-- (CASCADE ici, SET NULL là). Supprimer dans le désordre laisserait des
-- orphelins invisibles qui pollueraient les vues d'agrégation.
--
-- IDEMPOTENT : relançable autant de fois que voulu, y compris si la démo
-- n'a jamais été installée.
-- ============================================================================

begin;

-- Les identifiants de la démo, calculés une fois.
create temporary table _demo_ids on commit drop as
with s as (
  select id from public.schools where name like 'DÉMO · %'
),
t as (
  select id from public.teachers where school_id in (select id from s)
  union
  select id from public.teachers
   where id in (select id from auth.users where email like '%@demo.educam.cm')
),
st as (
  select id from public.students where school_id in (select id from s)
),
p as (
  select id from public.parents where student_id in (select id from st)
  union
  select id from public.parents
   where id in (select id from auth.users where email like '%@demo.educam.cm')
),
u as (
  select id from auth.users where email like '%@demo.educam.cm'
)
select
  (select coalesce(array_agg(id), '{}') from s)  as schools,
  (select coalesce(array_agg(id), '{}') from t)  as teachers,
  (select coalesce(array_agg(id), '{}') from st) as students,
  (select coalesce(array_agg(id), '{}') from p)  as parents,
  (select coalesce(array_agg(id), '{}') from u)  as users;

-- 1. Les feuilles : rien ne dépend d'elles.
delete from public.daily_results
 where school_id  in (select unnest(schools) from _demo_ids)
    or student_id in (select unnest(students) from _demo_ids)
    or teacher_id in (select unnest(teachers) from _demo_ids);

delete from public.activity_log
 where school_id in (select unnest(schools) from _demo_ids)
    or actor_id  in (select unnest(teachers) from _demo_ids)
    or actor_id  in (select unnest(parents) from _demo_ids);

delete from public.messages
 where school_id  in (select unnest(schools) from _demo_ids)
    or student_id in (select unnest(students) from _demo_ids)
    or sender_id  in (select unnest(teachers) from _demo_ids);

delete from public.school_observations
 where school_id in (select unnest(schools) from _demo_ids)
    or author_id in (select unnest(teachers) from _demo_ids);

delete from public.lessons_taught
 where teacher_id in (select unnest(teachers) from _demo_ids);

delete from public.teacher_readiness
 where teacher_id in (select unnest(teachers) from _demo_ids);

delete from public.lesson_feedback
 where teacher_id in (select unnest(teachers) from _demo_ids);

-- 2. Les emplois du temps PAR CLASSE de la démo.
--    `owner_teacher_id is not null` protège le gabarit partagé du niveau,
--    qui n'appartient pas à la démo et doit survivre.
delete from public.timetable_slots
 where owner_teacher_id in (select unnest(teachers) from _demo_ids)
    or (school_id in (select unnest(schools) from _demo_ids) and owner_teacher_id is not null);

-- 3. Les personnes, en remontant les liens.
delete from public.parents  where id in (select unnest(parents) from _demo_ids);
delete from public.students where id in (select unnest(students) from _demo_ids);
delete from public.teachers where id in (select unnest(teachers) from _demo_ids);
delete from public.schools  where id in (select unnest(schools) from _demo_ids);

-- 4. Les comptes d'authentification.
--    auth.identities est en CASCADE sur auth.users : le delete suffit.
delete from auth.users where id in (select unnest(users) from _demo_ids);

-- 5. Les deux fonctions utilitaires créées par le seed.
drop function if exists public.educam_demo_user(text, text, text);
drop function if exists public.educam_demo_rnd(text, int, int);

commit;

-- ============================================================================
-- CONTRÔLE — les six lignes doivent toutes afficher 0.
-- Si l'une ne l'est pas, ne relancez pas le seed : dites-le moi.
-- ============================================================================
select 'écoles démo'      as objet, count(*) as restant from public.schools where name like 'DÉMO · %'
union all
select 'comptes démo',    count(*) from auth.users where email like '%@demo.educam.cm'
union all
select 'enseignants orphelins', count(*) from public.teachers t
  where t.school_id is not null and not exists (select 1 from public.schools s where s.id = t.school_id)
union all
select 'élèves orphelins', count(*) from public.students st
  where not exists (select 1 from public.schools s where s.id = st.school_id)
union all
select 'résultats orphelins', count(*) from public.daily_results r
  where not exists (select 1 from public.students st where st.id = r.student_id)
union all
select 'parents orphelins', count(*) from public.parents p
  where p.student_id is not null and not exists (select 1 from public.students st where st.id = p.student_id);
