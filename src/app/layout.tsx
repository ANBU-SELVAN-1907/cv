import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "YOLO Smart Verification | Production Student Identity",
  description: "Advanced Student Verification for YOLO Events with Face Biometrics and Edge Sync.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "YOLO Verify",
  },
  icons: {
    apple: "/icons/icon-192.png",
  }
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import dynamic from 'next/dynamic';

const ModelInitializer = dynamic(
  () => import("@/components/ModelInitializer").then((mod) => mod.ModelInitializer),
  { ssr: false }
);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#050505]`}
      >
        <ModelInitializer />
        {children}
      </body>
    </html>
  );
}
