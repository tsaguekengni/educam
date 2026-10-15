/** @type {import('next').NextConfig} */
const nextConfig = {
  // Identifiant de la version construite, figé dans le code (navigateur ET
  // serveur). Sur Vercel : le commit déployé. Sert à `/api/version` et à
  // `src/lib/version.js` pour savoir si une page ouverte tourne sur un code
  // périmé (actualisation automatique, 2026-10-15).
  env: {
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || "local",
  },
};

export default nextConfig;
