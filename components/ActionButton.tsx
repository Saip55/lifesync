"use client";

import { useId, useRef, useState } from "react";
import type { Action } from "@/lib/schema";
import { downloadReminder, mapsHref, telHref, whatsappHref } from "@/lib/client/actions";
import { fill, type Dict } from "@/lib/i18n";
import { useLanguage } from "./LanguageProvider";
import { ArrowRightIcon, BellIcon, InfoIcon, MessageIcon, NavigateIcon, PhoneIcon } from "./Icons";

const TYPE_ICON = { call: PhoneIcon, message: MessageIcon, reminder: BellIcon, navigate: NavigateIcon, info: InfoIcon };
function describe(action: Action, t: Dict["card"]["confirm"]) {
  const vars = { phone: action.payload.phone ?? "", destination: action.payload.destination ?? "" };
  switch (action.type) {
    case "call":
      return { prompt: fill(t.call, vars), confirm: fill(t.callButton, vars) };
    case "message":
      return { prompt: t.message, confirm: t.messageButton };
    case "navigate":
      return { prompt: fill(t.navigate, vars), confirm: t.navigateButton };
    case "reminder":
      return { prompt: t.reminder, confirm: t.reminderButton };
    case "info":
      return { prompt: "", confirm: t.infoButton };
  }
}

function run(action: Action) {
  const { phone, message, destination } = action.payload;
  if (action.type === "call" && phone) window.location.href = telHref(phone);
  if (action.type === "message" && message) window.open(whatsappHref(message, phone), "_blank", "noopener");
  if (action.type === "navigate" && destination) window.open(mapsHref(destination), "_blank", "noopener");
  if (action.type === "reminder") downloadReminder(action);
}

export function ActionButton({ action, index }: { action: Action; index: number }) {
  const [confirming, setConfirming] = useState(false);
  const c = useLanguage().t.card;
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  // The confirm panel closes after either choice; keep keyboard focus on this action, not the page.
  const close = () => {
    setConfirming(false);
    toggleRef.current?.focus();
  };
  const Glyph = TYPE_ICON[action.type];
  const isInfo = action.type === "info";
  const isNow = action.urgency === "now";
  const { prompt, confirm } = describe(action, c.confirm);

  const body = (
    <>
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-full ${
          isNow ? "bg-graphite text-canvas" : "bg-paper text-graphite"
        }`}
      >
        <Glyph size={18} />
      </span>
      <span className="min-w-0 flex-1 text-start">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-body font-semibold text-graphite">{action.title}</span>
          <span
            className={`rounded-badge px-1.5 py-0.5 text-utility font-medium ${
              isNow ? "bg-graphite/90 text-canvas" : "border border-linen text-quiet"
            }`}
          >
            {c.urgency[action.urgency]}
          </span>
        </span>
        <span className="mt-0.5 block text-caption text-quiet">{action.detail}</span>
      </span>
      {!isInfo && <ArrowRightIcon size={18} className="shrink-0 text-quiet transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100" />}
    </>
  );

  const rowClass = "flex w-full items-center gap-3 rounded-card p-3 sm:gap-4 sm:p-4";

  return (
    <li
      className="animate-rise overflow-hidden rounded-card border border-hairline bg-canvas"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {isInfo ? (
        <div className={rowClass}>{body}</div>
      ) : (
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={action.needs_confirmation ? confirming : undefined}
          aria-controls={action.needs_confirmation && confirming ? panelId : undefined}
          onClick={() => (action.needs_confirmation ? setConfirming((c) => !c) : run(action))}
          className={`group ${rowClass} transition-colors hover:bg-cloud`}
        >
          {body}
        </button>
      )}

      {confirming && (
        <div id={panelId} className="border-t border-hairline bg-cloud px-4 py-4 sm:ps-[72px]" role="group" aria-label={c.confirmGroup}>
          <p className="text-caption text-charcoal">{prompt}</p>
          {action.type === "message" && action.payload.message && (
            <p className="mt-2 rounded-badge border border-linen bg-canvas p-3 text-caption text-graphite">
              {action.payload.message}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                run(action);
                close();
              }}
              className="h-11 rounded-full bg-graphite px-5 text-caption font-semibold text-canvas transition-colors hover:bg-graphite-hover"
            >
              {confirm}
            </button>
            <button
              type="button"
              onClick={close}
              className="h-11 rounded-full px-4 text-caption font-medium text-quiet transition-colors hover:bg-board hover:text-graphite"
            >
              {c.notNow}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
