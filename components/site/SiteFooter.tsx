"use client";

import { Wordmark } from "../Logo";
import { useLanguage } from "../LanguageProvider";

export function SiteFooter() {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Wordmark />
        <p className="text-caption text-quiet">
          {t.header.disclaimer} {t.footer.emergency}{" "}
          <a href="tel:112" className="font-semibold text-graphite">
            112
          </a>
          .
        </p>
        <p className="text-caption text-quiet">{t.footer.builtWith}</p>
      </div>
    </footer>
  );
}
