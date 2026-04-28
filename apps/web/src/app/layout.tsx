import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const uiSans = Space_Grotesk({
  variable: "--font-ui",
  subsets: ["latin"],
});

const displaySerif = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const uiMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Casino Cheat Sheet",
  description:
    "A single educational site for exact casino odds, expected value, and practical poker equity analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${uiSans.variable} ${displaySerif.variable} ${uiMono.variable}`}
    >
      <body>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
