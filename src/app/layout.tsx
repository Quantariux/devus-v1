import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "devus.space",
  description: "Premium developer workspace - devus.space",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/logo-32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/logo-192.png?v=2", sizes: "192x192", type: "image/png" },
      { url: "/logo-512.png?v=2", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/logo-180.png?v=2", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preload" href="/logo.png" as="image" type="image/png" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
