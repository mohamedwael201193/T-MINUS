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
  title: "T-MINUS — When the issuer changes the asset, T-MINUS re-verifies.",
  description:
    "PreStocks Asset Lifecycle & Action Engine. Issuer event, chain, market, then a signature — or a halt. Real Mainnet SPACEX conversion verified.",
  keywords: [
    "T-MINUS",
    "PreStocks",
    "asset lifecycle",
    "corporate actions",
    "SPACEX",
    "Token-2022",
    "Solana",
  ],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "T-MINUS — When the issuer changes the asset, T-MINUS re-verifies.",
    description:
      "Lifecycle gate for PreStocks. Real Mainnet conversion. Signing halts when the issuer instruction changes.",
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
