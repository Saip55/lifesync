"use client";

import { useLanguage } from "../LanguageProvider";

// Hero copy for the switcher. Hindi and Marathi need a native-speaker spot check.
const COPY = {
  en: {
    title: "From a messy moment\nto the next right step.",
    body: "Speak, snap a photo, or paste a forward. LifeSync turns it into a fact-checked action card in your own language — and tells you plainly what it couldn’t verify.",
    cta: "Start with what you have",
  },
  hi: {
    title: "उलझे हुए पल से\nसही अगले कदम तक।",
    body: "बोलिए, फ़ोटो लीजिए या कोई फ़ॉरवर्ड चिपकाइए। LifeSync उसे आपकी भाषा में जाँचे हुए कदमों में बदल देता है — और साफ़ बताता है कि क्या जाँचा नहीं जा सका।",
    cta: "जो है, उसी से शुरू करें",
  },
  mr: {
    title: "गोंधळलेल्या क्षणापासून\nयोग्य पुढच्या पावलापर्यंत.",
    body: "बोला, फोटो काढा किंवा आलेला मेसेज पेस्ट करा. LifeSync तो तुमच्या भाषेत तपासलेल्या कृतींमध्ये बदलतो — आणि काय तपासता आले नाही ते स्पष्ट सांगतो.",
    cta: "जे आहे त्यापासून सुरुवात करा",
  },
} as const;

const OPTIONS = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "mr", label: "मराठी" },
] as const;

export function Hero() {
  const { lang, setLang } = useLanguage();
  const copy = lang in COPY ? COPY[lang as keyof typeof COPY] : COPY.en;

  return (
    <section className="mx-auto flex max-w-[1240px] flex-col items-center px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-24 sm:pb-16">
      <div
        role="radiogroup"
        aria-label="Preview language"
        className="inline-flex rounded-full bg-cloud p-1 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]"
      >
        {OPTIONS.map((o) => {
          const active = lang === o.code;
          return (
            <button
              key={o.code}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setLang(o.code)}
              className={`rounded-full px-3.5 py-2 text-seg font-medium transition-all ${
                active ? "bg-canvas text-graphite shadow-seg" : "text-quiet hover:text-graphite"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      <h1 className="mt-8 max-w-[820px] font-display text-[34px] leading-[1.25] font-medium tracking-[-0.03em] whitespace-pre-line text-graphite sm:text-hero">
        {copy.title}
      </h1>
      <p className="mt-5 max-w-[620px] text-lead leading-[27px] text-charcoal">{copy.body}</p>

      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
        <a
          href="#workspace"
          className="rounded-full bg-graphite px-7 py-3 text-body font-semibold text-canvas transition-colors hover:bg-graphite-hover"
        >
          {copy.cta}
        </a>
        <a href="#how" className="text-lead leading-[27px] font-medium text-research hover:underline">
          How it checks facts
        </a>
      </div>
    </section>
  );
}
