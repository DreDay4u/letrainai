import type { Metadata } from "next";
import { Fraunces, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/layout/nav";
import { Footer } from "@/components/layout/footer";
import { OrganizationJsonLd } from "@/components/seo/json-ld";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LeTrainAI — AI Consulting for Business",
    template: "%s — LeTrainAI",
  },
  description:
    "AI consulting for businesses that take AI seriously. We build custom AI automation systems, AI-enhanced websites, and workflow optimization.",
  metadataBase: new URL("https://letrainai.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://letrainai.com",
    siteName: "LeTrainAI",
    title: "LeTrainAI — AI Consulting for Business",
    description:
      "AI consulting for businesses that take AI seriously. We build custom AI automation systems, AI-enhanced websites, and workflow optimization.",
  },
  twitter: {
    card: "summary_large_image",
    title: "LeTrainAI — AI Consulting for Business",
    description:
      "AI consulting for businesses that take AI seriously. Custom AI automation, AI-enhanced websites, and workflow optimization.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${geistMono.variable} antialiased`}
    >
      <body>
        <OrganizationJsonLd />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-canvas"
        >
          Skip to main content
        </a>
        <Nav />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
