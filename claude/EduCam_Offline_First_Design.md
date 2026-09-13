# EduCam — Mode hors ligne complet (conception)

> **Dernière mise à jour : 2026-09-12 UTC** · Conception du passage d'un hors-ligne « lecture des leçons téléchargées » à un hors-ligne **« la plateforme fonctionne »** pour l'enseignant et le référent.
>
> **État : CONÇU — rien n'est encore construit.** À valider par Maxime avant la première ligne de code.
>
> **Compagnons :** `EduCam_Dormant_Features_Register.md` (drapeaux) · `EduCam_Local_Test_Runbook.md` (test hors ligne) · `EduCam_Pilot_Build_Plan.md` (périmètre pilote).

---

## 1. La décision (2026-09-12, Maxime)

Aujourd'hui, « hors ligne » veut dire : *vous pouvez relire les leçons que vous avez téléchargées*. Désormais il doit vouloir dire : **la plateforme marche**.

Un enseignant ouvre l'application de bureau sans réseau et circule dans **tous les panneaux** — tableau de bord, emploi du temps, résultats, programme, messagerie — **sans blocage**. Les chiffres affichés peuvent dater ; c'est accepté, à condition que chaque panneau **dise de quand ils datent**. Et surtout : **le travail fait hors ligne n'est pas perdu**. L'enseignant saisit des résultats, marque une leçon enseignée ; tout est gardé sur la machine et **remonte tout seul** au retour du réseau.

**Pourquoi :** les enseignants sont les plus gros utilisateurs, et ils sont dans les classes où le réseau manque. La boucle quotidienne — leçon → QCM → saisie des résultats → tableaux de bord → parent — **meurt si la saisie dépend du réseau**.

**Qui est concerné :** enseignant **et référent**. Les parents, la direction et le superadmin restent en ligne (décision assumée : ils ont les moyens d'être connectés).

---

## 2. Ce qui existe aujourd'hui — vérifié dans le code, pas supposé

Lecture réelle de `src/lib/offline.js`, `public/sw.js`, `src/app/sw-register.js`, `src/app/results.js`, `src/app/dashboard.js`, `src/app/page.js` le 2026-09-12.

**Ce qui est bon et ne bouge pas :**
- **La *stratégie* du service worker (`public/sw.js`) est bonne** : document en réseau-d'abord (jamais de coquille périmée), ressources hachées en *stale-while-revalidate*, images de leçon en cache-d'abord. La stratégie ne change pas — mais il lui manquait une pièce, voir (d) ci-dessous.
- **Les paquets de leçons** (`fetchLessonBundle` / `saveLessonBundle`) fonctionnent : contenu + images en IndexedDB.
- **L'accès hors ligne de 7 jours** (`setGrant` / `getGrant`) fonctionne, et il couvre **déjà le référent** — le référent est une ligne de la table `teachers` (`role='referent'`), et `setGrant` est appelé pour toute ligne `teachers` trouvée. Rien à construire de ce côté, seulement à allonger la durée.

**Les trois manques, par ordre de gravité :**

**a) Rien ne retient une écriture faite hors ligne. C'est le cœur du travail.**
La couche hors ligne actuelle fait deux choses : elle met des lectures en cache, et elle retient la connexion 7 jours. **Toute écriture part directement vers Supabase et échoue s'il n'y a pas de réseau.** Le code le dit lui-même, dans `dashboard.js` (marquer une leçon enseignée) :

```js
pushToast(online
  ? "Impossible d'enregistrer. Réessayez dans un instant."
  : "Hors ligne : impossible d'enregistrer pour le moment.", "error");
```

C'est exactement l'obstacle à supprimer. Même chose côté résultats (`results.js`) : la note passe en `error` et l'enseignant lit « Note non enregistrée ».

**b) Les lectures hors ligne sont lentes, pas instantanées.**
`cachedQuery` essaie **toujours le réseau d'abord** et ne se rabat sur la copie locale que quand la requête **échoue**. Sans réseau, chaque panneau attend l'expiration du délai avant d'afficher quoi que ce soit. C'est ça, le « blocage » à supprimer.

**d) 🔴 LE DÉFAUT LE PLUS GRAVE — rien n'était mis en cache au premier lancement. (Trouvé et corrigé le 2026-09-13.)**

**Symptôme :** l'enseignant installe l'application, se connecte, coupe le réseau, ferme, rouvre → **« Impossible de se connecter »**, la page d'erreur du **navigateur**. L'application ne démarrait pas du tout.

**Cause :** le service worker **ne préchargeait rien à l'installation**. Il ne gardait les pages qu'au fil de la navigation. Or, au tout premier chargement, le navigateur va chercher le document **avant** que le worker ne soit installé et actif : rien ne passe par lui, donc **rien n'est mis en cache**. Se connecter ne provoque aucune navigation (tout est côté client), donc le cache reste vide. **Le hors-ligne ne fonctionnait qu'à partir du DEUXIÈME lancement** — jamais remarqué, parce qu'une machine de développement recharge sans arrêt.

**Vérifié sur le site en production, pas supposé (2026-09-13) :** état vierge → première visite → worker enregistré et actif, **0 cache**. Deuxième visite → coquille en cache, 10 entrées. Les deux moitiés de l'explication sont prouvées.

