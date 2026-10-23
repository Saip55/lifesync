"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "../Logo";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { useLanguage } from "../LanguageProvider";
import { ArrowRightIcon } from "../Icons";

const LINKS = [
  { href: "/#inputs", key: "inputs" },
  { href: "/#how", key: "how" },
  { href: "/#safety", key: "safety" },
  { href: "/#cases", key: "cases" },
] as const;

export function SiteHeader() {
  const { t } = useLanguage();
  const onTry = usePathname() === "/try";
  const [scrolled, setScrolled] = useState(false);
  const progressRef = useRef<HTMLSpanElement>(null);
  // Position of the soft pill that follows the hovered nav link.
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  // At most one update per frame. The progress bar is written straight to the DOM, so scrolling
  // never re-renders the header; `scrolled` only changes when the page crosses the top.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrolled(window.scrollY > 8);
      progressRef.current?.style.setProperty("transform", `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`);
    };
    const onScroll = () => {
      frame ||= requestAnimationFrame(update);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 animate-drop-in">
      {/* Solid surface: content never shows through while scrolling. */}
      <div
        className={`relative border-b bg-canvas transition-[box-shadow,border-color] duration-300 ${
          scrolled ? "border-hairline shadow-[0_8px_24px_-16px_rgba(0,0,0,0.22)]" : "border-transparent"
        }`}
      >
        {/* Reading progress in the landscape colours */}
        <span
          ref={progressRef}
          aria-hidden="true"
          className="absolute inset-x-0 -bottom-px h-[2px] origin-left bg-[linear-gradient(90deg,#4b6847,#3b6474,#f4a66d,#a04d27)] transition-transform duration-150 ease-out rtl:origin-right"
          style={{ transform: "scaleX(0)" }}
        />
        <div className="mx-auto grid h-[60px] max-w-[1240px] grid-cols-[1fr_auto] items-center gap-4 px-4 sm:px-6 lg:grid-cols-[1fr_auto_1fr]">
          <Link href="/" aria-label={t.header.home} className="justify-self-start transition-opacity hover:opacity-80">
            <Wordmark />
          </Link>

          <nav aria-label={t.header.navLabel} className="hidden lg:block">
            <ul className="relative flex items-center">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 rounded-full bg-black/[0.05] transition-[left,width,opacity] duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]"
                style={{ left: pill?.left ?? 0, width: pill?.width ?? 0, opacity: pill ? 1 : 0 }}
              />
              {LINKS.map((l, i) => (
                <li key={l.href} className="animate-rise" style={{ animationDelay: `${150 + i * 60}ms` }}>
                  <Link
                    href={l.href}
                    onMouseEnter={(e) => setPill({ left: e.currentTarget.offsetLeft, width: e.currentTarget.offsetWidth })}
                    onFocus={(e) => setPill({ left: e.currentTarget.offsetLeft, width: e.currentTarget.offsetWidth })}
                    onMouseLeave={() => setPill(null)}
                    onBlur={() => setPill(null)}
                    className="relative block rounded-full px-3.5 py-1.5 whitespace-nowrap text-[0.875rem] font-medium text-charcoal transition-colors hover:text-graphite"
                  >
                    {t.header.nav[l.key]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-1.5 justify-self-end">
            <LanguageSwitcher />
            {!onTry && (
              <Link
                href="/try"
                className="group relative hidden h-9 items-center gap-1.5 overflow-hidden rounded-full whitespace-nowrap bg-graphite ps-4 pe-3.5 text-[0.875rem] font-medium text-canvas shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_6px_16px_-8px_rgba(46,46,46,0.7)] transition-colors hover:bg-graphite-hover sm:inline-flex"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 start-0 w-1/3 -translate-x-[120%] bg-gradient-to-r from-transparent via-white/25 to-transparent group-hover:animate-sheen"
                />
                {t.header.cta}
                <ArrowRightIcon size={15} className="transition-transform duration-300 group-hover:translate-x-0.5 rtl:-scale-x-100" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
