import type { RehearsalState } from "@/domain/rehearsal";

export type RehearsalAction =
  | "submit_scenario"
  | "owner_approve_scenario"
  | "owner_request_changes"
  | "start_approved_rehearsal"
  | "owner_pause"
  | "owner_resume"
  | "owner_stop"
  | "owner_end"
  | "owner_open_debrief"
  | "stage_protocol_patch"
  | "request_owner_patch_review"
  | "owner_complete"
  | "owner_complete_without_patch";

const transitionTable = {
  scenario_draft: {
    submit_scenario: "awaiting_owner_review",
  },
  awaiting_owner_review: {
    owner_approve_scenario: "ready",
    owner_request_changes: "scenario_draft",
  },
  ready: {
    start_approved_rehearsal: "active",
    owner_stop: "stopped",
  },
  active: {
    owner_pause: "paused",
    owner_stop: "stopped",
    owner_end: "debrief",
  },
  paused: {
    owner_resume: "active",
    owner_stop: "stopped",
    owner_end: "debrief",
  },
  stopped: {
    owner_open_debrief: "debrief",
  },
  debrief: {
    stage_protocol_patch: "protocol_patch_staged",
    owner_complete_without_patch: "complete",
  },
  protocol_patch_staged: {
    request_owner_patch_review: "owner_review",
  },
  owner_review: {
    owner_complete: "complete",
  },
  complete: {},
} as const satisfies Record<RehearsalState, Partial<Record<RehearsalAction, RehearsalState>>>;

export type TransitionResult =
  | { ok: true; state: RehearsalState }
  | { ok: false; code: "ILLEGAL_TRANSITION"; state: RehearsalState; action: RehearsalAction };

export function transitionRehearsal(
  state: RehearsalState,
  action: RehearsalAction,
): TransitionResult {
  const transitions = transitionTable[state] as Partial<Record<RehearsalAction, RehearsalState>>;
  const next = transitions[action];
  if (next === undefined) {
    return { ok: false, code: "ILLEGAL_TRANSITION", state, action };
  }
  return { ok: true, state: next };
}

export function validActionsFor(state: RehearsalState): RehearsalAction[] {
  return Object.keys(transitionTable[state]).toSorted() as RehearsalAction[];
}

export function canAgentOfferTurn(state: RehearsalState): boolean {
  return state === "active";
}