**Correctif :** préchargement à l'installation. Le worker va chercher la coquille **et** en extrait les fichiers `/_next/static/*` qu'elle référence — une coquille sans son JavaScript ne démarre pas non plus. La liste est lue dans le HTML, donc elle **se tient à jour toute seule** : aucune étape de construction, aucune liste de noms de fichiers à maintenir. Essai à blanc sur le site réel : coquille + **13 ressources sur 13**, 0 échec. `SHELL_CACHE` passe à `educam-v3` ; le cache d'images reste en `v2` **exprès** (les images coûtent cher à retélécharger, et IndexedDB les croirait encore présentes).

**e) 🟠 Le voyant « Hors ligne prêt » ment. (Trouvé le 2026-09-13, à corriger.)**

Le premier essai de Maxime sur le deuxième portable a échoué, le second a réussi — « ça n'avait pas encore fini de se poser ». **Ce n'est pas une erreur de manipulation, c'est un défaut de conception.**

Le préchargement de la coquille par le service worker prend quelques secondes. Pendant ce laps de temps, l'application **ne peut pas** démarrer hors ligne. Or le voyant en haut de l'écran affiche déjà « **Hors ligne prêt · 7 jours** » — et il se fonde **uniquement sur le nombre de leçons téléchargées** (`cachedIds.length > 0`, `dashboard.js` ~4411). Il **ignore complètement** si la coquille de l'application est en cache.

Autrement dit : **le voyant peut annoncer « prêt » alors que l'application est incapable de s'ouvrir sans réseau.** C'est le pire genre d'indicateur — il donne confiance exactement quand il ne faut pas. Un enseignant qui prépare sa journée, voit « prêt », part en classe et n'a plus de réseau se retrouve devant la page d'erreur du navigateur.

**Correctif :** « Hors ligne prêt » ne doit s'afficher que si **les deux** conditions sont vraies — leçons téléchargées **et** coquille en cache (vérifiable depuis la page : `caches.has('educam-v3-shell')` + présence de `/`). Tant que la coquille n'est pas prête : « Préparation en cours… », et le bouton de téléchargement ne se déclare pas terminé.

**c) Presque rien n'est réellement mis en cache.**
`cachedQuery` n'est utilisé qu'à **3 endroits** : emploi du temps, thèmes du programme, liste des leçons. Or `dashboard.js` compte à lui seul **37 lectures Supabase directes**, sans cache ni repli — auxquelles s'ajoutent `results.js`, `schooldashboard.js`, `activitylog.js`. **C'est le gros du chantier** : convertir ces lectures au modèle « cache d'abord ».

---

## 3. Les quatre décisions prises (2026-09-12)

| Question | Décision |
|---|---|
| Qui travaille hors ligne ? | **Enseignant + référent** |
| Quelles écritures doivent survivre ? | **Saisie des résultats**, **leçon enseignée**, **messages** |
| Réalité du réseau à l'école ? | **Coupures de plusieurs jours** — mais **partage de connexion quotidien** (voir ci-dessous) |
| Si la même donnée change des deux côtés ? | **La saisie de l'enseignant l'emporte** (révisé le 2026-09-13) |
| Durée de l'accès hors ligne ? | **7 jours — inchangé** (décision du 2026-09-13) |

*Les observations (direction/référent) restent en ligne — non retenues.*

### Le modèle d'exploitation réel (Maxime, 2026-09-13)

**En fin de journée, le référent connecte le poste de l'enseignant via le partage de connexion de son téléphone.** C'est le geste qui fait remonter la journée.

Cela change la lecture de tout le reste :

- **Les données montent chaque jour**, donc parents, direction et superadmin voient le travail du jour même. Le hors-ligne ne les prive de rien.
- **Les 7 jours ne sont pas le fonctionnement normal, c'est le filet de sécurité** — pour un cas extrême, et pour éviter que l'enseignant ait à se reconnecter chaque matin.
- **Et ces 7 jours se rechargent tout seuls.** `setGrant` est rappelé à chaque ouverture de l'application **en ligne** : chaque partage de connexion quotidien remet le compteur à 7 jours pleins. Le compte à rebours ne commence réellement qu'en cas de panne prolongée.

→ **Donc 7 jours suffisent largement. Pas de passage à 30 jours.** Le jeton de rafraîchissement Supabase reste valide sur cette durée, ce qui **supprime le risque n° 4** identifié dans la première version de cette conception : l'accès hors ligne ne promet plus rien que les écritures ne puissent tenir.

---

## 4. Le piège à ne pas rater : l'horodatage

**C'est le point le plus facile à manquer et le plus coûteux à réparer après coup.**

Dans la base, `daily_results.created_at`, `lessons_taught.taught_at`, `messages.created_at` et `activity_log.created_at` ont tous pour valeur par défaut `now()`. Si une écriture mise en attente lundi ne part que jeudi, **la base enregistrera jeudi**.

Conséquences concrètes :
- Une leçon enseignée lundi apparaît enseignée jeudi.
- Le journal d'activité montre une semaine de silence, puis tout d'un coup.
- **La détection anti-triche se trompe** : « marque enseigné sans ouvrir la leçon », « enseigne sans saisir de résultats » se déclenchent à tort, parce que l'ordre réel des gestes est perdu.
- Le directeur voit « dernière activité : jeudi » pour un enseignant qui a travaillé toute la semaine.

