import type { Metadata } from "next";
import { Bebas_Neue, Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  variable: "--font-bebas-neue",
  subsets: ["latin"],
  display: "swap",
});

const barlow = Barlow({
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-barlow",
  subsets: ["latin"],
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  weight: ["500", "600", "700"],
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AeroHawk Cleaning Services | Clean. Reliable. Professional.",
  description:
    "Premium commercial and residential cleaning solutions across Australia. We bring precision, care, and professionalism to every space we touch.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bebasNeue.variable} ${barlow.variable} ${barlowCondensed.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
