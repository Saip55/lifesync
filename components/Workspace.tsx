"use client";

import { useEffect, useRef, useState } from "react";
import type { AnalyzeResult, Stage, StreamEvent } from "@/lib/schema";
import { SCENARIOS, type Scenario } from "@/lib/scenarios";
import type { VoiceNote } from "@/lib/client/recordAudio";
import { streamAnalyze } from "@/lib/client/analyze";
import { compressImage } from "@/lib/client/compressImage";
import { InputPanel, type Attachment, type ErrorKey, type LocationState } from "./InputPanel";
import { CardSkeleton, ProgressStrip } from "./ProgressStrip";
import { ActionCard } from "./ActionCard";
import { useLanguage } from "./LanguageProvider";
import { AlertIcon, ArrowRightIcon, PhoneIcon, ShieldIcon } from "./Icons";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

type Status =
  { kind: "idle" } | { kind: "running"; stage: Stage } | { kind: "done"; result: AnalyzeResult; sample: boolean } | { kind: "failed"; error: ErrorKey };

// Smooth scrolling only for people who have not asked their system to reduce motion.
const scrollBehavior = (): ScrollBehavior => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");

export function Workspace() {
  const w = useLanguage().t.workspace;
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [voice, setVoice] = useState<VoiceNote | null>(null);
  const [location, setLocation] = useState<LocationState>({ status: "idle" });
  const [replyLang, setReplyLang] = useState("auto");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [error, setError] = useState<ErrorKey | null>(null);
  const resultRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const request = useRef<AbortController | null>(null);
  const previews = useRef<Attachment[]>([]);

  useEffect(() => {
    previews.current = attachments;
  }, [attachments]);

  // Leaving the page cancels any analysis in flight and frees the photo previews.
  useEffect(
    () => () => {
      request.current?.abort();
      previews.current.forEach((a) => URL.revokeObjectURL(a.url));
    },
    [],
  );

  // /try?example=flood opens with that example filled in (linked from the home page).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("example");
    const s = SCENARIOS.find((x) => x.id === id);
    if (!s) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the query string is only readable in the browser
    setScenario(s);
    setText(s.prefill);
  }, []);

  // When the plan arrives, take keyboard and screen-reader focus to it.
  useEffect(() => {
    if (status.kind !== "done") return;
    headingRef.current?.focus({ preventScroll: true });
    resultRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  }, [status.kind]);

  // Photos are shrunk as they are added, so the 4 MB limit applies to what is actually sent.
  const addFiles = async (files: FileList) => {
    const compressed = await Promise.all(Array.from(files).map((f) => compressImage(f)));
    const next = compressed.map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) }));
    const total = [...attachments, ...next].reduce((n, a) => n + a.file.size, 0) + (voice?.blob.size ?? 0);
    if (total > MAX_UPLOAD_BYTES) {
      next.forEach((a) => URL.revokeObjectURL(a.url));
      setError("tooLarge");
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
    if (!("geolocation" in navigator)) {
      setLocation({ status: "denied" });
      setError("location");
      return;
    }
    setLocation({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ status: "ready", lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {
        setLocation({ status: "denied" });
        setError("location");
      },
      { timeout: 8000, maximumAge: 300_000 },
    );
  };

  const pickScenario = (s: Scenario) => {
    setScenario(s);
    setText(s.prefill);
    setError(null);
  };

  const reset = () => {
    request.current?.abort();
    attachments.forEach((a) => URL.revokeObjectURL(a.url));
    setText("");
    setAttachments([]);
    setVoice(null);
    setScenario(null);
    setError(null);
    setStatus({ kind: "idle" });
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
    // The button that was pressed is gone; put the user back at the start of the form.
    document.getElementById("situation")?.focus({ preventScroll: true });
  };

  const submit = async () => {
    if (!text.trim() && attachments.length === 0 && !voice) {
      setError("empty");
      return;
    }
    setError(null);
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setStatus({ kind: "running", stage: 0 });
    resultRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: "nearest" });

    const form = new FormData();
    form.set("text", text);
    if (replyLang !== "auto") form.set("replyLang", replyLang);
    if (location.status === "ready") {
      form.set("lat", String(location.lat));
      form.set("lon", String(location.lon));
    }
    for (const a of attachments) form.append("files", a.file);
    if (voice) form.set("audio", voice.blob, `voice.${voice.blob.type.includes("mp4") ? "m4a" : "webm"}`);

    // Without a Gemini key, an unchanged example still shows its sample card so the demo works.
    const sample = scenario && text === scenario.prefill && attachments.length === 0 && !voice ? scenario.sample : null;

    const onEvent = (e: StreamEvent) => {
      if (controller.signal.aborted) return;
      if (e.type === "stage") setStatus({ kind: "running", stage: e.stage });
      else if (e.type === "result") setStatus({ kind: "done", result: e.result, sample: false });
      else if (e.code === "not_configured" && sample) setStatus({ kind: "done", result: sample, sample: true });
      else setStatus({ kind: "failed", error: e.code });
    };

    try {
      await streamAnalyze(form, onEvent, controller.signal);
    } catch {
      if (!controller.signal.aborted) setStatus({ kind: "failed", error: "network" });
    }
  };

  const done = status.kind === "done";

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-5 xl:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
      <div className="rounded-[22px] border border-hairline bg-canvas p-5 shadow-window sm:p-7 lg:sticky lg:top-[100px]">
        <InputPanel
          text={text}
          onText={setText}
          attachments={attachments}
          onAddFiles={(f) => void addFiles(f)}
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
          onSubmit={() => void submit()}
        />
      </div>

      <section
        ref={resultRef}
        aria-labelledby="result-title"
        aria-busy={status.kind === "running"}
        className="min-h-[560px] scroll-mt-[100px] rounded-[22px] border border-hairline bg-[linear-gradient(170deg,#f7f6f2_0%,#f2f0ea_100%)] p-3 sm:p-4"
      >
        <div className="h-full rounded-[16px] p-3 sm:p-5">
          <div className={done ? "mb-4 flex flex-wrap items-center justify-between gap-2" : "contents"}>
            <h2
              id="result-title"
              ref={headingRef}
              tabIndex={-1}
              className={done ? "font-display text-card font-medium tracking-[-0.01em] text-graphite outline-none" : "sr-only"}
            >
              {w.resultTitle}
            </h2>
            {status.kind === "done" && (
              <div className="flex flex-wrap items-center gap-2">
                {status.sample && (
                  <p className="inline-flex items-center gap-1.5 rounded-badge border border-linen bg-canvas px-2 py-1 text-utility text-quiet">{w.sample}</p>
                )}
                <button
                  type="button"
                  onClick={reset}
                  className="h-10 rounded-full border border-hairline bg-canvas px-4 text-caption font-medium text-graphite transition-colors hover:bg-cloud"
                >
                  {w.clear}
                </button>
              </div>
            )}
          </div>

          {status.kind === "idle" && <EmptyState />}
          {status.kind === "running" && (
            <div className="rounded-[16px] bg-canvas p-5 shadow-seg">
              <ProgressStrip stage={status.stage} />
              <CardSkeleton />
            </div>
          )}
          {status.kind === "done" && <ActionCard result={status.result} />}
          {status.kind === "failed" && (
            <div role="alert" className="grid h-full place-items-center py-16 text-center">
              <div className="max-w-sm animate-rise">
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-high-soft text-high">
                  <AlertIcon size={20} />
                </span>
                <p className="mt-4 text-card font-medium text-graphite">{w.failedTitle}</p>
                <p className="mt-2 text-caption text-charcoal">{w.errors[status.error]}</p>
                <button
                  type="button"
                  onClick={() => void submit()}
                  className="mt-6 h-11 rounded-full bg-graphite px-5 text-caption font-semibold text-canvas transition-colors hover:bg-graphite-hover"
                >
                  {w.tryAgain}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function EmptyState() {
  const w = useLanguage().t.workspace;
  const icons = [AlertIcon, PhoneIcon, ShieldIcon];
  const tints = ["bg-peach text-peach-ink", "bg-sky text-sky-ink", "bg-sage text-sage-ink"];
  return (
    <div className="flex h-full min-h-[500px] flex-col items-center justify-center py-8 text-center">
      <div className="relative" aria-hidden="true">
        <span className="absolute inset-0 animate-ping rounded-full bg-sage-ink/10 [animation-duration:2.4s]" />
        <span className="relative grid size-14 place-items-center rounded-full bg-canvas text-sage-ink shadow-seg">
          <ArrowRightIcon size={22} className="rotate-90 lg:rotate-180 rtl:lg:rotate-0" />
        </span>
      </div>
      <p className="mt-5 font-display text-[1.5rem] font-medium tracking-[-0.02em] text-graphite">{w.emptyTitle}</p>
      <p className="mt-1 text-caption text-quiet">{w.emptyBody}</p>
      <ul className="mt-7 grid w-full max-w-md gap-2 text-start">
        {w.emptyItems.map((item, i) => {
          const Icon = icons[i] ?? ShieldIcon;
          return (
            <li
              key={item.title}
              className="flex animate-rise items-center gap-3.5 rounded-card bg-canvas p-3.5 shadow-seg"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <span className={`grid size-9 shrink-0 place-items-center rounded-full ${tints[i]}`} aria-hidden="true">
                <Icon size={17} />
              </span>
              <span>
                <span className="block text-caption font-semibold text-graphite">{item.title}</span>
                <span className="block text-utility text-quiet">{item.body}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
