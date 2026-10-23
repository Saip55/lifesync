import type { Metadata, Viewport } from "next";
import {
  Instrument_Sans,
  Inter,
  Noto_Sans_Arabic,
  Noto_Sans_Bengali,
  Noto_Sans_Devanagari,
  Noto_Sans_Gujarati,
  Noto_Sans_Gurmukhi,
  Noto_Sans_Kannada,
  Noto_Sans_Malayalam,
  Noto_Sans_Oriya,
  Noto_Sans_Tamil,
  Noto_Sans_Telugu,
} from "next/font/google";
import { LanguageProvider } from "@/components/LanguageProvider";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const instrument = Instrument_Sans({ variable: "--font-instrument", subsets: ["latin"], weight: ["500", "600"] });

// Indic and Urdu scripts load only when their glyphs appear on the page.
// next/font needs literal options in every call, so they are repeated.
const deva = Noto_Sans_Devanagari({ variable: "--font-noto-deva", subsets: ["devanagari"], weight: ["400", "500", "600"], preload: false });
const beng = Noto_Sans_Bengali({ variable: "--font-noto-beng", subsets: ["bengali"], weight: ["400", "500", "600"], preload: false });
const telu = Noto_Sans_Telugu({ variable: "--font-noto-telu", subsets: ["telugu"], weight: ["400", "500", "600"], preload: false });
const taml = Noto_Sans_Tamil({ variable: "--font-noto-taml", subsets: ["tamil"], weight: ["400", "500", "600"], preload: false });
const gujr = Noto_Sans_Gujarati({ variable: "--font-noto-gujr", subsets: ["gujarati"], weight: ["400", "500", "600"], preload: false });
const arab = Noto_Sans_Arabic({ variable: "--font-noto-arab", subsets: ["arabic"], weight: ["400", "500", "600"], preload: false });
const knda = Noto_Sans_Kannada({ variable: "--font-noto-knda", subsets: ["kannada"], weight: ["400", "500", "600"], preload: false });
const orya = Noto_Sans_Oriya({ variable: "--font-noto-orya", subsets: ["oriya"], weight: ["400", "500", "600"], preload: false });
const mlym = Noto_Sans_Malayalam({ variable: "--font-noto-mlym", subsets: ["malayalam"], weight: ["400", "500", "600"], preload: false });
const guru = Noto_Sans_Gurmukhi({ variable: "--font-noto-guru", subsets: ["gurmukhi"], weight: ["400", "500", "600"], preload: false });

const fontVars = [inter, instrument, deva, beng, telu, taml, gujr, arab, knda, orya, mlym, guru]
  .map((f) => f.variable)
  .join(" ");

export const metadata: Metadata = {
  title: "LifeSync — from a messy moment to the next right step",
  description:
    "Turn voice notes, photos, documents and forwards into a fact-checked action card in your own Indian language.",
};

export const viewport: Viewport = {
  themeColor: "#fdfcfb",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" dir="ltr" className={fontVars}>
      <body className="min-h-dvh">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
