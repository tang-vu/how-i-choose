"use client";

import { useSyncExternalStore } from "react";

type ModelContextDocument = Document & {
  modelContext?: { registerTool?: unknown };
};

export function SiteToolsStatus() {
  const available = useSyncExternalStore<boolean | null>(
    () => () => undefined,
    () => {
      const currentDocument = document as ModelContextDocument;
      return typeof currentDocument.modelContext?.registerTool === "function";
    },
    () => null,
  );

  const label =
    available === null
      ? "Checking Site tools"
      : available
        ? "Site tools available"
        : "Site tools unavailable";

  return (
    <div className="tool-status" data-available={available ?? "checking"} role="status">
      <span aria-hidden="true" className="status-dot" />
      <span>{label}</span>
    </div>
  );
}
