// EduCam — numéro de la version EN LIGNE (2026-10-15).
//
// Le navigateur compare ce numéro à celui de son propre code (`BUILD_ID`, figé
// au moment de la construction). S'ils diffèrent, une version plus récente a
// été déployée depuis l'ouverture de la page : on recharge.
//
// ⚠️ `force-dynamic` + `no-store` : une réponse mise en cache (Vercel, navigateur
// ou service worker) annoncerait éternellement l'ancienne version.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { v: process.env.NEXT_PUBLIC_BUILD_ID || "local" },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
