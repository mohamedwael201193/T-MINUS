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
    "Corporate action layer for PreStocks. Issuer instruction, on-chain mint, fee-aware Jupiter route, safety gate, then your signature — or a refusal.",
  keywords: [
    "T-MINUS",
    "PreStocks",
    "corporate actions",
    "conversion desk",
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
      "PreStocks tokens carry issuer events and deadlines. T-MINUS reads the corporate action, then asks you to sign a real trade — or refuses.",
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
