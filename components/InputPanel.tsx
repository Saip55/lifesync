"use client";

import { useRef } from "react";
import { LANGUAGES } from "@/lib/languages";
import { SCENARIOS, type Scenario } from "@/lib/scenarios";
import { formatSeconds, MAX_RECORDING_SECONDS, useRecorder, type VoiceNote } from "@/lib/client/recordAudio";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  FileIcon,
  LockIcon,
  MicIcon,
  PaperclipIcon,
  PinIcon,
  StopIcon,
  XIcon,
} from "./Icons";

export type Attachment = { id: string; file: File; url: string };
export type LocationState =
  | { status: "idle" | "loading" | "denied" }
  | { status: "ready"; lat: number; lon: number };

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
  error: string | null;
  onError: (msg: string) => void;
  onSubmit: () => void;
};

const toolClass =
  "flex h-9 items-center gap-1.5 rounded-badge border border-tool-border ps-3 pe-2.5 text-caption text-graphite transition-colors hover:bg-cloud disabled:opacity-50";

export function InputPanel(p: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const rec = useRecorder(p.onVoice, p.onError);

  return (
    <form
      className="flex h-full flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        p.onSubmit();
      }}
    >
      <div>
        <p className="text-utility font-medium text-quiet">Try an example</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SCENARIOS.map((s) => {
            const active = p.scenarioId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => p.onScenario(s)}
                aria-pressed={active}
                className={`flex flex-col items-start rounded-feature border px-3 py-2 text-start transition-colors ${
                  active ? "border-graphite bg-canvas shadow-seg" : "border-hairline bg-cloud hover:bg-board"
                }`}
              >
                <span className="text-caption font-medium text-graphite">{s.label}</span>
                <span className="text-utility text-quiet">{s.tag}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <label htmlFor="situation" className="text-body font-semibold text-graphite">
          What’s happening?
        </label>
        <p id="situation-help" className="text-caption text-quiet">
          Any language. Messy is fine — paste a forward, describe symptoms, or list what you see.
        </p>
        <textarea
          id="situation"
          aria-describedby="situation-help"
          value={p.text}
          onChange={(e) => p.onText(e.target.value)}
          rows={6}
          placeholder="e.g. My father takes BP medicine and was given a new blood thinner. Since morning he feels dizzy…"
          className="mt-3 min-h-40 w-full flex-1 resize-none rounded-badge border border-hairline bg-canvas p-3 text-body text-graphite shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] outline-none transition-colors placeholder:text-ash focus:border-graphite/40 focus-visible:outline-none"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={rec.toggle}
            aria-pressed={rec.recording}
            className={`${toolClass} ${rec.recording ? "border-critical/40 bg-critical-soft text-critical hover:bg-critical-soft" : ""}`}
          >
            {rec.recording ? <StopIcon size={16} /> : <MicIcon size={16} />}
            {rec.recording ? (
              <span className="font-mono text-[13px]">
                {formatSeconds(rec.seconds)} / {formatSeconds(MAX_RECORDING_SECONDS)}
              </span>
            ) : (
              "Voice"
            )}
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className={toolClass}>
            <PaperclipIcon size={16} />
            Photo or PDF
          </button>
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
          <button
            type="button"
            onClick={p.onLocate}
            disabled={p.location.status === "loading"}
            className={`${toolClass} ${p.location.status === "ready" ? "border-low/30 bg-low-soft text-low hover:bg-low-soft" : ""}`}
          >
            {p.location.status === "ready" ? <CheckIcon size={16} /> : <PinIcon size={16} />}
            {p.location.status === "ready"
              ? "Location added"
              : p.location.status === "loading"
                ? "Locating…"
                : "Use my location"}
          </button>
        </div>

        {(p.attachments.length > 0 || p.voice) && (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Attached">
            {p.voice && (
              <li className="flex h-16 items-center gap-2 rounded-badge border border-hairline bg-cloud ps-3 pe-1.5">
                <MicIcon size={16} className="text-charcoal" />
                <span className="text-caption text-graphite">Voice note · {formatSeconds(p.voice.seconds)}</span>
                <button
                  type="button"
                  onClick={() => p.onVoice(null)}
                  aria-label="Remove voice note"
                  className="grid size-7 place-items-center rounded-full text-quiet hover:bg-board hover:text-graphite"
                >
                  <XIcon size={14} />
                </button>
              </li>
            )}
            {p.attachments.map((a) => (
              <li key={a.id} className="relative">
                {a.file.type.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                  <img src={a.url} alt={a.file.name} className="size-16 rounded-badge border border-hairline object-cover" />
                ) : (
                  <div className="flex size-16 flex-col items-center justify-center gap-1 rounded-badge border border-hairline bg-cloud px-1">
                    <FileIcon size={18} className="text-charcoal" />
                    <span className="w-full truncate text-center text-[10px] text-quiet">{a.file.name}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => p.onRemoveFile(a.id)}
                  aria-label={`Remove ${a.file.name}`}
                  className="absolute -end-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-graphite text-canvas shadow-ring"
                >
                  <XIcon size={12} strokeWidth={2.4} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        <label className="flex items-center justify-between gap-3 text-caption text-quiet">
          Reply in
          <span className="relative">
            <select
              value={p.replyLang}
              onChange={(e) => p.onReplyLang(e.target.value)}
              className="h-9 cursor-pointer appearance-none rounded-badge border border-hairline bg-canvas ps-3 pe-8 text-caption text-graphite"
            >
              <option value="auto">Same as my input</option>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.native}
                </option>
              ))}
            </select>
            <ChevronDownIcon size={14} className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2" />
          </span>
        </label>

        {p.error && (
          <p role="alert" className="rounded-badge bg-critical-soft px-3 py-2 text-caption text-critical">
            {p.error}
          </p>
        )}

        <button
          type="submit"
          disabled={p.busy || rec.recording}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-graphite text-body font-semibold text-canvas transition-colors hover:bg-graphite-hover disabled:cursor-not-allowed disabled:bg-ash"
        >
          {p.busy ? "Analysing…" : "Analyse"}
          {!p.busy && <ArrowRightIcon size={18} className="rtl:-scale-x-100" />}
        </button>
        <p className="flex items-center justify-center gap-1.5 text-utility text-quiet">
          <LockIcon size={13} />
          No login. Nothing is stored after your request.
        </p>
      </div>
    </form>
  );
}