**Règle : chaque élément de la file porte l'heure réelle du geste (`clientTs`), et la synchronisation écrit cette date explicitement** au lieu de laisser la base mettre `now()`.

⚠️ Réserve à traiter à la construction : l'horloge d'un appareil hors ligne peut être fausse. On garde `created_at` = heure du geste **et** on ajoute `synced_at` = heure d'arrivée, pour pouvoir démêler après coup.

---

## 5. L'architecture proposée

### 5.1 Lectures : servir le cache d'abord

Inverser `cachedQuery`. Aujourd'hui : réseau → (échec) → cache. Demain : **cache tout de suite → rafraîchir derrière si en ligne**.

```
cachedQuery(key, fetcher) →  { data, cachedAt, fresh }
```

- S'il y a une copie locale : **elle s'affiche immédiatement**, avec sa date.
- Si en ligne : la requête part en arrière-plan et remplace les données quand elle revient.
- Si hors ligne : on garde la copie locale, sans attente ni erreur.

Chaque clé de cache stocke `{ data, cachedAt }` — c'est ce qui alimente les repères de fraîcheur (§5.8).

### 5.2 La file d'attente d'écritures (le nouveau morceau central)

Nouveau magasin `outbox` dans IndexedDB. **`educam-offline` passe de `DB_VERSION 1` à `2`** (`onupgradeneeded` crée `outbox` ; les magasins `lessons` et `kv` existants sont conservés).

Un élément de la file :

```js
{
  id,            // uuid généré sur l'appareil
  kind,          // 'result' | 'taught' | 'untaught' | 'message' | 'activity'
  table,         // 'daily_results' | 'lessons_taught' | 'messages' | 'activity_log'
  op,            // 'upsert' | 'delete' | 'insert'
  payload,       // la ligne à écrire
  onConflict,    // clé naturelle pour l'upsert
  clientTs,      // heure RÉELLE du geste (§4)
  actorId,
  status,        // 'pending' | 'syncing' | 'conflict' | 'failed'
  attempts,
  lastError,
}
```

**Les clés naturelles rendent la file sûre** — vérifié dans la base le 2026-09-12 :

| Table | Contrainte | Effet |
|---|---|---|
| `daily_results` | `UNIQUE (student_id, lesson_id, result_date)` | upsert **idempotent** — rejouable sans risque |
| `lessons_taught` | `UNIQUE (teacher_id, lesson_id)` | upsert **idempotent** |
| `messages` | `id uuid DEFAULT gen_random_uuid()` | **l'identifiant peut être généré sur l'appareil** |
| `activity_log` | `id uuid DEFAULT gen_random_uuid()` | idem |

Autrement dit : rejouer deux fois un élément de la file ne crée pas de doublon et ne casse rien. C'est la propriété qui rend tout le dispositif fiable.

**Le cas des messages était le plus délicat — il est résolu.** Le code actuel fait `insert(row).select("id").single()` puis passe cet identifiant à la notification WhatsApp. Hors ligne, pas de retour serveur. Mais comme `messages.id` est un `uuid` avec valeur par défaut, **on génère l'identifiant sur l'appareil** et on l'insère explicitement. La notification WhatsApp est simplement **différée à la synchronisation** (elle est de toute façon serveur).

⚠️ À dire à l'enseignant : un message composé hors ligne **part au retour du réseau**, pas avant. L'écran doit l'annoncer (« En attente d'envoi »), sinon il croira le parent déjà prévenu.

**Le journal d'activité entre aussi dans la file.** `logActivity` est aujourd'hui « tire et oublie » : hors ligne, l'événement disparaît en silence. Sans lui, un enseignant qui travaille une semaine hors ligne paraît **inactif**, et l'anti-triche s'affole. Il doit être mis en file comme le reste — en **dernière priorité** à la synchronisation, car c'est de la journalisation.

### 5.3 La synchronisation au retour du réseau

Déclencheurs : événement `online`, démarrage de l'application, **après toute connexion réussie**, et une reprise périodique en cas d'échec.

**L'ordre compte, et c'est le point technique le plus important après l'horodatage :**

