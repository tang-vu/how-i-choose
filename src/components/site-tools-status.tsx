"use client";

import { useSyncExternalStore } from "react";

export function SiteToolsStatus() {
  const available = useSyncExternalStore<boolean | null>(
    () => () => undefined,
    () => typeof document.modelContext?.registerTool === "function",
    () => null,
  );
  const label = available === null
    ? "Checking Site tools"
    : available
      ? "Site tools available on the rehearsal page"
      : "Site tools unavailable";
  return (
    <div className="tool-status" data-available={available ?? "checking"} role="status">
      <span aria-hidden="true" className="status-dot" />
      <span>{label}</span>
    </div>
  );
}
