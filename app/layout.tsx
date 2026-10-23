import type { Metadata, Viewport } from "next";
import {
  Bricolage_Grotesque,
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
import { SkipLink } from "@/components/site/SkipLink";
import { LANG_STORAGE_KEY } from "@/lib/i18n";
import { SITE_LANGUAGES } from "@/lib/languages";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
// Display face: a warm, slightly quirky grotesque with optical sizes, for headlines only.
const display = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], axes: ["opsz", "wdth"] });

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

const fontVars = [inter, display, deva, beng, telu, taml, gujr, arab, knda, orya, mlym, guru].map((f) => f.variable).join(" ");

// Runs before first paint: if a non-English language was saved, hide the page until
// LanguageProvider has swapped the text in. The timeout is a safety net if hydration fails.
const LANG_SCRIPT = `try{var l=localStorage.getItem(${JSON.stringify(LANG_STORAGE_KEY)});if(l&&l!=="en"&&${JSON.stringify(
  SITE_LANGUAGES.map((x) => x.code),
)}.indexOf(l)>-1){var d=document.documentElement;d.lang=l;d.setAttribute("data-lang-pending","");setTimeout(function(){d.removeAttribute("data-lang-pending")},1500)}}catch(e){}`;

export const metadata: Metadata = {
  title: "LifeSync — from a messy moment to the next right step",
  description: "Turn voice notes, photos, documents and forwards into a fact-checked action card in your own Indian language.",
};

export const viewport: Viewport = {
  themeColor: "#fdfcfb",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The pre-paint script below may set lang before hydration, hence suppressHydrationWarning.
    <html lang="en" dir="ltr" className={fontVars} suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line react/no-danger -- fixed string built above, no user input */}
        <script dangerouslySetInnerHTML={{ __html: LANG_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <LanguageProvider>
          <SkipLink />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