1. **Rafraîchir la session Supabase d'abord.** Le jeton d'accès expire au bout d'environ une heure. Après une journée hors ligne il est **périmé**, et RLS **rejettera** toutes les écritures. Si le rafraîchissement échoue, **on s'arrête et on garde la file intacte** — on ne vide jamais une file avec un jeton mort.
2. Vider la file **du plus ancien au plus récent**, **une écriture à la fois** (jamais en parallèle : l'ordre des gestes doit être préservé).
3. Succès → l'élément est supprimé. Conflit → marqué `conflict` (§5.4). Erreur réseau → on s'arrête et on réessaie plus tard, avec un délai croissant.
4. Les éléments `activity` passent en dernier.
5. L'interface affiche l'état : « 12 éléments en attente » → « Synchronisation… » → « Tout est à jour ».

> ⚠️ **L'accès hors ligne de 30 jours et le jeton Supabase sont deux choses différentes.** Le premier laisse entrer dans l'application ; le second autorise les écritures. Si le jeton de rafraîchissement meurt, l'enseignant devra se reconnecter **une fois, en ligne** — la file **survit à cette reconnexion** et se vide juste après. C'est pour cela que « après toute connexion réussie » est un déclencheur.

### 5.4 Les conflits : la saisie de l'enseignant l'emporte

**Décision révisée (Maxime, 2026-09-13) : en cas de désaccord, c'est la saisie de l'utilisateur — l'enseignant — qui gagne.**

Le raisonnement, et il tient : Maxime n'écrit à la place de quelqu'un que dans des cas précis — quand c'est critique, quand l'enseignant ne peut pas le faire, quand son poste est indisponible, ou pour une démonstration. **Dans le cours normal des choses, la seule personne qui saisit est celle qui était dans la classe.** Un conflit est donc rare, et quand il survient, la bonne valeur est presque toujours celle de l'enseignant.

**Ce que cela supprime — et c'est beaucoup :**

- plus de lecture de la ligne serveur avant chaque écriture (une requête réseau **par note** en moins au moment de la synchronisation — ce qui compte précisément sur les connexions faibles qu'on vise) ;
- plus d'état `conflict` dans la file ;
- **plus de bandeau « À vérifier »** — tout un écran en moins à construire, et une corvée en moins pendant le pilote.

La file se contente donc de rejouer ses écritures. Les clés naturelles font le reste : l'upsert écrase, et comme il est idempotent, le rejouer ne casse rien.

**Le seul garde-fou conservé — il coûte cinq lignes.** Le risque résiduel est qu'une note en attente depuis plusieurs jours écrase **en silence** une correction que Maxime aurait faite exprès. On ne l'empêche pas (c'est la décision), mais **on en garde la trace** : quand une écriture de la file remplace une valeur différente, on inscrit l'ancienne valeur dans `activity_log` (`event_type = 'result_overwritten'`). Rien ne disparaît sans laisser de trace, et cela s'affiche déjà dans l'onglet **Journal** existant, sans écran supplémentaire à construire.

**`lessons_taught`, `messages`, `activity_log`** : aucun conflit possible de toute façon — état binaire idempotent pour le premier, insertions neuves à identifiant unique pour les deux autres.

### 5.5 L'accès hors ligne — et le démarrage instantané

**L'objectif, dit par Maxime (2026-09-13) : « ils ouvrent l'ordinateur, ouvrent l'application, et ils sont dedans. »** C'est le critère par lequel cette partie se juge.

#### Ce qui survit déjà à l'extinction du poste

Question posée : que se passe-t-il si l'enseignant ferme l'application ou éteint l'ordinateur ?

**Tout est conservé, et c'est acquis** — parce que rien de tout cela ne vit en mémoire :

| Donnée | Où elle est | Survit à… |
|---|---|---|
| L'accès hors ligne (`educam_offline_grant`) | `localStorage` — **un fichier sur le disque** | fermeture, extinction, coupure de courant |
| Les leçons téléchargées | IndexedDB — **sur le disque** | idem |
| La file d'écritures (à construire) | IndexedDB — **sur le disque** | idem |

L'accès hors ligne n'est pas une session qui « tourne » : c'est **une date inscrite dans un fichier** (« valable jusqu'au 20 septembre »), relue à chaque ouverture. Éteindre le poste ne l'entame pas. Un enseignant peut éteindre chaque soir pendant une semaine et rentrer directement chaque matin.

- **Enseignant et référent** : déjà couvert par le code existant (le référent est une ligne `teachers`) — à **vérifier au test**, pas à reconstruire.
- Avertir l'enseignant **à 5 jours restants** : « Reconnectez-vous une fois au réseau avant le [date] ». `grantDaysLeft` existe déjà dans `dashboard.js`.

#### ⚠️ Mais trois choses empêchent aujourd'hui « ouvrir et être dedans »

**a) L'application attend le réseau avant d'afficher quoi que ce soit. C'est le plus grave.**

Au démarrage (`page.js`), le code teste `navigator.onLine` et, si c'est vrai, **attend deux appels serveur** (`auth.getSession()` puis la lecture de `teachers`) avant de décider quoi afficher. Pendant ce temps, l'écran « démarrage » reste.

Or `navigator.onLine` ne dit pas « Internet fonctionne ». Il dit seulement **« une interface réseau est active »**. Un routeur d'école allumé dont le lien vers l'extérieur est mort répond `onLine: true`. **C'est le cas le plus fréquent au Cameroun — pas l'absence de Wi-Fi, mais un Wi-Fi qui ne mène nulle part.** L'application part alors dans la branche « en ligne » et **attend des requêtes qui ne répondent jamais** : elles ne échouent pas vite, elles pendent. L'enseignant reste sur l'écran de démarrage.

**Correctif — la règle à tenir : le réseau ne doit JAMAIS être sur le chemin de l'affichage.**

1. Au démarrage, lire l'accès hors ligne **localement** (c'est instantané, c'est un fichier) et **afficher le tableau de bord immédiatement**.
2. *Ensuite seulement*, vérifier la session en arrière-plan, sans rien bloquer.
3. Si cette vérification aboutit, on rafraîchit en silence et on recharge l'accès pour 7 jours.
4. Si elle échoue ou traîne, **rien ne se passe à l'écran** — l'enseignant travaille déjà.
5. Poser aussi un **délai de garde court** (2–3 s) sur tout appel réseau au démarrage, pour ne jamais dépendre du délai d'expiration du système.

Résultat visé : **dedans en moins d'une seconde, toujours, quel que soit l'état du réseau.**

**b) L'ordinateur a le droit de jeter les données.**

