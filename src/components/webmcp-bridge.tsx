"use client";

import { useEffect, useState } from "react";

import { registerHowIChooseTools } from "@/webmcp/registry";

export const workspaceChangedEvent = "how-i-choose:workspace-changed";

export function WebMcpBridge() {
  const [state, setState] = useState<"checking" | "available" | "unavailable" | "error">("checking");

  useEffect(() => {
    let active = true;
    void registerHowIChooseTools(document, {
      onInvocation: () => window.dispatchEvent(new CustomEvent(workspaceChangedEvent)),
    }).then((registered) => {
      if (active) setState(registered ? "available" : "unavailable");
    }).catch(() => {
      if (active) setState("error");
    });
    return () => { active = false; };
  }, []);

  const label = state === "available"
    ? "Site tools available"
    : state === "checking"
      ? "Checking Site tools"
      : "Site tools unavailable";

  return (
    <div className="tool-status" data-available={state} role="status">
      <span aria-hidden="true" className="status-dot" />
      <span>{label}</span>
    </div>
  );
}
