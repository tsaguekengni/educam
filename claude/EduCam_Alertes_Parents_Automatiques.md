# EduCam — Alertes parents automatiques

> **Dernière mise à jour : 2026-09-14 UTC** · Quand un élève obtient une note « à renforcer » ou « non acquis », son parent reçoit **tout seul** un message avec le lien direct vers la leçon à revoir. Aucune action de l'enseignante.
>
> **État : CONSTRUIT ET DÉPLOYÉ.** Il reste **une seule étape manuelle** : programmer l'exécution du soir (§5), qui exige la clé `service_role` que seul Maxime possède.
>
> **Compagnons :** `EduCam_WhatsApp_Setup.md` · `EduCam_Dormant_Features_Register.md` (portail de consentement) · `EduCam_Offline_First_Design.md` (la file d'attente qui rend la saisie hors ligne possible).

---

## 1. Le problème

Saisir les notes de 36 élèves, **puis** écrire un message à chaque parent d'élève en difficulté : personne ne le fera. Le besoin est réel (Maxime, 2026-09-14) — sans automatisation, la boucle « leçon → résultats → parent » s'arrête au troisième maillon.

## 2. Ce qui déclenche une alerte

La colonne `daily_results.difficulty`, **déjà calculée** : `score / total < 0.5`. C'est exactement la réunion des deux bandes voulues :

| Bouton de saisie rapide | Note sur 5 | `difficulty` |
|---|---|---|
| Acquis | 5/5 | non |
| **À renforcer** | **2/5 (40 %)** | **oui** |
| **Non acquis** | **0/5** | **oui** |

⚠️ `ceil(t/2) - 1` est délibéré : un simple `t/2` donnerait 5/10 = 50 %, qui **ne déclenche pas** le signalement. Vérifié sur données réelles (2026-09-13) : 2/5 signalé, 3/5 non.

## 3. ⚠️ Pourquoi le soir, et pas à la saisie

**C'est la décision de conception la plus importante de cette fonctionnalité.**

L'écran Résultats enregistre **chaque ligne à la frappe**. Une enseignante qui tape `1`, voit son erreur et corrige en `4` aurait **déjà** annoncé au parent que son enfant est en difficulté — et cela ne se reprend pas. Un envoi au moment de la saisie est donc exclu. Le traitement du soir laisse la journée se stabiliser.

## 4. ⚠️ Pourquoi une fenêtre de plusieurs jours, et pas « aujourd'hui »

Les enseignantes travaillent **hors ligne**. Des notes saisies lundi dans une classe sans réseau arrivent jeudi sur le serveur, **toujours datées de lundi**. Un traitement qui ne regarderait que « aujourd'hui » n'alerterait **jamais** ces parents — ce qui annulerait en silence tout le travail de la file hors ligne.

Chaque exécution balaie donc **les 7 derniers jours**. Repasser sur des journées déjà traitées ne coûte qu'une requête et ne crée rien, grâce à §6.

## 5. Les trois pièces

| Pièce | Où | État |
|---|---|---|
| Table `result_alerts` | base (migration `parent_alerts_idempotency`) | ✅ appliquée |
| Fonction `daily-parent-alerts` | Supabase Edge Functions | ✅ déployée (v3) |
| Programmation 18 h Douala | `pg_cron`, tâche `educam-daily-parent-alerts` | ✅ **active** |

`pg_cron` et `pg_net` ont été activés par la migration.

### ⚠️ Deux pièges d'authentification — déjà payés, à ne pas repayer

**1. `verify_jwt` doit rester à `false` sur cette fonction.** Elle est appelée par `pg_cron`, qui ne détient aucune session utilisateur. Pire : la vérification de la plateforme **rejette d'emblée une clé moderne `sb_secret_…`**, parce que ce n'est pas un JWT (`UNAUTHORIZED_INVALID_JWT_FORMAT`). C'était de toute façon le mauvais contrôle : **le jeton de n'importe quelle enseignante connectée l'aurait satisfait.** L'authentification se fait donc dans la fonction, contre la clé de service elle-même — plus strict.

**2. Ce projet utilise les clés MODERNES.** La clé attendue commence par **`sb_secret_`** (Settings → API Keys → Secret keys) — **pas** l'ancienne clé `service_role` en JWT (`eyJ…`), qui existe toujours dans le projet et que l'on copie par réflexe. Les deux formats cohabitent, d'où la confusion.

En cas de refus, la fonction renvoie un `hint` avec les **trois premiers caractères** de la clé attendue et de celle reçue — assez pour diagnostiquer, rien pour fuiter. C'est ce qui a permis de trouver, en un essai, qu'on envoyait la mauvaise clé **et** qu'une accolade `{` traînait dans le copier-coller.

**L'étape restante** — à coller dans l'éditeur SQL Supabase, en remplaçant la clé :

```sql
select cron.schedule(
  'educam-daily-parent-alerts',
  '0 17 * * *',                    -- 17 h UTC = 18 h Douala (WAT, sans heure d'été)
  $$
  select net.http_post(
    url     := 'https://brrutnxaizdllthgcnqm.supabase.co/functions/v1/daily-parent-alerts',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer COLLER_ICI_LA_CLE_SERVICE_ROLE'
    ),
    body    := '{}'::jsonb
  );
  $$
);
```

> 🔑 La clé `service_role` se trouve dans Supabase → **Settings → API**. Elle ne peut pas être lue par un chat : c'est voulu, et c'est pour cela que cette étape reste manuelle.

## 6. Le garde-fou : jamais deux fois le même message

`result_alerts` porte `UNIQUE (student_id, lesson_id, result_date)`. C'est **tout le dispositif de sécurité** : l'exécution peut être relancée, réessayée après une panne, ou déclenchée à la main pendant un test — un parent ne peut pas être prévenu deux fois de la même chose.

La ligne n'est écrite **qu'après** la création du message : une coupure entre les deux fait **réessayer** l'alerte plutôt que la perdre en silence.

## 7. Volume — un choix assumé

- **Boîte de réception : un message par leçon à revoir.** Chacun porte son propre lien, donc chacun est actionnable.
- **WhatsApp : au maximum UNE relance par enfant et par jour**, qui dit seulement qu'il y a du nouveau ; le détail reste dans l'application.

Pourquoi ce plafond : une classe qui a mal réussi une leçon produirait sinon une rafale de notifications. C'est ce qui épuise la patience d'un parent — et ce qui fait chuter la note de qualité du numéro chez Meta (blocages, limitation d'envoi).

## 8. Le lien vers la leçon — déjà en place

`dashboard.js` : `lessonLink = (m) => m.link_url && /^\d+$/.test(m.link_url)`. Si `link_url` est un **numéro de leçon**, la boîte de réception affiche un bouton **« Ouvrir la leçon »** qui l'ouvre dans l'application. Aucun lien profond à inventer : il suffit d'y écrire l'identifiant de la leçon, ce que fait la fonction.

## 9. Le ton

« Une leçon à revoir », **jamais** « votre enfant a échoué ». Le message nomme l'enfant par son prénom, propose de reprendre la leçon ensemble, et ajoute le `parent_tip` de la leçon quand il existe. Cohérent avec le reste de la plateforme, qui montre au parent une **tranche** adoucie et jamais un rang chiffré.

## 10. 🔴 Consentement — le point à ne pas perdre de vue

Le **portail de consentement parental n'est pas construit**, et le registre des fonctionnalités le désigne comme « la porte d'entrée de toute donnée réelle », à livrer **avant octobre**.

Envoyer des messages automatiques rend ce point **plus** sensible, pas moins : un parent recevrait des notifications non sollicitées au sujet des difficultés scolaires de son enfant.

**Décision de Maxime (2026-09-14) : activer les deux canaux tout de suite.** Recevable **aujourd'hui** — il n'y a aucun élève réel, seulement des données de test. Ce ne le sera plus au moment de l'inscription de la vraie classe.

**Le code est déjà prêt pour cela** : la fonction interroge `parent_consents`. Si la table existe, un opt-in devient **obligatoire** ; tant qu'elle n'existe pas, l'envoi passe. Activer le consentement sera donc un changement de **données**, pas de code.

⚠️ **Chiffre à connaître (2026-09-14) : 2 élèves sur 246 ont un numéro de parent enregistré.** Le canal WhatsApp est donc quasi inerte tant que le portail n'aura pas collecté les numéros — raison de plus pour qu'il précède le pilote.

## 11. Essayer sans attendre 18 h

À blanc (ne crée rien, compte seulement) :

```sql
select net.http_post(
  url     := 'https://brrutnxaizdllthgcnqm.supabase.co/functions/v1/daily-parent-alerts',
  headers := jsonb_build_object('Content-Type','application/json',
                                'Authorization','Bearer COLLER_ICI_LA_CLE_SERVICE_ROLE'),
  body    := '{"dry_run": true, "days": 30}'::jsonb
);
```

Pour de vrai, retirer `dry_run`. Puis vérifier :

```sql
select * from result_alerts order by created_at desc limit 10;
select subject, link_url, created_at from messages where sender_id is null order by created_at desc limit 10;
select status, error, created_at from whatsapp_notifications order by created_at desc limit 10;
```

*(`sender_id is null` identifie les messages écrits par la plateforme et non par une personne.)*

## 13. Deux canaux, deux modèles — les messages écrits par une personne

**Demande de Maxime (2026-09-16) :** un message envoyé depuis le compte admin, à un parent **ou** à un utilisateur de la plateforme, doit **signaler directement** son destinataire et **ne pas se confondre** avec les notifications de leçons.

**Ce qu'on a découvert en regardant le code :** c'était pire que « mélangé ».

1. **Le personnel ne recevait rien du tout.** Le composeur ne déclenchait une notification que pour `audience === "parent"`. Un message de la direction à une enseignante ou à un référent n'envoyait **aucune** notification, et `send-whatsapp` n'accepte qu'un identifiant d'**élève** — il n'avait aucun moyen d'adresser un membre du personnel.
2. **Tout passait par le modèle centré sur l'enfant.** `educam_parent_alert` dit « Suivi Scolaire de {{1}} » et parle d'un enfant : envoyé à une enseignante, c'est absurde.

**⚠️ La limite, elle, vient de Meta, pas du code.** Un message à l'initiative de l'entreprise **doit** utiliser un modèle pré-approuvé ; le texte libre n'est possible que dans la fenêtre de 24 h ouverte par le destinataire qui écrit le premier. L'extrait voyage donc comme **paramètre** du modèle ; le texte complet reste dans l'application.

**La solution — une fonction et un modèle séparés :**

| | Alertes automatiques | Messages écrits par une personne |
|---|---|---|
| Fonction | `send-whatsapp` *(inchangée)* | **`send-direct-message`** ✅ déployée |
| Modèle | `educam_parent_alert` | **`educam_direct_message`** ⏳ à faire approuver |
| Destinataires | parent d'un élève | parent **ou collègue** |
| Contenu | la leçon à revoir | **nomme l'expéditeur** + court extrait |

`send-whatsapp` n'a **pas** été modifiée : elle fonctionne et elle est éprouvée. Séparer les deux fonctions sert de toute façon exactement la séparation demandée.

**Portée élargie, à assumer :** la règle retenue est « **écrit par une personne** » et non « écrit par l'admin ». Une enseignante qui écrit à la main à un parent déclenchait elle aussi le modèle de leçon, ce qui était tout aussi faux. Le modèle nommant l'expéditeur, la règle se généralise naturellement.

**Le modèle à créer dans Meta** — nom exact `educam_direct_message`, texte arrêté par Maxime (2026-09-16) :

```
Bonjour
{{1}} vous a écrit : « {{2}} ».
Ouvrez EduCam {{3}}
Pour lire le message complet et répondre.
Merci
```

- **{{1}}** = nom de l'expéditeur · **{{2}}** = extrait (objet du message) · **{{3}}** = lien vers la plateforme
- **Catégorie : Utility** — surtout pas Marketing (mélanger les catégories sur un même numéro fait chuter la note de qualité).
- **Langue : français (Canada), la MÊME entrée que `educam_parent_alert`.**
- **En-tête : aucun. Boutons : aucun.**

⚠️ **Exactement TROIS paramètres de corps, aucun d'en-tête.** Le compte doit correspondre au code déployé (`send-direct-message` v2), sinon Meta répond `#132000`.

⚠️ **Ne pas choisir la langue « au nom » dans la liste de Meta — reprendre celle du modèle qui fonctionne.** Les trois fonctions lisent la même variable `WHATSAPP_TEMPLATE_LANG` ; toute divergence redonne `#132001 Template name does not exist in the translation`, l'erreur déjà rencontrée le 2026-09-13.

Le lien est fourni par le secret `APP_URL` (repli : `https://educam-eight.vercel.app`) — le même que celui utilisé par les alertes automatiques.

## 12. Points ouverts

1. ~~Programmer le cron~~ — **fait et vérifié** (§5).
2. **Portail de consentement** avant octobre (§10), qui collectera aussi les **numéros de téléphone** manquants — **le vrai verrou** : sans numéros, le canal WhatsApp reste inerte (2 élèves sur 246).
3. **Jours d'exécution** : actuellement **tous les jours**. Un samedi sans résultats ne fait rien, mais rattrape une saisie tardive du vendredi — c'est voulu.
4. **Élève sans compte parent** : le message est créé quand même et attend l'inscription du parent (`recipient_id` nul, comportement déjà géré par l'application).

## Journal

- **2026-09-16 (2)** — **Texte du modèle arrêté par Maxime** : trois variables, la troisième étant le **lien vers la plateforme**. `send-direct-message` redéployée en **v2** — trois paramètres de corps et lecture du secret `APP_URL`. Le compte de paramètres est la chose à ne pas rater : deux au lieu de trois donnerait `#132000`.
- **2026-09-16** — **Séparation des deux canaux (§13).** Nouvelle fonction **`send-direct-message`** déployée + `notifyDirectMessage()` côté client ; le composeur l'appelle désormais pour **toute** audience. Deux trouvailles en lisant le code : le **personnel ne recevait aucune notification** (le composeur ne déclenchait que pour les parents, et `send-whatsapp` n'accepte qu'un identifiant d'élève), et **tout** utilisait le modèle centré sur l'enfant — absurde pour un message à une enseignante. `send-whatsapp` laissée **intacte** : elle marche, elle est éprouvée, et la séparation des fonctions sert la séparation demandée. Reste : faire approuver `educam_direct_message` chez Meta (spécification en §13). ⚠️ Rappel : **0 membre du personnel sur 22 et 0 compte parent sur 16 ont un téléphone enregistré** — le canal restera inerte tant que les numéros ne seront pas collectés.
- **2026-09-14 (2)** — ✅ **VÉRIFIÉ DE BOUT EN BOUT EN PRODUCTION.** Exécution réelle : `{"ok":true, considered:1, created:1, pushed:0, skipped:1}`. Une alerte créée pour **Alice EBALE** (2/5, « Les classes d'aliments », 2026-09-13), message **« Leçon à revoir : Les classes d'aliments »** avec `link_url = "3"` — numérique, donc la boîte de réception affiche bien le bouton **« Ouvrir la leçon »**. WhatsApp **correctement ignoré** et **journalisé** (`skipped / no_parent_phone`) plutôt que perdu en silence. Chemin parcouru avant d'y arriver : 403 diagnostique → essai à blanc 200 → exécution réelle 200. Deux pièges d'authentification rencontrés et documentés en §5.
- **2026-09-14** — Conçu, construit et déployé. Table `result_alerts` + fonction `daily-parent-alerts` (v2). Deux décisions structurantes : **traitement du soir** (une note se corrige ; un message parti ne se reprend pas) et **fenêtre de 7 jours** (les notes hors ligne arrivent en retard, toujours datées du bon jour — un traitement « aujourd'hui seulement » les aurait ignorées). Reste : la programmation `pg_cron`, qui exige la clé `service_role`.
