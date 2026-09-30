-- ════════════════════════════════════════════════════════════════════════════
-- EduCam — claude-parent-contacts.sql
-- Lot C : les coordonnées des parents deviennent ILLISIBLES depuis un
--         navigateur, pour tout le monde. Les valeurs ne passent plus que par
--         deux fonctions qui vérifient le rôle EN BASE.
--
-- 2026-09-30. Document de référence :
--   claude/EduCam_Confidentialite_Coordonnees_Parents.md
--
-- ─── POURQUOI ───────────────────────────────────────────────────────────────
-- La sécurité niveau ligne de Supabase filtre les LIGNES, jamais les COLONNES.
-- La politique `student read scoped` autorise la lecture de tout élève de
-- l'école SANS condition de rôle : n'importe quel ENSEIGNANT recevait donc le
-- numéro de n'importe quel parent de l'école, dans son navigateur. Masquer la
-- colonne à l'écran ne protégeait rien.
--
-- On utilise donc les DROITS PAR COLONNE de PostgreSQL, qui s'appliquent EN
-- PLUS de RLS. `service_role` (les fonctions Edge WhatsApp) et `postgres`
-- gardent leurs droits : AUCUNE fonction Edge n'a été modifiée.
--
-- ─── ⚠️ L'ORDRE EST INVERSÉ PAR RAPPORT À LA RÈGLE HABITUELLE ───────────────
-- La règle du projet dit « la migration passe AVANT le code ». Elle vaut pour
-- une migration ADDITIVE. Ici l'étape 2 RETIRE un droit dont le code actuel se
-- sert, donc :
--
--   ÉTAPE 1 (additive)  →  puis DÉPLOYER LE CODE  →  ÉTAPE 2 (fermeture)
--
-- Lancer l'étape 2 avant le déploiement empêcherait Maxime d'ajouter un élève.
-- ════════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════════════
-- ÉTAPE 1 — ADDITIF. Ne retire aucun droit, ne casse rien.
-- ✅ PASSÉE EN BASE le 2026-09-30 (migration `parent_contacts_admin_only_additive`).
--    Conservée ici pour l'historique et pour rejouer sur un autre projet.
-- ════════════════════════════════════════════════════════════════════════════

-- §1.1 Le témoin : « y a-t-il un contact ? », sans la valeur.
-- Colonne CALCULÉE : Postgres la remplit seul à chaque écriture, on ne l'écrit
-- jamais à la main. Elle a ses PROPRES droits, donc l'école la lit alors que
-- les deux colonnes qui la nourrissent sont fermées.
alter table public.students
  add column if not exists has_parent_contact boolean
  generated always as (parent_phone is not null or parent_email is not null) stored;

-- §1.2 Lire les contacts d'une classe — réservé au super-administrateur.
-- Un appelant non administrateur reçoit une liste VIDE : ce n'est pas l'écran
-- qui décide, c'est la base.
create or replace function public.educam_student_contacts(p_teacher uuid)
returns table (student_id uuid, parent_phone text, parent_email text)
language sql
security definer
set search_path = public
as $$
  select s.id, s.parent_phone, s.parent_email
  from public.students s
  where educam_is_admin() and s.teacher_id = p_teacher;
$$;

revoke all on function public.educam_student_contacts(uuid) from public;
grant execute on function public.educam_student_contacts(uuid) to authenticated;

-- §1.3 Écrire un contact — réservé au super-administrateur.
create or replace function public.educam_set_student_contact(
  p_student uuid, p_phone text, p_email text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare ok boolean;
begin
  if not educam_is_admin() then
    raise exception 'not_admin';
  end if;
  update public.students
     set parent_phone = nullif(btrim(coalesce(p_phone, '')), ''),
         parent_email = nullif(btrim(coalesce(p_email, '')), '')
   where id = p_student;
  ok := found;
  return ok;
end;
$$;

revoke all on function public.educam_set_student_contact(uuid, text, text) from public;
grant execute on function public.educam_set_student_contact(uuid, text, text) to authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- ÉTAPE 2 — FERMETURE. À lancer SEULEMENT APRÈS le déploiement du code.
-- ════════════════════════════════════════════════════════════════════════════

-- §2.1 ⚠️ CECI EST LA LIGNE QUI PROTÈGE.
-- `authenticated` = toute personne connectée (enseignant, direction, parent, et
-- Maxime lui-même). `anon` = visiteur non connecté.
-- Après cela, DEMANDER ces colonnes depuis le navigateur fait échouer la
-- requête ENTIÈRE (erreur 42501) — pas seulement renvoyer du vide.
revoke select (parent_phone, parent_email) on public.students from authenticated, anon;
revoke insert (parent_phone, parent_email) on public.students from authenticated, anon;
revoke update (parent_phone, parent_email) on public.students from authenticated, anon;

-- §2.2 Le journal WhatsApp gardait le numéro EN CLAIR.
-- `whatsapp_notifications.to_phone` est le numéro du parent, et la politique
-- autorisait la DIRECTION à lire ce journal : le numéro ressortait par là.
-- Vérifié le 2026-09-30 : AUCUN écran ne lit cette table côté navigateur, donc
-- la restriction ne casse rien.
-- Ordre volontaire : on crée la nouvelle politique AVANT de retirer l'ancienne,
-- pour ne jamais laisser la table sans aucune politique de lecture.
drop policy if exists "wa notif read admin only" on public.whatsapp_notifications;
create policy "wa notif read admin only" on public.whatsapp_notifications
  for select using (educam_is_admin());
drop policy if exists "wa notif read scoped" on public.whatsapp_notifications;


-- ════════════════════════════════════════════════════════════════════════════
-- §3 VÉRIFICATION — à lancer après l'étape 2.
-- Résultat attendu :  0  |  1  |  2  |  1
--
-- ⚠️ `droits_restants_navigateur` doit valoir 0 et RESTER à 0. Un
-- `grant all on table students to authenticated` — rejoué par un script de
-- configuration ou par distraction — effacerait les retraits colonne par
-- colonne et rouvrirait la fuite EN SILENCE. C'est le contrôle qui le détecte.
-- ════════════════════════════════════════════════════════════════════════════
select
  (select count(*) from information_schema.column_privileges
     where table_schema='public' and table_name='students'
       and grantee in ('authenticated','anon')
       and column_name in ('parent_phone','parent_email'))            as droits_restants_navigateur,
  (select count(*) from information_schema.columns
     where table_schema='public' and table_name='students'
       and column_name='has_parent_contact')                          as temoin_cree,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public'
       and p.proname in ('educam_student_contacts','educam_set_student_contact')) as fonctions_creees,
  (select count(*) from pg_policies
     where schemaname='public' and tablename='whatsapp_notifications') as politiques_journal;
