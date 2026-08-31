import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { canonicalStringify, hashProfile, ratifyProfile } from "@/domain/canonicalize";
import { findActiveRuleConflicts } from "@/domain/conflict-engine";
import { buildRehearsalPolicy } from "@/domain/policy-engine";
import { buildAgentProfileProjection } from "@/domain/provenance";
import {
  CommunicationProfileSchema,
  activeRulesForContext,
  type CommunicationRule,
} from "@/domain/profile";
import { RehearsalSessionSchema, StructuredPartnerTurnSchema } from "@/domain/rehearsal";
import { mayaProfile, mayaScenario, mayaSession, validMayaTurn } from "@/fixtures/maya";

describe("communication profile", () => {
  it("validates the synthetic Maya profile", () => {
    expect(CommunicationProfileSchema.parse(mayaProfile)).toEqual(mayaProfile);
  });

  it("rejects duplicate IDs and unknown imported properties", () => {
    const duplicate = structuredClone(mayaProfile);
    duplicate.rules.push({ ...duplicate.rules[0]! });
    expect(CommunicationProfileSchema.safeParse(duplicate).success).toBe(false);

    const imported = { ...structuredClone(mayaProfile), executable: "alert(1)" };
    expect(CommunicationProfileSchema.safeParse(imported).success).toBe(false);
  });

  it("accepts no executable properties in structured partner turns", () => {
    expect(
      StructuredPartnerTurnSchema.safeParse({ ...validMayaTurn, onRender: "run-code" }).success,
    ).toBe(false);
  });

  it("migrates legacy rehearsal sessions to Human-only access", () => {
    const legacySession = structuredClone(mayaSession) as Partial<typeof mayaSession>;
    delete legacySession.agentAccessEnabled;

    expect(RehearsalSessionSchema.parse(legacySession).agentAccessEnabled).toBe(false);
  });

  it("builds a deny-by-default agent projection without private notes", () => {
    const hidden = structuredClone(mayaProfile);
    hidden.disclosures = hidden.disclosures.map((disclosure) => ({
      ...disclosure,
      agentVisible: disclosure.fieldId !== "rule-silence",
    }));
    const projection = buildAgentProfileProjection(hidden, mayaSession, mayaScenario);
    const serialized = JSON.stringify(projection);

    expect(projection.rules.map(({ id }) => id)).not.toContain("rule-silence");
    expect(projection.signals).toHaveLength(8);
    expect(serialized).not.toContain(hidden.privateNotes);
    expect(serialized).not.toContain("privateNotes");
    expect(projection.sharedFieldCount).toBe(19);
    expect(projection.totalFieldCount).toBe(20);
  });

  it("withholds an undisclosed context and scenario summary from the agent projection", () => {
    const hidden = structuredClone(mayaProfile);
    hidden.contexts = hidden.contexts.map((context) => ({ ...context, agentVisible: false }));
    hidden.disclosures = hidden.disclosures.map((disclosure) => (
      disclosure.fieldKind === "scenario_summary"
        ? { ...disclosure, agentVisible: false }
        : disclosure
    ));
    const projection = buildAgentProfileProjection(hidden, mayaSession, mayaScenario);
    expect(projection.activeContext).toBeNull();
    expect(projection.scenario).toBeNull();
  });

  it("filters draft and retired rules from active evaluation", () => {
    const profile = structuredClone(mayaProfile);
    profile.rules.push(
      { ...profile.rules[0]!, id: "draft-rule", status: "draft" },
      { ...profile.rules[0]!, id: "retired-rule", status: "retired" },
    );
    const activeIds = activeRulesForContext(profile, "community-workshop").map(({ id }) => id);
    expect(activeIds).not.toContain("draft-rule");
    expect(activeIds).not.toContain("retired-rule");
  });

  it("supports global rules, excludes unrelated contexts, and rejects unknown context references", () => {
    const profile = structuredClone(mayaProfile);
    profile.rules.push(
      { ...profile.rules[0]!, id: "global-rule", contextIds: [] },
      { ...profile.rules[0]!, id: "other-context-rule", contextIds: ["another-context"] },
    );
    const activeIds = activeRulesForContext(profile, "community-workshop").map(({ id }) => id);
    expect(activeIds).toContain("global-rule");
    expect(activeIds).not.toContain("other-context-rule");
    expect(CommunicationProfileSchema.safeParse(profile).success).toBe(false);
  });
});

