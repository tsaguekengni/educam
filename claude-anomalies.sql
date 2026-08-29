-- ============================================================================
-- EduCam — détection d'anomalies (superadministrateur)
-- À exécuter dans l'éditeur SQL de Supabase. Idempotent : relançable.
--
-- CE QUE CE FICHIER N'EST PAS
-- Ce n'est pas un outil d'accusation. Une anomalie est un MOTIF DE VÉRIFIER,
-- jamais une preuve. Les libellés en français sont écrits dans cet esprit et
-- l'interface les reprend tels quels.
--
-- CE QUI A ÉTÉ ÉCARTÉ, ET POURQUOI — vérifié dans le code le 2026-08-13
--
--   × « leçon validée avec un temps d'ouverture < 30 secondes »
--     `activity_log` enregistre des ÉVÉNEMENTS, pas des durées, et il n'existe
--     aucun événement de fermeture. La règle est donc réduite à sa part
--     mesurable : `mark_taught` sans `lesson_open` préalable sur la même leçon.
--
--   × « saisie groupée de plus de 20 notes en moins de 2 minutes »
--     `results.js` déduplique : il journalise `results_entered` UNE SEULE FOIS
--     par leçon (voir `loggedRef`), pas une fois par note. Compter les notes
--     depuis le journal donnerait toujours 1. La règle est remplacée par les
--     RAFALES DE VALIDATION, qui elles sont mesurables et visent le même
--     comportement.
--
--   × « activité entre 22 h et 05 h »
--     `created_at` est en UTC, le Cameroun en UTC+1 : une fenêtre horaire
--     écrite naïvement se décale d'une heure. Et un enseignant qui prépare le
--     soir n'est pas un fraudeur. On vise le comportement, pas l'heure.
--
--   ✓ « leçon enseignée mais jamais évaluée après 48 h »
--     D'abord écartée par prudence, puis ÉCRITE (règle 4) : vérification faite,
--     `daily_results` porte bien `teacher_id` ET `lesson_id` — l'upsert de
--     results.js les renseigne tous les deux. Le lien existait.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Leçon marquée « enseignée » sans avoir jamais été ouverte
-- ---------------------------------------------------------------------------
create or replace view public.educam_anomaly_taught_unopened as
select
  'taught_unopened'::text as kind,
  'crit'::text            as severity,
  t.actor_id,
  t.school_id,
  t.lesson_id,
  t.created_at            as at,
  'Leçon marquée « enseignée » sans avoir été ouverte'::text as title,
  'Aucune ouverture de cette leçon par cette personne avant la validation.'::text as detail
from public.activity_log t
where t.event_type = 'mark_taught'
  and t.lesson_id is not null
  and not exists (
    select 1
    from public.activity_log o
    where o.event_type = 'lesson_open'
      and o.actor_id  = t.actor_id
      and o.lesson_id = t.lesson_id
      and o.created_at <= t.created_at
  );

-- ---------------------------------------------------------------------------
-- 2. Rafale de validations : 4 leçons ou plus en moins de 2 minutes
--    (remplace la règle « horaires atypiques » : le comportement, pas l'heure)
-- ---------------------------------------------------------------------------
create or replace view public.educam_anomaly_taught_burst as
with marks as (
  select
    actor_id, school_id, created_at,
    count(*) over (
      partition by actor_id
      order by created_at
      range between interval '2 minutes' preceding and current row
    ) as in_window
  from public.activity_log
  where event_type = 'mark_taught'
)
select
  'taught_burst'::text as kind,
  'warn'::text         as severity,
  actor_id,
  school_id,
  null::bigint         as lesson_id,
  max(created_at)      as at,
  'Rafale de validations'::text as title,
  max(in_window)::text || ' leçons marquées « enseignées » en moins de 2 minutes.' as detail
from marks
where in_window >= 4
group by actor_id, school_id, date_trunc('hour', created_at);

-- ---------------------------------------------------------------------------
-- 3. Parents qui ne se sont jamais connectés
--    Le signal d'adoption le plus important du pilote : un espace parent que
--    personne n'ouvre ne sert à rien, quelle que soit la qualité du contenu.
-- ---------------------------------------------------------------------------
create or replace view public.educam_anomaly_parent_dormant as
select
  'parent_dormant'::text as kind,
  'info'::text           as severity,
  p.id                   as actor_id,
  s.school_id,
  null::bigint           as lesson_id,
  null::timestamptz      as at,
  'Parent jamais connecté'::text as title,
  coalesce(p.full_name, 'Ce parent') || ' n''a jamais ouvert son espace.' as detail
from public.parents p
left join public.students s on s.id = p.student_id
where not exists (
  select 1 from public.activity_log a
  where a.actor_id = p.id and a.event_type = 'login'
);

-- ---------------------------------------------------------------------------
-- 4. Leçon enseignée mais jamais évaluée après 48 h
--    Écrite après vérification : `daily_results` porte bien `teacher_id` ET
--    `lesson_id` (voir l'upsert de results.js). Le lien existe, la règle est
--    donc mesurable — elle était en attente pour cette seule raison.
--    Ce n'est pas une faute : c'est un contrôle qui n'a peut-être pas encore
--    eu lieu. D'où la gravité « info ».
-- ---------------------------------------------------------------------------
create or replace view public.educam_anomaly_taught_unassessed as
select
  'taught_unassessed'::text as kind,
  'info'::text              as severity,
  t.teacher_id              as actor_id,
  null::uuid                as school_id,
  t.lesson_id,
  t.taught_at               as at,
  'Enseignée, pas encore évaluée'::text as title,
  'Leçon marquée « enseignée » il y a plus de 48 h, sans aucune note saisie.'::text as detail
from public.lessons_taught t
where t.taught_at < now() - interval '48 hours'
  and not exists (
    select 1 from public.daily_results r
    where r.lesson_id = t.lesson_id and r.teacher_id = t.teacher_id
  );

-- ---------------------------------------------------------------------------
-- Vue unique lue par l'interface
-- ---------------------------------------------------------------------------
create or replace view public.educam_anomalies as
select * from public.educam_anomaly_taught_unopened
union all
select * from public.educam_anomaly_taught_burst
union all
select * from public.educam_anomaly_parent_dormant
union all
select * from public.educam_anomaly_taught_unassessed;

-- Contrôle : combien d'anomalies, par type ?
select kind, severity, count(*) from public.educam_anomalies group by 1, 2 order by 3 desc;

-- ---------------------------------------------------------------------------
-- NOTE : si `school_id` est NULL sur la règle 4, c'est que `lessons_taught` ne
-- le porte pas. Le remonter par une jointure sur `teachers` si le filtrage par
-- école devient nécessaire côté interface.
-- ---------------------------------------------------------------------------
