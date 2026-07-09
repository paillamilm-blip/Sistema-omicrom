import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Omicron · Dashboard",
    template: "%s · Omicron",
  },
  description:
    "Omicron — Plataforma de crecimiento profesional. Sube de nodo, gana experiencia y desbloquea oportunidades.",
};

export const viewport: Viewport = {
  themeColor: "#0a0f1e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>{children}</body>
    </html>
  );
}