describe("conflict engine", () => {
  const baseRule = mayaProfile.rules[0]!;

  it("surfaces equal-strength contradictory active rules symmetrically", () => {
    const text: CommunicationRule = { ...baseRule, id: "channel-text", controlledValue: "text" };
    const speech: CommunicationRule = { ...baseRule, id: "channel-speech", controlledValue: "speech" };
    const forward = findActiveRuleConflicts([text, speech]);
    const reverse = findActiveRuleConflicts([speech, text]);

    expect(forward).toEqual(reverse);
    expect(forward).toEqual([
      expect.objectContaining({ ruleIds: ["channel-speech", "channel-text"], reason: "different_required_values" }),
    ]);
  });

  it("does not allow draft or retired contradictions to influence conflicts", () => {
    const active: CommunicationRule = { ...baseRule, id: "active", controlledValue: "text" };
    const draft: CommunicationRule = { ...baseRule, id: "draft", status: "draft", controlledValue: "speech" };
    const retired: CommunicationRule = { ...baseRule, id: "retired", status: "retired", controlledValue: "aac" };
    expect(findActiveRuleConflicts([active, draft, retired])).toEqual([]);
  });

  it("finds opposing effects across global contexts and ignores non-overlapping contexts", () => {
    const required: CommunicationRule = {
      ...baseRule,
      id: "required-text",
      contextIds: [],
      effect: "require",
      controlledValue: "text",
    };
    const blocked: CommunicationRule = {
      ...baseRule,
      id: "blocked-text",
      contextIds: ["community-workshop"],
      effect: "block",
      controlledValue: "text",
    };
    expect(findActiveRuleConflicts([required, blocked])).toEqual([
      expect.objectContaining({ reason: "opposing_effects" }),
    ]);

    const left = { ...required, id: "left", contextIds: ["left-context"] };
    const right = { ...blocked, id: "right", contextIds: ["right-context"] };
    expect(findActiveRuleConflicts([left, right])).toEqual([]);
  });

  it("ignores rules that differ in strength, category, policy key, or compatible effect", () => {
    const baseline: CommunicationRule = { ...baseRule, id: "baseline", controlledValue: "text" };
    expect(findActiveRuleConflicts([
      baseline,
      { ...baseline, id: "different-strength", strength: "should", controlledValue: "speech" },
      { ...baseline, id: "different-category", category: "language", controlledValue: "speech" },
      { ...baseline, id: "compatible", controlledValue: "text" },
    ])).toEqual([]);
  });
});

describe("rehearsal policy", () => {
  it("returns closed, disabled constraints when no active rules apply", () => {
    expect(buildRehearsalPolicy([])).toEqual({
      allowedChannels: [],
      blockedChannels: [],
      channelRuleIds: [],
      questionCount: null,
      maxQuestionWords: null,
      maxOptions: null,
      noDefaultAnswer: { enabled: false, ruleIds: [] },
      noCountdown: { enabled: false, ruleIds: [] },
      pendingSignalAcknowledgment: { enabled: false, ruleIds: [] },
      rephraseMustDiffer: { enabled: false, ruleIds: [] },
      literalLanguage: { enabled: false, ruleIds: [] },
    });
  });

  it("selects dominant channel and numeric rules while discarding invalid numbers", () => {
    const base = mayaProfile.rules[0]!;
    const rules: CommunicationRule[] = [
      { ...base, id: "prefer-speech", effect: "prefer", strength: "may", controlledValue: "speech" },
      { ...base, id: "require-text", effect: "require", strength: "must", controlledValue: "text, aac" },
      { ...base, id: "block-video", effect: "block", strength: "must", controlledValue: "video" },
      { ...base, id: "bad-limit", category: "question_format", controlledValue: "max_options:not-a-number" },
      { ...base, id: "limit-three", category: "question_format", controlledValue: "max_options:3" },
      { ...base, id: "limit-two", category: "question_format", controlledValue: "max_options:2" },
    ];
    const policy = buildRehearsalPolicy(rules);
    expect(policy.allowedChannels).toEqual([]);
    expect(policy.blockedChannels).toEqual(["video"]);
    expect(policy.maxOptions).toEqual({ value: 2, ruleIds: ["limit-two"] });
  });
});

describe("canonicalization and ratification", () => {
  it("produces the same profile hash regardless of set-like rule order", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.shuffledSubarray(mayaProfile.rules, {
          minLength: mayaProfile.rules.length,
          maxLength: mayaProfile.rules.length,
        }),
        async (rules) => {
          const reordered = { ...mayaProfile, rules };
          expect(await hashProfile(reordered)).toBe(await hashProfile(mayaProfile));
        },
      ),
      { numRuns: 25 },
    );
  });

  it("preserves semantically ordered arrays", () => {
    const first = canonicalStringify({ segments: [{ text: "First" }, { text: "Second" }] });
    const reversed = canonicalStringify({ segments: [{ text: "Second" }, { text: "First" }] });
    expect(first).not.toBe(reversed);
  });

  it("sorts primitive set-like arrays and omits undefined object properties", () => {
    expect(canonicalStringify({ contextIds: ["z", "a"], omit: undefined, keep: true })).toBe(
      '{"contextIds":["a","z"],"keep":true}',
    );
  });

  it("ratification creates exactly one monotonic profile and ratified revision", async () => {
    const result = await ratifyProfile(mayaProfile, "2026-08-31T00:00:00.000Z");
    expect(result.profile.revision).toBe(mayaProfile.revision + 1);
    expect(result.profile.ratifiedVersion).toBe((mayaProfile.ratifiedVersion ?? 0) + 1);
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(mayaProfile.revision).toBe(1);
  });

  it("starts ratified versioning at one for a never-ratified profile", async () => {
    const profile = { ...mayaProfile, ratifiedVersion: null };
    const result = await ratifyProfile(profile, "2026-08-31T00:00:00.000Z");
    expect(result.profile.ratifiedVersion).toBe(1);
  });
});
