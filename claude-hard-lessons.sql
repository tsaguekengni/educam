-- ============================================================================
-- EduCam — « Leçon la plus manquée » (tableau de bord du directeur)
-- À exécuter dans l'éditeur SQL de Supabase. Idempotent : relançable.
--
-- POURQUOI
-- Un taux d'échec élevé sur une leçon précise n'accuse pas l'enseignant : il
-- désigne une notion à réexpliquer, et parfois une leçon à réécrire. C'est le
-- seul signal qui remonte du terrain vers le contenu.
--
-- SEUIL D'ÉCHEC : score / total < 0,5 — exactement celui qui, côté élève,
-- marque déjà la leçon « à revoir » chez le parent. Deux seuils différents
-- pour la même notion produiraient deux vérités contradictoires.
--
-- La vue hérite des politiques RLS des tables sous-jacentes (elle n'est PAS
-- SECURITY DEFINER) : un directeur ne voit que son école.
-- ============================================================================

-- `daily_results` porte school_id directement (vérifié dans results.js, ligne
-- de l'upsert) : inutile de passer par `students`.
create or replace view public.educam_hard_lessons as
select
  r.school_id,
  r.lesson_id,
  l.title,
  count(*)                                                    as attempts,
  count(*) filter (where r.total > 0 and r.score::numeric / r.total < 0.5)::numeric
    / nullif(count(*), 0)                                     as fail_rate
from public.daily_results r
join public.lessons l on l.id = r.lesson_id
where r.total > 0 and r.score is not null
group by r.school_id, r.lesson_id, l.title
having count(*) >= 5;   -- sous 5 contrôles, un « taux » n'a aucun sens

-- Contrôle : les leçons qui dépassent 40 % d'échec, par école.
select school_id, title, attempts, round(fail_rate * 100) as pct
from public.educam_hard_lessons
where fail_rate >= 0.4
order by fail_rate desc;
