import { DISCLAIMER } from "@/lib/emergency";
import { Wordmark } from "../Logo";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { InfoIcon } from "../Icons";

const LINKS = [
  { href: "#inputs", label: "Inputs" },
  { href: "#how", label: "How it works" },
  { href: "#safety", label: "Safety" },
  { href: "#languages", label: "Languages" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/80">
      <div className="mx-auto grid h-[72px] max-w-[1240px] grid-cols-[1fr_auto] items-center gap-4 px-4 sm:px-6 md:grid-cols-[1fr_auto_1fr]">
        <a href="#top" aria-label="LifeSync home" className="justify-self-start">
          <Wordmark />
        </a>
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="rounded-full px-3 py-2 text-body text-graphite transition-colors hover:bg-cloud"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center justify-self-end gap-2">
          <LanguageSwitcher />
          <a
            href="#workspace"
            className="hidden rounded-full bg-graphite px-[22px] py-[7px] text-body font-medium text-canvas transition-colors hover:bg-graphite-hover sm:inline-block"
          >
            Try LifeSync
          </a>
        </div>
      </div>
      <div className="border-y border-linen bg-paper">
        <p className="mx-auto flex max-w-[1240px] items-center justify-center gap-2 px-4 py-1.5 text-center text-utility text-charcoal sm:px-6">
          <InfoIcon size={14} className="hidden shrink-0 sm:block" />
          <span>
            {DISCLAIMER}{" "}
            <a href="tel:112" className="font-semibold text-graphite underline decoration-linen underline-offset-2">
              Emergency? Call 112
            </a>
          </span>
        </p>
      </div>
    </header>
  );
}
