import "./globals.css";

export const metadata = {
  title: "EduCam - Plateforme Éducative du Cameroun",
  description: "Contenu pédagogique standardisé pour l'enseignement primaire",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}