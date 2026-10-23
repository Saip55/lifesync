"use client";

import { useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { LANGUAGES, SITE_LANGUAGES } from "@/lib/languages";
import { SCENARIOS, type Scenario } from "@/lib/scenarios";
import { fill, type Dict } from "@/lib/i18n";
import { formatSeconds, MAX_RECORDING_SECONDS, useRecorder, type VoiceNote } from "@/lib/client/recordAudio";
import { useLanguage } from "./LanguageProvider";
import { ArrowRightIcon, CheckIcon, ChevronDownIcon, FileIcon, LockIcon, MicIcon, PaperclipIcon, PinIcon, StopIcon, XIcon } from "./Icons";

export type Attachment = { id: string; file: File; url: string };
export type LocationState = { status: "idle" | "loading" | "denied" } | { status: "ready"; lat: number; lon: number };
export type ErrorKey = keyof Dict["workspace"]["errors"];

type Props = {
  text: string;
  onText: (v: string) => void;
  attachments: Attachment[];
  onAddFiles: (files: FileList) => void;
  onRemoveFile: (id: string) => void;
  voice: VoiceNote | null;
  onVoice: (v: VoiceNote | null) => void;
  location: LocationState;
  onLocate: () => void;
  replyLang: string;
  onReplyLang: (v: string) => void;
  scenarioId: Scenario["id"] | null;
  onScenario: (s: Scenario) => void;
  busy: boolean;
  error: ErrorKey | null;
  onError: (key: ErrorKey) => void;
  onSubmit: () => void;
};

function Step({ n, title, hint, help, children }: { n: number; title: ReactNode; hint?: string; help?: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0">
      <legend className="flex w-full items-center gap-2.5">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-graphite text-[0.75rem] font-semibold text-canvas">{n}</span>
        <span className="text-body font-semibold text-graphite">{title}</span>
        {hint && <span className="text-utility text-quiet">· {hint}</span>}
      </legend>
      {help && <p className="mt-1.5 text-caption text-quiet">{help}</p>}
      <div className="mt-3">{children}</div>
    </fieldset>
  );
}

// A large, labelled tile so each optional input is obvious at a glance.
function Tile({
  Icon,
  label,
  help,
  on = false,
  tone = "default",
  ...rest
}: {
  Icon: typeof MicIcon;
  label: ReactNode;
  help: string;
  on?: boolean;
  tone?: "default" | "rec" | "ok";
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const tones = {
    default: "border-hairline bg-canvas text-graphite hover:border-graphite/25 hover:bg-cloud",
    rec: "border-critical/40 bg-critical-soft text-critical",
    ok: "border-low/30 bg-low-soft text-low",
  };
  return (
    <button
      type="button"
      aria-pressed={on}
      {...rest}
      className={`flex min-h-[92px] flex-col items-start justify-between gap-2 rounded-card border p-3 text-start transition-[background-color,border-color,transform] duration-200 active:scale-[0.98] disabled:opacity-60 ${tones[tone]}`}
    >
      <Icon size={18} />
      <span>
        <span className="block text-caption leading-tight font-semibold">{label}</span>
        <span className="mt-0.5 hidden text-utility leading-tight text-quiet sm:block">{help}</span>
      </span>
    </button>
  );
}

export function InputPanel(p: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const rec = useRecorder(p.onVoice, () => p.onError("mic"));
  const otherLanguages = LANGUAGES.filter((l) => !SITE_LANGUAGES.some((s) => s.code === l.code));
  const w = useLanguage().t.workspace;

  return (
    <form
      className="flex flex-col gap-7"
      onSubmit={(e) => {
        e.preventDefault();
        p.onSubmit();
      }}
    >
      <Step n={1} title={<label htmlFor="situation">{w.step1}</label>} help={w.step1Help}>
        <textarea
          id="situation"
          value={p.text}
          onChange={(e) => p.onText(e.target.value)}
          rows={6}
          placeholder={w.placeholder}
          className="block min-h-40 w-full resize-y rounded-[14px] border border-tool-border bg-canvas p-4 text-body text-graphite shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-[border-color,box-shadow] placeholder:text-quiet focus:border-graphite focus:shadow-[0_0_0_4px_rgba(26,103,214,0.18)]"
        />

        <p className="mt-4 text-utility font-medium text-quiet">{w.examples}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SCENARIOS.map((s) => {
            const active = p.scenarioId === s.id;
            const copy = w.scenarios[s.id];
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => p.onScenario(s)}
                aria-pressed={active}
                className={`flex items-center gap-2 rounded-full border py-1.5 ps-3 pe-3.5 text-caption transition-colors ${
                  active ? "border-graphite bg-graphite text-canvas" : "border-hairline bg-cloud text-graphite hover:bg-board"
                }`}
              >
                {active && <CheckIcon size={14} strokeWidth={2.4} />}
                <span className="font-medium">{copy.label}</span>
                <span className={active ? "text-canvas/70" : "text-quiet"}>· {copy.tag}</span>
              </button>
            );
          })}
        </div>
      </Step>

      <Step n={2} title={w.step2} hint={w.optional}>
        <div className="grid grid-cols-3 gap-2">
          <Tile
            Icon={rec.recording ? StopIcon : MicIcon}
            on={rec.recording}
            tone={rec.recording ? "rec" : p.voice ? "ok" : "default"}
            onClick={rec.toggle}
            label={
              rec.recording ? (
                <span className="font-mono">
                  {formatSeconds(rec.seconds)} / {formatSeconds(MAX_RECORDING_SECONDS)}
                </span>
              ) : (
                w.voice
              )
            }
            help={rec.recording ? w.stop : w.voiceHelp}
          />
          <Tile
            Icon={PaperclipIcon}
            tone={p.attachments.length ? "ok" : "default"}
            onClick={() => fileRef.current?.click()}
            label={w.photo}
            help={w.photoHelp}
          />
          <Tile
            Icon={p.location.status === "ready" ? CheckIcon : PinIcon}
            tone={p.location.status === "ready" ? "ok" : "default"}
            on={p.location.status === "ready"}
            disabled={p.location.status === "loading"}
            onClick={p.onLocate}
            label={p.location.status === "ready" ? w.locationAdded : p.location.status === "loading" ? w.locating : w.location}
            help={w.locationHelp}
          />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf,text/plain"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) p.onAddFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {(p.attachments.length > 0 || p.voice) && (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label={w.attached}>
            {p.voice && (
              <li className="flex h-16 animate-rise items-center gap-2 rounded-card border border-hairline bg-cloud ps-3 pe-1.5">
                <MicIcon size={16} className="text-charcoal" />
                <span className="text-caption text-graphite">
                  {w.voiceNote} · {formatSeconds(p.voice.seconds)}
                </span>
                <button
                  type="button"
                  onClick={() => p.onVoice(null)}
                  aria-label={w.removeVoice}
                  className="grid size-10 place-items-center rounded-full text-quiet hover:bg-board hover:text-graphite"
                >
                  <XIcon size={14} />
                </button>
              </li>
            )}
            {p.attachments.map((a) => (
              <li key={a.id} className="relative animate-rise">
                {a.file.type.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                  <img src={a.url} alt={a.file.name} className="size-16 rounded-card border border-hairline object-cover" />
                ) : (
                  <div className="flex size-16 flex-col items-center justify-center gap-1 rounded-card border border-hairline bg-cloud px-1">
                    <FileIcon size={18} className="text-charcoal" />
                    <span className="w-full truncate text-center text-[0.625rem] text-quiet">{a.file.name}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => p.onRemoveFile(a.id)}
                  aria-label={fill(w.remove, { name: a.file.name })}
                  className="absolute -end-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-graphite text-canvas shadow-ring after:absolute after:-inset-2.5 after:content-['']"
                >
                  <XIcon size={12} strokeWidth={2.4} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Step>

      <Step n={3} title={<label htmlFor="reply-lang">{w.step3}</label>}>
        <span className="relative block">
          <select
            id="reply-lang"
            value={p.replyLang}
            onChange={(e) => p.onReplyLang(e.target.value)}
            className="h-11 w-full cursor-pointer appearance-none rounded-card border border-tool-border bg-canvas ps-3.5 pe-9 text-caption text-graphite transition-colors hover:border-graphite/40"
          >
            <option value="auto">{w.sameAsInput}</option>
            {SITE_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} lang={l.code}>
                {l.native}
              </option>
            ))}
            {/* The site is translated into six languages; the card can be written in all twelve. */}
            <optgroup label={w.moreLanguages}>
              {otherLanguages.map((l) => (
                <option key={l.code} value={l.code} lang={l.code}>
                  {l.native} · {l.english}
                </option>
              ))}
            </optgroup>
          </select>
          <ChevronDownIcon size={15} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-quiet" />
        </span>
      </Step>

      <div className="space-y-3">
        {p.error && (
          <p role="alert" className="animate-rise rounded-card bg-critical-soft px-3.5 py-2.5 text-caption text-critical">
            {w.errors[p.error]}
          </p>
        )}

        <button
          type="submit"
          disabled={p.busy || rec.recording}
          className="group relative flex h-[52px] w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-graphite text-body font-semibold text-canvas shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_10px_24px_-12px_rgba(46,46,46,0.8)] transition-colors hover:bg-graphite-hover disabled:cursor-not-allowed disabled:bg-ash disabled:shadow-none"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 start-0 w-1/4 -translate-x-[120%] bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-sheen"
          />
          {p.busy ? w.analysing : w.submit}
          {!p.busy && <ArrowRightIcon size={18} className="transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100" />}
        </button>
        <p className="flex items-center justify-center gap-1.5 text-utility text-quiet">
          <LockIcon size={13} />
          {w.privacy}
        </p>
      </div>
    </form>
  );
}
