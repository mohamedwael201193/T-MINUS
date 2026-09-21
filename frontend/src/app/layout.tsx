import type { Metadata, Viewport } from "next";
import { Anton, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});

const jbmono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jbmono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "T-MINUS — Your token has a clock.",
  description:
    "Conditional conversion orders for tokenized pre-IPO lifecycles. Set the ratio you want, set the floor you'll accept, set the failsafe. T-MINUS watches the clock for you.",
  keywords: [
    "T-MINUS",
    "PreStocks",
    "lifecycle orders",
    "conditional conversion",
    "SPACEX",
    "Token-2022",
    "Solana",
  ],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "T-MINUS — Your token has a clock.",
    description:
      "Pre-IPO tokens don't just have a price — they have a deadline. Set your conversion rule once. T-MINUS watches the clock.",
    siteName: "T-MINUS",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#F1EDE2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${anton.variable} ${grotesk.variable} ${jbmono.variable} antialiased bg-bone text-ink font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
