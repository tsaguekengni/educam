-- EduCam — agrégats du tableau de bord directeur
-- Dernière mise à jour : 2026-08-11
--
-- POURQUOI CE FICHIER
-- Le tableau de bord (`src/app/schooldashboard.js`) calcule aujourd'hui ses
-- indicateurs DANS LE NAVIGATEUR, à partir de requêtes plafonnées à 4 000
-- résultats. C'est tenable pour une école pilote de quelques centaines
-- d'élèves ; ça ne l'est plus au-delà — on tirerait des milliers de lignes
-- vers un téléphone sur données payantes.
--
-- Ces vues déplacent le calcul côté base. Une fois appliquées, l'écran lit
-- quelques dizaines de lignes au lieu de plusieurs milliers.
--
-- À APPLIQUER dans l'éditeur SQL de Supabase. Aucune donnée n'est modifiée :
-- ce ne sont que des vues en lecture.

-- ---------------------------------------------------------------------------
-- 1. Moyenne par élève, sur 20
-- ---------------------------------------------------------------------------
create or replace view educam_student_averages as
select
  r.school_id,
  r.student_id,
  s.full_name,
  s.teacher_id,
  count(*)                                             as evaluations,
  round(avg(r.score::numeric / nullif(r.total, 0)) * 20, 2) as average_20,
  sum(case when r.difficulty then 1 else 0 end)        as difficulty_count,
  max(r.result_date)                                   as last_result_date
from daily_results r
join students s on s.id = r.student_id
where r.total > 0 and r.score is not null
group by r.school_id, r.student_id, s.full_name, s.teacher_id;

-- ---------------------------------------------------------------------------
-- 2. Moyenne par classe (une classe = un enseignant)
-- ---------------------------------------------------------------------------
create or replace view educam_class_averages as
select
  a.school_id,
  a.teacher_id,
  t.full_name        as teacher_name,
  t.level,
  count(*)                        as students_evaluated,
  round(avg(a.average_20), 2)     as average_20,
  sum(case when a.average_20 < 10 then 1 else 0 end) as below_pass
from educam_student_averages a
join teachers t on t.id = a.teacher_id
group by a.school_id, a.teacher_id, t.full_name, t.level;

-- ---------------------------------------------------------------------------
-- 3. Évolution mensuelle de la moyenne de l'école
-- ---------------------------------------------------------------------------
create or replace view educam_school_trend as
select
  r.school_id,
  to_char(r.result_date, 'YYYY-MM')                        as month,
  count(*)                                                 as evaluations,
  round(avg(r.score::numeric / nullif(r.total, 0)) * 20, 2) as average_20
from daily_results r
where r.total > 0 and r.score is not null
group by r.school_id, to_char(r.result_date, 'YYYY-MM');

-- ---------------------------------------------------------------------------
-- 4. Répartition des élèves par tranche de moyenne
-- ---------------------------------------------------------------------------
create or replace view educam_score_bands as
select
  school_id,
  case
    when average_20 <  8 then '< 8'
    when average_20 < 10 then '8-10'
    when average_20 < 12 then '10-12'
    when average_20 < 14 then '12-14'
    when average_20 < 16 then '14-16'
    else '16+'
  end as band,
  count(*) as students
from educam_student_averages
group by school_id, band;

-- ---------------------------------------------------------------------------
-- 5. Couverture du programme : leçons enseignées par classe et par unité
-- ---------------------------------------------------------------------------
-- C'est la source de la carte de chaleur « avance et retard ». L'écart en
-- semaines reste calculé côté application, car il dépend du calendrier
-- régional (Littoral : Sept=U1 … Avril=U8) qui n'est pas en base.
create or replace view educam_coverage as
select
  t.school_id,
  lt.teacher_id,
  t.level,
  l.unit_number,
  count(distinct lt.lesson_id) as lessons_taught,
  (select count(*) from lessons l2
    where l2.unit_number = l.unit_number and l2.level = t.level) as lessons_expected
from lessons_taught lt
join teachers t on t.id = lt.teacher_id
join lessons  l on l.id = lt.lesson_id
group by t.school_id, lt.teacher_id, t.level, l.unit_number;

-- ---------------------------------------------------------------------------
-- SÉCURITÉ
-- ---------------------------------------------------------------------------
-- Ces vues héritent des politiques RLS des tables sous-jacentes tant qu'elles
-- ne sont pas déclarées SECURITY DEFINER — c'est voulu : un directeur ne doit
-- voir que SON école. Vérifiez, après application, qu'un compte directeur
-- interrogeant `educam_student_averages` sans filtre ne remonte bien que les
-- élèves de son établissement.