Nulle part l'application ne demande au navigateur de **conserver** son stockage. Chrome peut supprimer le stockage d'un site quand le disque se remplit. Aujourd'hui, cela coûterait les leçons téléchargées — ennuyeux. **Une fois qu'une file retiendra une journée de résultats non envoyés, cela coûterait une journée de travail d'un enseignant.**

Correctif : appeler **`navigator.storage.persist()`** au démarrage. Une ligne. Elle demande au système de traiter ces données comme durables. Une application installée sur le bureau l'obtient en général automatiquement — mais la demander explicitement, c'est la différence entre « en général » et « oui ».

**c) « Effacer les données de navigation » efface tout.**

Si quelqu'un nettoie la machine, l'accès hors ligne et les leçons disparaissent, et il faut **une** reconnexion en ligne. Rien à coder — **à écrire dans le manuel de l'enseignant** : ne jamais effacer les données du site.

#### ⚠️ Un défaut trouvé au passage : l'expéditeur des messages

Le composeur (`dashboard.js`) appelle `supabase.auth.getUser()` pour connaître l'expéditeur. Dans Supabase, **`getUser()` est un appel serveur**, pas une lecture locale. Hors ligne il ne renvoie rien, et le message serait enregistré **sans expéditeur**. Quand les messages passeront par la file, l'expéditeur devra venir de l'accès hors ligne (`grant.teacher.id`), jamais de `getUser()`.

### 5.6 La préparation hors ligne

Le bouton « Télécharger les leçons de la semaine » devient **« Préparer le travail hors ligne »** et descend tout le nécessaire :

- les leçons de la semaine (contenu + images) — *existe déjà*
- l'emploi du temps de la classe
- la liste des élèves de la classe
- les résultats des 30 derniers jours
- les messages récents
- les thèmes du programme et la liste des leçons
- les collègues de l'école (pour le composeur de messages)

Avec une barre de progression et un bilan honnête (« 24 leçons prêtes · 36 élèves · résultats jusqu'au 12 sept. »).

### 5.7 Les repères de fraîcheur

Chaque panneau qui affiche des données porte, en petit, la date de la copie locale :

> *Données au 11 sept. · 14 h 20*

Et quand on est hors ligne, un bandeau discret et permanent : **« Hors ligne — vos saisies sont gardées et partiront au retour du réseau. »** Le ton compte : rassurer, pas alerter.

---

## 6. Migration SQL requise

> **Révisé le 2026-09-13 — cette migration n'est plus bloquante.** Puisque la saisie de l'enseignant l'emporte (§5.4), on ne compare plus rien avant d'écrire : `updated_at` n'est plus nécessaire *pour les conflits*. Elle reste néanmoins **recommandée**, pour une autre raison : on écrit désormais `created_at` depuis l'appareil (§4), et **l'horloge d'un poste peut être fausse**. `synced_at` donne l'heure d'arrivée vue par le serveur — la seule fiable — et `updated_at` dit quand une note a été retouchée. Les deux serviront à démêler les anomalies du pilote. Migration additive, sans risque : à passer quand ça arrange, plus forcément avant le lot 1.

```sql
-- Conflits hors ligne : savoir quand une note a été modifiée pour la dernière fois.
alter table daily_results add column if not exists updated_at timestamptz default now();
alter table daily_results add column if not exists synced_at  timestamptz;

create or replace function educam_touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_daily_results_touch on daily_results;
create trigger trg_daily_results_touch
  before update on daily_results
  for each row execute function educam_touch_updated_at();
```

*Migration additive — sans risque, exécutable à tout moment.* À lancer par Maxime dans l'éditeur SQL Supabase (le bac à sable n'écrit pas dans la base).

⚠️ À vérifier en même temps : les politiques RLS de `daily_results`, `lessons_taught`, `messages` et `activity_log` doivent accepter une écriture portant un `created_at`/`taught_at` explicite et, pour les messages, un `id` fourni. RLS filtre les lignes, pas les colonnes — a priori rien à changer, **mais à confirmer par un test réel**.

---

## 7. Ce que ça change, fichier par fichier

