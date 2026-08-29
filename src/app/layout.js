// Inter est AUTO-HÉBERGÉE depuis npm (@fontsource-variable/inter) plutôt que
// chargée depuis Google Fonts. Deux raisons :
//   · aucune requête réseau au chargement de la page — donc aucun coût en
//     données pour l'utilisateur, ce qui compte sur une connexion payante ;
//   · aucune dépendance réseau au moment du build, donc le projet compile
//     partout, y compris derrière un pare-feu d'entreprise.
// C'est une police variable : un seul fichier couvre toutes les graisses.
//
// L'ancienne pile `Segoe UI` était une police Windows : sur Android elle
// retombait silencieusement sur Roboto, et le design n'était donc pas le même
// en conception et en usage réel.
import "@fontsource-variable/inter";
import "./globals.css";
import ServiceWorkerRegister from "./sw-register";

export const metadata = {
  title: "EduCam - Plateforme Éducative du Cameroun",
  description: "Contenu pédagogique standardisé pour l'enseignement primaire",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    title: "EduCam",
    statusBarStyle: "default",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover", // permet aux zones sûres Android/iOS de fonctionner
  themeColor: "#0F4C35",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
