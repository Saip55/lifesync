import { CheckIcon } from "./Icons";

export const STAGES = ["Understanding", "Live data", "Planning", "Fact-checking"] as const;

export function ProgressStrip({ stage }: { stage: number }) {
  return (
    <div role="status" aria-live="polite" className="w-full">
      <span className="sr-only">
        Step {stage + 1} of {STAGES.length}: {STAGES[stage]}
      </span>
      <ol className="grid grid-cols-4 gap-2" aria-hidden="true">
        {STAGES.map((label, i) => {
          const done = i < stage;
          const active = i === stage;
          return (
            <li key={label} className="flex flex-col gap-2">
              <span className="h-1 overflow-hidden rounded-full bg-black/[0.07]">
                <span
                  className={`block h-full rounded-full bg-graphite transition-[width] duration-700 ease-out ${
                    done ? "w-full" : active ? "w-1/2 animate-breathe" : "w-0"
                  }`}
                />
              </span>
              <span
                className={`flex items-center gap-1.5 text-utility font-medium sm:text-caption ${
                  done || active ? "text-graphite" : "text-ash"
                }`}
              >
                {done && <CheckIcon size={14} className="text-low" />}
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="mt-6 space-y-3" aria-hidden="true">
      <div className="h-16 animate-breathe rounded-card bg-black/[0.05]" />
      <div className="h-5 w-4/5 animate-breathe rounded-full bg-black/[0.05]" />
      <div className="h-5 w-3/5 animate-breathe rounded-full bg-black/[0.05]" />
      <div className="h-[72px] animate-breathe rounded-card bg-black/[0.05]" />
      <div className="h-[72px] animate-breathe rounded-card bg-black/[0.05]" />
    </div>
  );
}
