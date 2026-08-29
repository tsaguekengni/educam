// EduCam feature flags — all OFF by default so new capabilities ship dormant.
// Flip these in Vercel (Environment Variables) at rollout; no code change needed.
//
//   NEXT_PUBLIC_OFFLINE_ENABLED=true      → PWA install, service worker,
//                                            week caching, 7-day offline unlock
//   NEXT_PUBLIC_DEVICE_AUTH_ENABLED=true  → authorized-device lock
//
// While unset/false, the app behaves exactly as before (online-only, no device lock).

export const OFFLINE_ENABLED =
  process.env.NEXT_PUBLIC_OFFLINE_ENABLED === "true";

export const DEVICE_AUTH_ENABLED =
  process.env.NEXT_PUBLIC_DEVICE_AUTH_ENABLED === "true";

// WhatsApp parent notifications — business-initiated template messages via the
// Meta WhatsApp Cloud API, sent from the `send-whatsapp` Supabase Edge Function.
// OFF until the provider is configured and the message template approved.
// Order: deploy the function + secrets, get the template approved, run
// whatsapp-setup.sql, THEN set this flag. See EduCam_WhatsApp_Setup.md.
export const WHATSAPP_ENABLED =
  process.env.NEXT_PUBLIC_WHATSAPP_ENABLED === "true";

// Profiles & multi-tenancy (schools, teacher→school, parents, per-class timetable).
export const PROFILES_ENABLED =
  process.env.NEXT_PUBLIC_PROFILES_ENABLED === "true";

// Position de l'enfant montrée au PARENT, sous forme de TRANCHE ("premier tiers
// de la classe", "a besoin de soutien") — JAMAIS un rang chiffré « 12e / 34 ».
// Décision produit du 2026-08-11 (Maxime) : afficher une tranche adoucie, pas un
// classement nominatif.
//
// OFF par défaut, volontairement. La tranche exige une distribution de classe :
// or un parent ne peut pas — et ne DOIT pas — lire les résultats des camarades
// sous RLS. L'interface est écrite et prête ; elle ne s'affiche que lorsque ce
// flag est activé ET qu'une distribution de classe agrégée est fournie (une vue
// ou une RPC Supabase renvoyant, par élève, sa position sans exposer les autres,
// sur le modèle de `schooldashboard-aggregates.sql`). Côté enseignant, qui voit
// légitimement toute sa classe, la tranche s'affiche déjà sans ce flag.
export const RANK_TRANCHE_ENABLED =
  process.env.NEXT_PUBLIC_RANK_TRANCHE_ENABLED === "true";

// « Conseil d'accompagnement » montré au PARENT sur une leçon à revoir : une
// manipulation concrète à faire à la maison, rédigée pour un parent peu
// scolarisé. Décision du 2026-08-13 (revue externe, lot F6).
//
// OFF par défaut parce qu'il dépend d'une COLONNE qui n'existe pas encore :
// `lessons.parent_tip`. Tant que ce drapeau est à false, le code ne lit ni
// n'écrit cette colonne — la sélectionner alors qu'elle est absente ferait
// échouer TOUTE la requête de leçon, pas seulement ce champ.
// Ordre à respecter : exécuter `claude-parent-tip.sql` dans Supabase, PUIS
// passer ce drapeau à true.
export const PARENT_TIP_ENABLED =
  process.env.NEXT_PUBLIC_PARENT_TIP_ENABLED === "true";

// How many days a login stays valid offline before an online re-login is required.
export const OFFLINE_UNLOCK_DAYS = 7;
