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

// How many days a login stays valid offline before an online re-login is required.
export const OFFLINE_UNLOCK_DAYS = 7;
