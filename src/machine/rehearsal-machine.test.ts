import { describe, expect, it } from "vitest";

import type { RehearsalState } from "@/domain/rehearsal";
import {
  canAgentOfferTurn,
  transitionRehearsal,
  validActionsFor,
} from "@/machine/rehearsal-machine";

describe("rehearsal state machine", () => {
  it("implements the owner-reviewed happy path", () => {
    const actions = [
      "submit_scenario",
      "owner_approve_scenario",
      "start_approved_rehearsal",
      "owner_end",
      "stage_protocol_patch",
      "request_owner_patch_review",
      "owner_complete",
    ] as const;
    let state: RehearsalState = "scenario_draft";
    for (const action of actions) {
      const result = transitionRehearsal(state, action);
      expect(result.ok).toBe(true);
      if (result.ok) state = result.state;
    }
    expect(state).toBe("complete");
  });

  it("allows only the visible owner resume action from pause", () => {
    expect(transitionRehearsal("paused", "owner_resume")).toEqual({ ok: true, state: "active" });
    expect(validActionsFor("paused")).not.toContain("start_approved_rehearsal");
    expect(canAgentOfferTurn("paused")).toBe(false);
  });

  it("makes stop terminal for partner turns", () => {
    expect(canAgentOfferTurn("stopped")).toBe(false);
    expect(transitionRehearsal("stopped", "owner_resume")).toEqual({
      ok: false,
      code: "ILLEGAL_TRANSITION",
      state: "stopped",
      action: "owner_resume",
    });
    expect(validActionsFor("stopped")).toEqual(["owner_open_debrief"]);
  });

  it("does not start before owner approval", () => {
    expect(transitionRehearsal("awaiting_owner_review", "start_approved_rehearsal").ok).toBe(false);
  });
});
