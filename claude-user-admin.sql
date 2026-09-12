-- ============================================================
-- EduCam — Console « Utilisateurs » (superadmin) : schéma
-- Dernière mise à jour : 2026-09-12 UTC
--
-- Ajoute les coordonnées de contact sur les comptes, pour que la console
-- superadmin puisse tenir à jour un annuaire des utilisateurs.
--
-- ADDITIF ET SANS DANGER : uniquement des colonnes nullables. Aucune politique
-- RLS n'est créée ni modifiée — les politiques existantes suffisent déjà :
--   • « teacher managed update » : USING (educam_is_admin() OR (educam_is_school_admin() AND school_id = educam_my_school_id()))
--   • « parent update own »      : USING (id = auth.uid() OR educam_is_admin())
-- Le superadmin peut donc déjà écrire sur ces deux tables ; il ne manquait que
-- les colonnes. (Le commentaire de la §4 de profiles-rls-rollout.sql dit
-- « own row only » — c'est le COMMENTAIRE qui est trompeur, pas la politique.)
--
-- ⚠️ CE QUI N'EST PAS ICI, VOLONTAIREMENT : rien ne touche à `auth.users`.
-- Le téléphone stocké ici est une COORDONNÉE, pas un identifiant de connexion :
-- il ne sert jamais à s'authentifier (pas de connexion par SMS). C'est ce choix
-- qui permet de le gérer depuis la plateforme, sans clé de service.
-- De même, `contact_email` est l'adresse où JOINDRE la personne — ce n'est pas
-- la garantie de son identifiant de connexion, qui vit dans `auth.users` et que
-- seul le tableau de bord Supabase peut changer aujourd'hui (« lot 2 », reporté).
--
-- ORDRE D'EXÉCUTION : après profiles-rls-rollout.sql. Peut être exécuté à tout
-- moment, y compris en production : additif, idempotent, aucune réécriture de
-- ligne (ADD COLUMN nullable = pas de réécriture de table sur PostgreSQL récent).
-- ============================================================

BEGIN;

-- 1. Enseignants / directeurs / référents / superadmin.
--    Format E.164 attendu (ex. +237690000000) — normalisé côté application par
--    src/lib/phone.js. Stocké en TEXT : jamais d'arithmétique sur un numéro, et
--    le « + » et les zéros de tête doivent survivre.
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS phone         TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- 2. Parents. Même logique. À ne PAS confondre avec students.parent_phone, qui
--    est le numéro de notification RATTACHÉ À L'ENFANT (c'est lui que lit la
--    fonction Edge send-whatsapp). Un parent de deux enfants peut avoir un seul
--    compte ici et deux numéros de notification là-bas.
ALTER TABLE parents  ADD COLUMN IF NOT EXISTS phone         TEXT;
ALTER TABLE parents  ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- 3. Index de recherche : la console cherche par nom, par téléphone ou par
--    courriel. Volumes faibles au pilote, mais l'index coûte peu et évite un
--    balayage complet quand l'école grandit.
CREATE INDEX IF NOT EXISTS idx_teachers_phone ON teachers(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parents_phone  ON parents(phone)  WHERE phone IS NOT NULL;

COMMIT;

-- ============================================================
-- VÉRIFICATION — doit renvoyer 4
-- ============================================================
SELECT COUNT(*) AS colonnes_ajoutees
FROM information_schema.columns
WHERE (table_name = 'teachers' AND column_name IN ('phone', 'contact_email'))
   OR (table_name = 'parents'  AND column_name IN ('phone', 'contact_email'));

-- Rappel de l'état attendu des autres colonnes de contact (ne rien exécuter,
-- c'est une aide-mémoire) :
--   students.parent_email  → créé par phase1-student-data-migration.sql
--   students.parent_phone  → créé par whatsapp-setup.sql  (CONFIRMÉ PRÉSENT 2026-09-12)
