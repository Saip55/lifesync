"use client";

import { useEffect, useState } from "react";
import { SpeakerIcon, StopIcon } from "./Icons";
import { useLanguage } from "./LanguageProvider";

// Only rendered when the device has a voice for the card's language.
export function ReadAloud({ text, lang }: { text: string; lang: string }) {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const c = useLanguage().t.card;

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const prefix = lang.toLowerCase().split("-")[0] ?? "";
    const pick = () =>
      setVoice(speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(prefix)) ?? null);
    pick();
    speechSynthesis.addEventListener("voiceschanged", pick);
    return () => {
      speechSynthesis.removeEventListener("voiceschanged", pick);
      speechSynthesis.cancel();
    };
  }, [lang]);

  if (!voice) return null;

  const toggle = () => {
    if (speaking) {
      speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.onend = u.onerror = () => setSpeaking(false);
    speechSynthesis.speak(u);
    setSpeaking(true);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={speaking}
      className="flex h-10 items-center gap-1.5 rounded-full px-3 text-caption font-medium text-charcoal transition-colors hover:bg-cloud"
    >
      {speaking ? <StopIcon size={14} /> : <SpeakerIcon size={16} />}
      {speaking ? c.stop : c.readAloud}
    </button>
  );
}
