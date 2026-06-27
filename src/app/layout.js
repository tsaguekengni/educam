import "./globals.css";

export const metadata = {
  title: "EduCam - Plateforme Éducative du Cameroun",
  description: "Contenu pédagogique standardisé pour l'enseignement primaire",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}