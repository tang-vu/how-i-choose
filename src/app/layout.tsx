import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://how-i-choose.vercel.app"),
  title: {
    default: "How I Choose",
    template: "%s · How I Choose",
  },
  description: "Communication practice that respects every signal.",
  applicationName: "How I Choose",
  authors: [{ name: "How I Choose contributors" }],
  openGraph: {
    title: "How I Choose",
    description: "My signals. My pace. How I choose.",
    type: "website",
    images: [{ url: "/og.svg", width: 1200, height: 630, alt: "How I Choose — communication practice that respects every signal" }],
  },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f1e8" },
    { media: "(prefers-color-scheme: dark)", color: "#111935" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
