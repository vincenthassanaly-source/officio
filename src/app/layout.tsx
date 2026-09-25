import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast-provider";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Officio",
  description: "Le compagnon numérique de l'officine",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Officio",
  },
};

export const viewport: Viewport = {
  // = --color-primary (oklch(52% 0.19 275)) converti en sRGB.
  themeColor: "#4E56D3",
  // Sur Chrome Android, le clavier virtuel redimensionne la page (au lieu de
  // se superposer par-dessus sans redimensionner le viewport visuel) : les
  // `dvh`/`max-h`/`overflow-y-auto` des sheets (voir commits précédents)
  // suivent alors la hauteur réellement disponible. iOS Safari ignore cette
  // option (pas de régression : comportement système inchangé) — à valider
  // sur un vrai téléphone Android, non émulable par Playwright.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
