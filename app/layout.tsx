import type { Metadata, Viewport } from "next";
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

const siteName = "FitPass";
const siteUrl = "https://fitnesspass.vercel.app";
const siteDescription =
  "FitPass helps you discover and book fitness classes—view schedules, reserve spots, and manage bookings in one place.";

// Optional: put a real image at /public/og.png (1200x630)
const ogImage = `${siteUrl}/og.png`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  // Title strategy: template for all pages
  title: {
    default: `${siteName} | Fitness Class Booking Platform`,
    template: `%s | ${siteName}`,
  },

  description: siteDescription,

  applicationName: siteName,
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  category: "fitness",

  // Helps Google understand your preferred URL
  alternates: {
    canonical: "/",
  },

  // Keywords are not a major ranking factor, but harmless (keep short + relevant)
  keywords: [
    "fitness class booking",
    "book fitness classes",
    "gym classes",
    "yoga booking",
    "HIIT classes",
    "pilates booking",
    "fitness schedule",
    "workout classes",
  ],

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // If you have lots of thin pages, consider tightening these later
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  // Social previews
  openGraph: {
    type: "website",
    url: siteUrl,
    title: `${siteName} | Fitness Class Booking Platform`,
    description: siteDescription,
    siteName,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: `${siteName} preview`,
      },
    ],
    locale: "en_US",
  },

  twitter: {
    card: "summary_large_image",
    title: `${siteName} | Fitness Class Booking Platform`,
    description: siteDescription,
    images: [ogImage],
  },

  // Icons (add these files in /public)
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
  },

  // If you have a PWA manifest
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B1220", // match your brand
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
