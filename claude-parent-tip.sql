-- ============================================================================
-- EduCam — « Conseil d'accompagnement pour le parent »
-- À exécuter dans l'éditeur SQL de Supabase. Idempotent : relançable sans risque.
--
-- POURQUOI
-- L'espace parent montre à la famille les leçons que l'enfant doit revoir.
-- Mais un parent peu scolarisé ne sait pas COMMENT aider : lui afficher
-- « fractions simples » ne l'avance pas. Ce champ porte une manipulation
-- concrète, faisable avec ce qu'on a chez soi.
--
-- Exemple pour « Comprendre les fractions simples (1/2, 1/4) » :
--   « Prenez une feuille ou une bande de papier. Demandez à votre enfant de la
--     couper en 2 parts égales, puis en 4. Demandez-lui de vous montrer quelle
--     part est la plus grande, et pourquoi. »
--
-- RÈGLES DE RÉDACTION (voir claude/EduCam_North_Star.md pour la voix)
--   · s'adresser au parent, pas à l'élève ;
--   · une seule manipulation, avec des objets du quotidien camerounais ;
--   · aucun terme technique — ni « numérateur », ni « fraction décimale » ;
--   · 2 à 4 phrases, pas plus : c'est lu sur un téléphone, le soir.
--
-- APRÈS AVOIR EXÉCUTÉ CE FICHIER
--   Passer NEXT_PUBLIC_PARENT_TIP_ENABLED=true (Vercel → Environment Variables,
--   ou .env.local en développement) pour que le champ apparaisse dans la console
--   de contenu et dans l'espace parent. Tant que le drapeau est à false, le code
--   ne lit ni n'écrit cette colonne : l'application se comporte exactement
--   comme avant.
-- ============================================================================

alter table public.lessons
  add column if not exists parent_tip text;

comment on column public.lessons.parent_tip is
  'Conseil d''accompagnement destiné au PARENT : une manipulation concrète à '
  'faire à la maison avec des objets du quotidien. Rédigé pour un parent peu '
  'scolarisé — pas de vocabulaire technique. Affiché dans l''espace parent sur '
  'les leçons marquées « à revoir ». Ajouté le 2026-08-13 (lot F6).';

-- Vérification : combien de leçons ont déjà un conseil ?
select
  count(*)                                              as lecons,
  count(parent_tip) filter (where btrim(parent_tip) <> '') as avec_conseil
from public.lessons;
