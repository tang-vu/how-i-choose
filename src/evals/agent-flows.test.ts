import { describe, expect, it } from "vitest";
import { z } from "zod";

import fixtures from "@/evals/agent-flows.json";
import { HOW_I_CHOOSE_TOOL_NAMES } from "@/webmcp/registry";

const StepSchema = z.object({
  actor: z.enum(["agent", "owner", "system"]),
  action: z.string().min(1).max(80),
  inputTags: z.array(z.string().min(1).max(80)).max(20),
  expectedCode: z.string().min(1).max(80),
}).strict();

const FixtureSchema = z.object({
  schemaVersion: z.literal(1),
  gradingMode: z.literal("structured_invariants"),
  synthetic: z.literal(true),
  cases: z.array(z.object({
    id: z.string().min(1).max(80),
    steps: z.array(StepSchema).min(1).max(20),
    invariants: z.array(z.string().min(1).max(120)).min(1).max(20),
  }).strict()).length(8),
}).strict();

describe("machine-readable agent-flow eval fixtures", () => {
  it("covers every required flow with structured invariant grading", () => {
    const parsed = FixtureSchema.parse(fixtures);
    expect(new Set(parsed.cases.map(({ id }) => id))).toEqual(new Set([
      "valid-one-question-turn",
      "invalid-two-question-turn",
      "unsure-signal-repair",
      "more-time-handling",
      "human-profile-revision-during-rehearsal",
      "stop-enforcement",
      "agent-protocol-suggestion",
      "absence-of-ratification-tool",
    ]));
    expect(parsed.cases.every(({ invariants }) => invariants.length > 0)).toBe(true);
  });

  it("grades safety structure rather than exact prose", () => {
    const serialized = JSON.stringify(fixtures);
    expect(serialized).toContain("violations_include_QUESTION_COUNT");
    expect(serialized).toContain("signal_authorship_is_person");
    expect(serialized).toContain("session_version_does_not_advance_after_blocked_turn");
    expect(serialized).not.toContain("exactProse");
  });

  it("keeps forbidden authority out of the real tool catalog", () => {
    const catalog = new Set<string>(HOW_I_CHOOSE_TOOL_NAMES);
    for (const forbidden of ["ratify", "answer_for_user", "set_user_signal"]) {
      expect(catalog.has(forbidden)).toBe(false);
    }
  });
});
