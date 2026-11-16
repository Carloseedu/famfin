import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FamFin — Gestão Financeira Familiar",
  description: "Sistema completo de controle financeiro familiar: receitas, despesas, cartões, metas e relatórios.",
  keywords: ["finanças", "família", "orçamento", "despesas", "receitas", "cartões"],
  authors: [{ name: "FamFin" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "FamFin",
    statusBarStyle: "black-translucent",
    startupImage: [
      { url: "/icon-256.png" },
    ],
  },
  openGraph: {
    title: "FamFin — Gestão Financeira Familiar",
    description: "Controle financeiro familiar completo, seguro e compartilhado.",
    type: "website",
    images: [{ url: "/icon-512.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "FamFin",
    description: "Gestão financeira familiar",
    images: [{ url: "/icon-512.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SonnerToaster richColors position="top-right" />
      </body>
    </html>
  );
}
