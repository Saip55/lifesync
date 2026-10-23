"use client";

import type { ReactNode } from "react";
import { useLanguage } from "../LanguageProvider";
import { Reveal } from "./Reveal";
import { AlertIcon, CheckIcon, CloudRainIcon, FileIcon, ImageIcon, MessageIcon, MicIcon, NewsIcon, XIcon } from "../Icons";

// Each input type gets its own landscape tint and a small picture of what LifeSync pulls out of it.
export function InputsBento() {
  const i = useLanguage().t.inputs;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:gap-4">
      <Tile
        className="bg-peach sm:col-span-2 lg:col-span-4"
        ink="text-peach-ink"
        Icon={MicIcon}
        title={i.voiceTitle}
        body={i.voiceBody}
        delay={0}
      >
        <div className="rounded-card bg-canvas/80 p-4">
          <div className="flex h-12 items-center justify-between" aria-hidden="true">
            {WAVE.map((h, i) => (
              <span key={i} className="w-[3px] rounded-full bg-peach-ink/70 sm:w-1" style={{ height: `${h}%` }} />
            ))}
          </div>
          <p lang="hi" className="mt-3 text-caption text-graphite">
            “पापा को सुबह से सीने में भारीपन और चक्कर आ रहे हैं…”
          </p>
          <p className="mt-1 text-utility text-quiet">{i.voiceHeard}</p>
        </div>
      </Tile>

      <Tile
        className="bg-sage lg:col-span-2 lg:row-span-2"
        ink="text-sage-ink"
        Icon={ImageIcon}
        title={i.photosTitle}
        body={i.photosBody}
        delay={80}
      >
        <div className="relative mx-auto w-full max-w-[280px] pt-16 lg:pt-24" aria-hidden="true">
          {/* Medicine strip behind the prescription */}
          <div className="absolute end-0 top-0 grid w-[62%] grid-cols-4 gap-2 rounded-[10px] bg-[#d9ded6] p-3 shadow-window">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className={`aspect-square rounded-full ${i === 1 || i === 2 ? "bg-black/[0.06]" : "bg-[#f3f1ec] shadow-seg"}`} />
            ))}
          </div>
          <div className="relative rounded-[8px] bg-[#fffdf8] p-5 shadow-overlay">
            <p className="font-display text-[1.0625rem] font-semibold text-sage-ink">Rx</p>
            <Scribble w="w-4/5" />
            <Scribble w="w-3/5" />
            <Scribble w="w-11/12" />
            <div className="relative mt-3 rounded-[4px] outline-2 outline-offset-2 outline-critical/60 outline-dashed">
              <Scribble w="w-2/3" />
            </div>
            <Scribble w="w-1/2" />
            <span className="mt-5 flex w-fit items-center gap-1 rounded-badge bg-critical-soft px-1.5 py-0.5 text-utility font-medium text-critical">
              <AlertIcon size={12} strokeWidth={2.2} /> {i.photosUnclear}
            </span>
          </div>
        </div>
      </Tile>

      <Tile
        className="bg-lilac lg:col-span-2"
        ink="text-lilac-ink"
        Icon={MessageIcon}
        title={i.forwardsTitle}
        body={i.forwardsBody}
        delay={0}
      >
        <div className="rounded-card rounded-ss-[4px] bg-canvas/85 p-3" aria-hidden="true">
          <p className="text-utility text-quiet italic">{i.forwardsLabel}</p>
          <p className="mt-1 text-caption text-graphite">{i.forwardsText}</p>
          <span className="mt-2 flex w-fit items-center gap-1 rounded-badge bg-critical-soft px-1.5 py-0.5 text-utility font-medium text-critical">
            <XIcon size={12} strokeWidth={2.4} /> {i.forwardsVerdict}
          </span>
        </div>
      </Tile>

      <Tile
        className="bg-sand lg:col-span-2"
        ink="text-sand-ink"
        Icon={FileIcon}
        title={i.docsTitle}
        body={i.docsBody}
        delay={80}
      >
        <ul className="flex flex-wrap gap-1.5" aria-hidden="true">
          {i.docsChips.map((t) => (
            <li key={t} className="rounded-badge bg-canvas/85 px-2 py-1 text-utility font-medium text-graphite">
              {t}
            </li>
          ))}
        </ul>
      </Tile>

      <Tile
        className="bg-sky lg:col-span-3"
        ink="text-sky-ink"
        Icon={CloudRainIcon}
        title={i.weatherTitle}
        body={i.weatherBody}
        delay={0}
      >
        <div className="flex items-end gap-4 rounded-card bg-canvas/80 p-4" aria-hidden="true">
          <div className="min-w-0 flex-1">
            <p className="text-caption font-semibold text-graphite">{i.weatherNow}</p>
            <p className="text-utility text-quiet">{i.weatherAlert}</p>
          </div>
          <div className="flex h-12 items-end gap-1">
            {[30, 55, 90, 100, 70, 40].map((h, i) => (
              <span key={i} className="w-2.5 rounded-t-[3px] bg-sky-ink/60" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </Tile>

      <Tile
        className="border border-linen bg-canvas lg:col-span-3"
        ink="text-graphite"
        Icon={NewsIcon}
        title={i.newsTitle}
        body={i.newsBody}
        delay={80}
      >
        <ul className="divide-y divide-hairline rounded-card bg-cloud px-4" aria-hidden="true">
          <li className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-caption text-graphite">{i.newsA}</span>
            <span className="flex shrink-0 items-center gap-1 text-utility font-medium text-sage-ink">
              <CheckIcon size={12} strokeWidth={2.4} /> {i.confirms}
            </span>
          </li>
          <li className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-caption text-graphite">{i.newsB}</span>
            <span className="flex shrink-0 items-center gap-1 text-utility font-medium text-critical">
              <XIcon size={12} strokeWidth={2.4} /> {i.contradicts}
            </span>
          </li>
        </ul>
      </Tile>
    </ul>
  );
}

const WAVE = [30, 55, 40, 80, 65, 95, 50, 70, 35, 60, 85, 45, 75, 55, 90, 40, 65, 30, 50, 80, 60, 35, 70, 45, 55, 30, 40, 25];

function Tile({
  className,
  ink,
  Icon,
  title,
  body,
  delay,
  children,
}: {
  className: string;
  ink: string;
  Icon: typeof MicIcon;
  title: string;
  body: string;
  delay: number;
  children: ReactNode;
}) {
  return (
    <li className={`overflow-hidden rounded-[18px] transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.25)] ${className}`}>
      <Reveal delay={delay} className="flex h-full flex-col gap-5 p-5 sm:p-6">
        <div>
          <Icon size={22} className={ink} />
          <h3 className="mt-4 font-display text-card font-medium tracking-[-0.01em] text-graphite">{title}</h3>
          <p className="mt-1 max-w-[42ch] text-caption text-charcoal">{body}</p>
        </div>
        <div className="mt-auto">{children}</div>
      </Reveal>
    </li>
  );
}

function Scribble({ w }: { w: string }) {
  return <span className={`mt-2.5 block h-[3px] rounded-full bg-graphite/25 ${w}`} />;
}