| Fichier | Nature | Travail |
|---|---|---|
| `src/lib/offline.js` | **Réécriture large** | Inverser `cachedQuery` (cache d'abord + `cachedAt`) ; `DB_VERSION` 1→2 ; magasin `outbox` ; fonctions de file |
| `src/lib/sync.js` | **Nouveau** | Rafraîchir la session, vider la file en série, détecter les conflits, reprise avec délai croissant |
| `src/lib/activity.js` | Petit | Mettre en file au lieu de perdre |
| `src/lib/flags.js` | Aucun | `OFFLINE_UNLOCK_DAYS` **reste à 7** |
| `src/app/results.js` | Petit | `saveRow` passe par la file ; nouvel état `queued` (« en attente »). *Plus de bandeau « À vérifier » — supprimé le 2026-09-13.* |
| `src/app/dashboard.js` | **Le gros morceau** | `toggleTaught` et le composeur de messages passent par la file ; **~37 lectures** à convertir en cache-d'abord ; repères de fraîcheur ; indicateur de synchronisation ; téléchargement élargi |
| `src/app/page.js` | **Moyen — priorité haute** | **Démarrage instantané** (§5.5 a) : afficher depuis l'accès local, vérifier le réseau derrière, délai de garde ; `navigator.storage.persist()` ; vider la file après connexion réussie ; vérifier le référent |
| `src/app/schooldashboard.js` | Moyen | Lectures en cache-d'abord (pour le référent) |
| *SQL* | Petit | La migration du §6 |

> ⚠️ `dashboard.js` fait **281 Ko**. C'est le fichier le plus lourd du projet et le plus risqué à modifier. Les changements doivent y être faits **par petits lots vérifiables**, jamais en une passe.
>
> ⚠️ Rappel `AGENTS.md` : cette version de Next.js s'écarte des conventions habituelles — consulter `node_modules/next/dist/docs/` avant d'écrire du code applicatif.

---

## 8. Ordre de construction

Chaque lot est utile seul et testable seul. On ne passe au suivant qu'une fois le précédent vérifié sur une build de production.

0. **Le démarrage instantané + `storage.persist()`** (§5.5) — **à faire en premier**. Petit, peu risqué, isolé dans `page.js`, et c'est le geste que l'enseignant vit chaque matin. Protège aussi la future file contre l'effacement.
1. **La migration SQL** (§6) — indépendante, **et plus bloquante** : peut se faire à tout moment.
2. **La file + la synchronisation** (`offline.js`, `sync.js`) — sans toucher à l'interface. Testable en console.
3. **Résultats hors ligne** — le gain le plus important pour la boucle quotidienne. Saisir sans réseau, voir « en attente », reconnecter, vérifier l'arrivée.
4. **Leçon enseignée hors ligne** — petit, rapide, immédiatement visible.
5. **Horodatage + journal d'activité en file** (§4) — à faire **avant** que de vraies données arrivent, sinon le journal du pilote sera faussé.
6. **Lectures cache-d'abord + repères de fraîcheur** — le gros du travail, par panneau, en commençant par ceux qu'un enseignant ouvre le plus.
7. **Téléchargement élargi** (§5.6).
8. **Messages hors ligne** + bandeau « en attente d'envoi ».
9. ~~Bandeau « À vérifier »~~ — **supprimé** (§5.4). Remplacé par la trace `result_overwritten` dans le journal, faite au lot 2.
10. **Avertissement à 5 jours** sur l'accès hors ligne (la durée reste à 7 jours).
11. **Passage sur appareil réel** — le test qui n'a jamais été fait.

---

## 9. Risques et points ouverts

1. **Le volume de `dashboard.js`.** 37 lectures dans un fichier de 281 Ko. Risque de régression élevé — d'où les petits lots.
2. **Impossible à tester en `next dev`.** Le service worker ne s'enregistre qu'en build de production. Tout test hors ligne passe par `npm run build && npm run start` ou une préversion Vercel. *(Et couper le réseau de la machine coupe aussi le pont avec le poste de Maxime : les modifications en direct s'arrêtent pendant le test.)*
3. **Horloge de l'appareil.** Une date fausse fausse l'ordre des gestes et la détection de conflits. D'où `synced_at` en plus de `created_at`.
4. ~~Durée du jeton de rafraîchissement Supabase.~~ **Résolu le 2026-09-13** : en restant à 7 jours, avec un partage de connexion quotidien, le jeton reste valide. L'accès hors ligne ne promet plus davantage que ce que les écritures peuvent tenir.
5. **`navigator.onLine` ment.** Il signale une interface réseau active, pas un accès à Internet. Un Wi-Fi d'école sans lien sortant répond « en ligne ». **Ne jamais s'en servir pour décider d'attendre le réseau** — seulement comme indice, avec un délai de garde. C'est la cause la plus probable d'un écran de démarrage figé.
6. **Effacement du stockage par le système.** Sans `storage.persist()`, une journée de résultats en attente peut disparaître quand le disque se remplit. Corrigé au lot 0.
7. **Espace disque.** Leçons + images + élèves + résultats sur des machines modestes. À mesurer au test réel ; prévoir une purge des leçons anciennes si nécessaire.
8. **Messages différés.** Avec le partage de connexion quotidien, l'écart se réduit à quelques heures — mais l'enseignant doit quand même le savoir.
9. **Le consentement parental arrive en parallèle** (avant octobre) et touche aussi l'envoi WhatsApp. Les deux chantiers se croisent sur `send-whatsapp` — à coordonner.

---

## 10. Comment on teste — le modèle « deuxième portable »

> **Décision Maxime, 2026-09-13 : le hors-ligne se teste sur un SECOND portable, jamais sur la machine de développement.** Ce modèle a immédiatement prouvé sa valeur : il a révélé le défaut du §2 (d) que la machine de développement **ne pouvait structurellement pas voir**.

**Pourquoi le poste de développement ment.** Il a visité le site des dizaines de fois, rechargé, ouvert les outils de développement. Son cache est donc **déjà chaud** — il contient une coquille d'application qu'un enseignant, lui, n'aura jamais reçue. Tester le hors-ligne là-bas, c'est tester une machine qui a déjà tout. **Le deuxième portable est le seul qui reproduise le premier jour d'un enseignant.**

**Règles du banc d'essai :**

1. **Le deuxième portable est l'enseignant.** On ne développe jamais dessus, on ne l'utilise que comme une école l'utiliserait.
2. **On teste le site déployé** (`educam-eight.vercel.app`), pas un `npm run start` local — c'est ce que l'enseignant aura. Donc : **rien n'est testable tant que Maxime n'a pas commité et poussé**, et tant que Vercel n'a pas fini de construire.
3. **⚠️ Repartir d'un état vierge avant chaque essai sérieux.** Sinon on re-teste un cache chaud et on ne voit rien. Sur le deuxième portable : outils de développement → **Application → Service Workers → Unregister**, puis **Storage → Clear site data**, puis désinstaller l'application de bureau si elle est installée. **C'est l'étape qu'on oubliera, et c'est celle qui compte.**
4. **Couper le Wi-Fi pour de vrai**, pas seulement l'interrupteur des outils de développement — le deuxième portable n'a pas de pont avec Claude à préserver, donc autant reproduire la vraie coupure.
5. **Noter ce qu'on voit, mot pour mot.** « Impossible de se connecter » (page du navigateur) et « Connexion indisponible » (notre application) désignent **deux pannes totalement différentes** — l'une est le service worker, l'autre le code de démarrage. Le libellé exact est le diagnostic.

**Le déroulé, dans l'ordre :**

1. Sur le deuxième portable, **repartir de zéro** (règle 3).
2. Ouvrir le site déployé, **se connecter** comme enseignant, **installer l'application** sur le bureau.
3. **« Préparer le travail hors ligne »** → attendre la fin.
4. **Couper le Wi-Fi. Fermer l'application. La rouvrir.** ← *c'est le test que Maxime a fait le 2026-09-13, et qui échouait.*

**Le test du démarrage — celui qui compte le plus (§5.5) :**

- **Fermer complètement l'application, puis la rouvrir** → on doit arriver **directement** au tableau de bord, sans écran d'attente.
- **Redémarrer l'ordinateur**, rouvrir → même résultat. *(C'est la question posée par Maxime : la réponse doit être vérifiée, pas supposée.)*
- **Le cas piège — le Wi-Fi qui ne mène nulle part :** rester connecté au réseau mais couper l'accès Internet (DevTools → Network → Offline **tout en gardant le Wi-Fi actif**, ou débrancher le lien du routeur). L'application doit entrer **aussi vite** que sans réseau du tout. Si elle hésite, le lot 0 n'est pas terminé.
- Vérifier dans DevTools → Application → Storage que le stockage est marqué **persistant**.
4. **Circuler dans tous les panneaux** — aucun ne doit bloquer, chacun affiche sa date.
5. **Saisir des résultats** pour plusieurs élèves → statut « en attente ».
6. **Marquer une leçon enseignée** → doit réussir, pas d'erreur.
7. **Composer un message** → « en attente d'envoi ».
8. Recharger la page **toujours hors ligne** → la file survit, on revient au tableau de bord.
9. Repasser en ligne → la file se vide, le compteur descend, « Tout est à jour ».
10. **Vérifier dans Supabase** que les dates sont celles des gestes, **pas** celles de la synchronisation.
11. Provoquer un conflit : saisir une note hors ligne, la changer en ligne depuis un autre compte, reconnecter → **la note de l'enseignant doit l'emporter**, et l'ancienne valeur doit apparaître dans le **Journal** (`result_overwritten`).

---

## Journal

- **2026-09-13 (6)** — **Voyant de disponibilité corrigé + FILE D'ATTENTE CONSTRUITE.** (a) « Hors ligne prêt » exige désormais **les deux** moitiés — leçons téléchargées **et** coquille préchargée (`isShellCached()`) ; sinon « Préparation en cours… ». (b) `educam-offline` passe en **DB_VERSION 2** avec le magasin `outbox` (mise à niveau additive, `lessons` et `kv` intacts). (c) Nouveau `src/lib/sync.js` : **rafraîchit la session AVANT tout**, puis vide la file du plus ancien au plus récent, **une écriture à la fois**, avec plafond de 5 tentatives pour qu'un enregistrement fautif ne bloque pas la file. Si la session ne peut pas être rafraîchie, **on ne touche pas à la file** — vider avec un jeton mort perdrait le travail. (d) Passent par la file : **saisie des résultats** (`results.js`, nouvel état « ✓ Gardé · en attente de réseau »), **leçon enseignée** (`dashboard.js`, le refus « impossible d'enregistrer » a disparu), **journal d'activité** (`activity.js`). (e) **Horodatage explicite** (`taught_at`, `created_at`) partout — le piège du §4 est désarmé. (f) Déclencheurs : retour du réseau, chargement de l'app ; compteur « N saisies gardées » dans le bandeau, rafraîchi par un événement `educam:queued` puisque la saisie vit dans un autre composant que le bandeau. **Messages : pas encore** (lot suivant : identifiant uuid côté appareil + notification WhatsApp différée + expéditeur pris dans l'accès hors ligne et non via `auth.getUser()`, qui est un appel serveur).
- **2026-09-13 (5)** — ✅ **LOT 0 VALIDÉ SUR APPAREIL RÉEL.** Deuxième portable, Wi-Fi réellement coupé, application de bureau fermée puis rouverte : ouverture **directe** sur « Bonjour Mme », sans écran de connexion, **instantanée**, voyant « Hors ligne », bandeau « les leçons téléchargées restent disponibles », 15 leçons prêtes, accès 7 jours. **Le préchargement du service worker et le démarrage en deux temps fonctionnent.** C'est le premier test hors ligne réussi de bout en bout du projet. Deux constats dans la même capture : (1) le voyant « Hors ligne prêt » ment tant que la coquille n'est pas préchargée — voir §2 (e), c'est ce qui a fait échouer le premier essai ; (2) les tuiles **« Moyenne de classe »** et **« Élèves à suivre »** restent bloquées sur « chargement… » — `classStats` vient de deux lectures directes non mises en cache (`educam_class_averages` + `students`), et l'échec repositionne la valeur à vide, que la tuile rend comme « chargement… » **indéfiniment**. Démonstration visible du §2 (b)+(c) : ce n'est pas lent, c'est mort, et ça prétend travailler.
- **2026-09-13 (4)** — 🔴 **Cause racine trouvée : le service worker ne préchargeait rien.** Test de Maxime sur un **deuxième portable** : connexion, Wi-Fi coupé, application fermée puis rouverte → « Impossible de se connecter ». Le libellé a tout dit — c'est la page d'erreur du **navigateur**, pas un écran de l'application : elle ne démarrait pas du tout, donc le problème était **sous** le lot 0. Diagnostic mené sur le site en production, en deux mesures : première visite vierge → worker actif, **0 cache** ; deuxième visite → coquille en cache. Le hors-ligne n'a donc **jamais** fonctionné au premier lancement. Corrigé par un préchargement à l'installation (coquille + ses `/_next/static/*`, liste extraite du HTML donc auto-entretenue), validé à blanc sur le site réel : **13/13 ressources, 0 échec**. **Le modèle « deuxième portable » a payé dès le premier essai** — une machine de développement, au cache toujours chaud, ne pouvait structurellement pas voir ce défaut. §10 réécrit autour de ce banc d'essai.
- **2026-09-13 (3)** — **Lot 0 construit** (`src/lib/offline.js`, `src/app/page.js`). Démarrage en deux temps : lecture de l'accès hors ligne sur le disque et affichage immédiat, puis vérification réseau en arrière-plan. Ajout de `requestPersistentStorage()`. **Deux délais de garde, pas un seul** — la nuance importe : quand l'accès hors ligne a déjà ouvert le tableau de bord, on abandonne vite (2,5 s) car rien n'attend à l'écran ; quand il n'y a **pas** d'accès (parent, ou accès expiré), abandonner revient à **afficher un écran de connexion à quelqu'un qui est peut-être déjà connecté** — on patiente donc beaucoup plus (8 s). Un délai unique et court aurait déconnecté les utilisateurs sur connexion lente : régression évitée de justesse. Vérifié : syntaxe des deux fichiers, correspondance imports/exports, et **aucun `await` avant le premier affichage**. Reste à vérifier par Maxime sur build de production.
- **2026-09-13 (2)** — **Conflits : la saisie de l'enseignant l'emporte** (Maxime révise sa décision de la veille). Motif : il ne saisit à la place de quelqu'un que si c'est critique, si l'enseignant ne peut pas, si le poste est indisponible, ou pour une démonstration — donc dans le cours normal, la seule personne qui saisit est celle qui était en classe. Supprime le bandeau « À vérifier », l'état `conflict`, et **une requête réseau par note** au moment de la synchronisation. Garde-fou conservé : l'ancienne valeur écrasée est inscrite au journal (`result_overwritten`). La migration SQL passe de bloquante à recommandée.
- **2026-09-13** — **Accès hors ligne maintenu à 7 jours** (pas 30) : le référent partage la connexion de son téléphone en fin de journée, donc les données montent chaque jour et les 7 jours se rechargent tout seuls à chaque ouverture en ligne. Le risque « jeton Supabase » tombe. **Nouveau lot 0, prioritaire : le démarrage instantané** — aujourd'hui l'application attend le réseau avant d'afficher, et `navigator.onLine` répond « en ligne » sur un Wi-Fi sans accès Internet, ce qui fige l'écran de démarrage. Ajout de `storage.persist()` pour que le système n'efface jamais une journée de résultats en attente. Défaut trouvé : le composeur de messages prend l'expéditeur via `auth.getUser()`, un appel **serveur** — hors ligne le message partirait sans expéditeur.
- **2026-09-12** — Conception rédigée après lecture du code réel et vérification du schéma en base. Quatre décisions de Maxime prises (périmètre enseignant+référent ; résultats/enseignée/messages ; coupures de plusieurs jours ; ne jamais écraser). Trois trouvailles déterminantes : **aucune file d'écriture n'existe**, **seules 3 lectures sur ~40 sont en cache**, et **les dates par défaut fausseraient tout le journal d'activité**. `messages.id` étant un uuid, le cas des messages est réglé sans contorsion.
