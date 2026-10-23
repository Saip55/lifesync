"use client";

import { useEffect, useRef, useState } from "react";
import type { AnalyzeResult } from "@/lib/schema";
import type { Scenario } from "@/lib/scenarios";
import type { VoiceNote } from "@/lib/client/recordAudio";
import { InputPanel, type Attachment, type LocationState } from "./InputPanel";
import { CardSkeleton, ProgressStrip, STAGES } from "./ProgressStrip";
import { ActionCard } from "./ActionCard";
import { CheckIcon, MessageIcon, ShieldIcon } from "./Icons";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

type Status = { kind: "idle" } | { kind: "running"; stage: number } | { kind: "done"; result: AnalyzeResult } | { kind: "preview-only" };

export function Workspace() {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [voice, setVoice] = useState<VoiceNote | null>(null);
  const [location, setLocation] = useState<LocationState>({ status: "idle" });
  const [replyLang, setReplyLang] = useState("auto");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const addFiles = (files: FileList) => {
    const next = Array.from(files).map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) }));
    const total = [...attachments, ...next].reduce((n, a) => n + a.file.size, 0);
    if (total > MAX_UPLOAD_BYTES) {
      next.forEach((a) => URL.revokeObjectURL(a.url));
      setError("Those files are too large together. Try fewer photos or a smaller PDF (4 MB total).");
      return;
    }
    setError(null);
    setAttachments((a) => [...a, ...next]);
  };

  const removeFile = (id: string) =>
    setAttachments((list) => {
      const gone = list.find((a) => a.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return list.filter((a) => a.id !== id);
    });

  const locate = () => {
    if (!("geolocation" in navigator)) return setLocation({ status: "denied" });
    setLocation({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ status: "ready", lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {
        setLocation({ status: "denied" });
        setError("Location is off, so weather will use a default city. You can still continue.");
      },
      { timeout: 8000 }
    );
  };

  const pickScenario = (s: Scenario) => {
    setScenario(s);
    setText(s.prefill);
    setError(null);
  };

  // Design preview: steps through the real stage names, then shows the sample card.
  // Replaced by the streaming /api/analyze call in Phase 1–2.
  const submit = () => {
    if (!text.trim() && attachments.length === 0 && !voice) {
      setError("Add a few words, a photo, or a voice note first.");
      return;
    }
    setError(null);
    timers.current.forEach(clearTimeout);
    setStatus({ kind: "running", stage: 0 });
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    STAGES.forEach((_, i) => {
      timers.current.push(setTimeout(() => setStatus({ kind: "running", stage: i }), i * 750));
    });
    const sample = scenario && text === scenario.prefill ? scenario.sample : null;
    timers.current.push(
      setTimeout(
        () => setStatus(sample ? { kind: "done", result: sample } : { kind: "preview-only" }),
        STAGES.length * 750
      )
    );
  };

  return (
    <div className="grid overflow-hidden rounded-card bg-canvas shadow-window lg:grid-cols-[400px_1fr] xl:grid-cols-[420px_1fr]">
      {/* Window title bar */}
      <div className="col-span-full flex h-11 items-center gap-3 border-b border-hairline px-4">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-black/10" />
          <span className="size-2.5 rounded-full bg-black/10" />
          <span className="size-2.5 rounded-full bg-black/10" />
        </span>
        <span className="text-caption font-medium text-quiet">New situation</span>
        <span className="ms-auto hidden items-center gap-1.5 text-utility text-quiet sm:flex">
          <ShieldIcon size={14} /> Plan → Fact-check with Google Search
        </span>
      </div>

      <div className="border-b border-hairline p-5 sm:p-6 lg:border-e lg:border-b-0">
        <InputPanel
          text={text}
          onText={setText}
          attachments={attachments}
          onAddFiles={addFiles}
          onRemoveFile={removeFile}
          voice={voice}
          onVoice={setVoice}
          location={location}
          onLocate={locate}
          replyLang={replyLang}
          onReplyLang={setReplyLang}
          scenarioId={scenario?.id ?? null}
          onScenario={pickScenario}
          busy={status.kind === "running"}
          error={error}
          onError={setError}
          onSubmit={submit}
        />
      </div>

      <div ref={resultRef} className="min-h-[560px] bg-board p-3 sm:p-[10px]">
        <div className="h-full rounded-[10px] bg-cloud/60 p-4 sm:p-6 lg:max-h-[880px] lg:overflow-y-auto">
          {status.kind === "idle" && <EmptyState />}
          {status.kind === "running" && (
            <>
              <ProgressStrip stage={status.stage} />
              <CardSkeleton />
            </>
          )}
          {status.kind === "done" && (
            <>
              <p className="mb-4 inline-flex items-center gap-1.5 rounded-badge border border-linen bg-canvas px-2 py-1 text-utility text-quiet">
                Design preview · sample card
              </p>
              <ActionCard result={status.result} />
            </>
          )}
          {status.kind === "preview-only" && (
            <div className="grid h-full place-items-center py-16 text-center">
              <div className="max-w-sm">
                <p className="text-card font-medium text-graphite">Live analysis is coming next</p>
                <p className="mt-2 text-caption text-quiet">
                  This is the design preview. Pick one of the examples to see a full sample action card.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const steps = [
    "We read everything you give us — text, voice, photos, documents.",
    "Live weather and news are pulled in when they matter.",
    "A second pass fact-checks every claim with Google Search.",
  ];
  return (
    <div className="flex h-full flex-col items-center justify-center py-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-canvas text-charcoal shadow-seg">
        <MessageIcon size={20} />
      </span>
      <p className="mt-4 font-display text-[24px] font-medium tracking-[-0.02em] text-graphite">
        Your action card appears here
      </p>
      <p className="mt-1 max-w-sm text-caption text-quiet">Clear steps, who to call, and what could not be verified.</p>
      <ul className="mt-8 w-full max-w-sm space-y-2 text-start">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 rounded-feature bg-canvas/80 p-3 text-caption text-charcoal">
            <CheckIcon size={16} className="mt-0.5 shrink-0 text-quiet" />
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}
