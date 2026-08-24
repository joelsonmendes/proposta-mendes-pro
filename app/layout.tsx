import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://proposta-mendes-pro.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Proposta Mendes Pro",
  description: "Crie propostas comerciais profissionais, calcule valores, assine e salve em PDF pelo smartphone.",
  applicationName: "Proposta Mendes Pro",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Proposta Mendes",
  },
  formatDetection: {
    telephone: true,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Proposta Mendes Pro",
    description: "Propostas profissionais em minutos.",
    type: "website",
    url: siteUrl,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Proposta Mendes Pro - propostas profissionais em minutos",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Proposta Mendes Pro",
    description: "Propostas profissionais em minutos.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#edf2f5" },
    { media: "(prefers-color-scheme: dark)", color: "#071017" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
