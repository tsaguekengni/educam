-- ============================================================================
-- EduCam — EMPLOI DU TEMPS : diagnostic, réparation, et garde-fou
-- Dernière mise à jour : 2026-08-15 UTC
-- À exécuter dans l'éditeur SQL de Supabase. Idempotent : relançable.
--
-- LE SYMPTÔME
-- L'écran « Emploi du temps » affiche le même cours cinq ou six fois dans le
-- même créneau. Le rendu n'y est pour rien : `getDaySlots` filtre simplement
-- sur `day_of_week` et affiche ce qu'il reçoit. Il y a donc réellement
-- plusieurs lignes identiques dans `timetable_slots`.
--
-- CE QUE FAIT CE FICHIER
--   1. DIAGNOSTIC — combien de lignes par classe, et combien en trop.
--      Lisez ce tableau AVANT de continuer : il dit d'où vient le problème.
--   2. RÉPARATION — supprime les doublons, garde la ligne la plus ancienne.
--   3. GARDE-FOU — deux index uniques qui rendent le problème IMPOSSIBLE
--      à recréer, quelle que soit la cause.
--
-- L'INVARIANT, écrit une fois pour toutes :
--   • une classe (owner_teacher_id non nul) a UNE seule ligne par jour et par
--     position dans la journée ;
--   • un gabarit de niveau (owner_teacher_id nul) a UNE seule ligne par niveau,
--     jour et position.
-- Aucun emploi du temps réel ne viole cela. C'est exactement le genre de règle
-- qui aurait dû être en base depuis le début : tant qu'elle n'y est pas, chaque
-- chemin d'écriture doit y penser tout seul — et il y en a quatre
-- (`page.js` à l'inscription, `schooladmin.js` à l'édition, le fichier
-- `timetable-cm1-8to4.sql`, et le seed de démonstration).
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. DIAGNOSTIC — à lire avant de réparer
-- ---------------------------------------------------------------------------

-- 1a. Le gabarit partagé : combien de lignes par niveau ?
--     Attendu : 55 pour le CM1 (11 créneaux × 5 jours). Si vous lisez 110, 165
--     ou 275, le gabarit lui-même a été inséré plusieurs fois.
select 'gabarit partagé' as objet, level as niveau, count(*) as lignes,
       count(*) filter (where subject_id not in ('pause','etude')) as cours
  from public.timetable_slots
 where owner_teacher_id is null
 group by level
 order by level;

-- 1b. Les emplois du temps par classe : combien de lignes, et combien de trop ?
--     `en_trop` = 0 partout signifie qu'il n'y a aucun doublon.
select s.name as ecole, t.class_label as classe, t.full_name as enseignant,
       count(*) as lignes,
       count(*) - count(distinct (ts.day_of_week, ts.slot_order)) as en_trop
  from public.timetable_slots ts
  join public.teachers t on t.id = ts.owner_teacher_id
  left join public.schools s on s.id = t.school_id
 group by s.name, t.class_label, t.full_name
 having count(*) > 0
 order by en_trop desc, s.name, t.class_label;

-- 1c. Le détail d'un créneau qui pose problème, pour comprendre l'origine :
--     des `id` très proches = une même transaction a inséré plusieurs fois ;
--     des `id` très éloignés = plusieurs exécutions à des moments différents.
select ts.id, t.full_name as enseignant, ts.level, ts.day_of_week, ts.slot_order,
       ts.start_time, ts.subject_id
  from public.timetable_slots ts
  join public.teachers t on t.id = ts.owner_teacher_id
 where ts.day_of_week = 1 and ts.slot_order = 1
 order by t.full_name, ts.id;


-- ---------------------------------------------------------------------------
-- 2. RÉPARATION
--    On garde la ligne au plus petit `id` de chaque groupe : la première
--    écrite, donc celle à laquelle d'éventuelles autres données se réfèrent.
-- ---------------------------------------------------------------------------
begin;

-- 2a. Doublons dans les emplois du temps PAR CLASSE.
delete from public.timetable_slots ts
 where ts.owner_teacher_id is not null
   and exists (
     select 1 from public.timetable_slots x
      where x.owner_teacher_id = ts.owner_teacher_id
        and x.day_of_week      = ts.day_of_week
        and x.slot_order       = ts.slot_order
        and x.id < ts.id
   );

-- 2b. Doublons dans les gabarits PARTAGÉS.
delete from public.timetable_slots ts
 where ts.owner_teacher_id is null
   and exists (
     select 1 from public.timetable_slots x
      where x.owner_teacher_id is null
        and x.level       = ts.level
        and x.day_of_week = ts.day_of_week
        and x.slot_order  = ts.slot_order
        and x.id < ts.id
   );

commit;


-- ---------------------------------------------------------------------------
-- 3. GARDE-FOU
--    Deux index uniques partiels. À partir d'ici, une deuxième insertion du
--    même créneau ÉCHOUE au lieu de passer inaperçue.
--
--    Note pour plus tard : `schooladmin.js` et le seed suppriment avant de
--    réinsérer, ils restent compatibles. Si un jour un chemin d'écriture doit
--    tolérer le rejeu, il lui suffira d'ajouter
--      on conflict (owner_teacher_id, day_of_week, slot_order) do nothing
-- ---------------------------------------------------------------------------
create unique index if not exists timetable_slots_classe_unique
  on public.timetable_slots (owner_teacher_id, day_of_week, slot_order)
  where owner_teacher_id is not null;

create unique index if not exists timetable_slots_gabarit_unique
  on public.timetable_slots (level, day_of_week, slot_order)
  where owner_teacher_id is null;


-- ---------------------------------------------------------------------------
-- 4. CONTRÔLE APRÈS RÉPARATION
--    `en_trop` doit valoir 0 sur toutes les lignes, et le gabarit CM1 doit
--    afficher 55 lignes dont 35 cours.
-- ---------------------------------------------------------------------------
select 'gabarit partagé' as objet, level as niveau, count(*) as lignes,
       count(*) filter (where subject_id not in ('pause','etude')) as cours
  from public.timetable_slots where owner_teacher_id is null
 group by level order by level;

select s.name as ecole, t.class_label as classe,
       count(*) as lignes,
       count(*) - count(distinct (ts.day_of_week, ts.slot_order)) as en_trop
  from public.timetable_slots ts
  join public.teachers t on t.id = ts.owner_teacher_id
  left join public.schools s on s.id = t.school_id
 group by s.name, t.class_label
 order by s.name, t.class_label;
