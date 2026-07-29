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
