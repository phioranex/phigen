import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://phigen.app";
const OG_IMAGE = "https://placehold.co/1200x630/0f0f1a/6366f1?text=Phigen+—+AI+Changelog+Generator&font=montserrat";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),

  title: {
    default: "Phigen — AI Changelog Generator",
    template: "%s | Phigen",
  },
  description:
    "Generate beautiful, shareable changelogs from your GitHub commits using Claude AI — in seconds. Free for public repos.",
  keywords: [
    "changelog generator",
    "github changelog",
    "ai changelog",
    "commit history",
    "developer tools",
    "claude ai",
    "open source",
  ],
  authors: [{ name: "rvorine", url: "https://youtube.com/@rvorine" }],
  creator: "rvorine",

  // Favicon — place icon.png inside app/ folder (Next.js auto-detects)
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
    shortcut: "/icon.png",
  },

  // Open Graph — WhatsApp, Telegram, Slack, Discord previews
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: "Phigen",
    title: "Phigen — AI Changelog Generator",
    description:
      "Generate beautiful, shareable changelogs from your GitHub commits using Claude AI — in seconds.",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Phigen — AI Changelog Generator",
        type: "image/png",
      },
    ],
  },

  // Twitter / X card
  twitter: {
    card: "summary_large_image",
    title: "Phigen — AI Changelog Generator",
    description:
      "Generate beautiful, shareable changelogs from your GitHub commits using Claude AI — in seconds.",
    images: [OG_IMAGE],
    creator: "@rvorine",
  },

  // Indexing
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-950 text-gray-100">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
