import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { canonicalStringify, hashProfile, ratifyProfile } from "@/domain/canonicalize";
import { findActiveRuleConflicts } from "@/domain/conflict-engine";
import { buildAgentProfileProjection } from "@/domain/provenance";
import {
  CommunicationProfileSchema,
  activeRulesForContext,
  type CommunicationRule,
} from "@/domain/profile";
import { StructuredPartnerTurnSchema } from "@/domain/rehearsal";
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

  it("ratification creates exactly one monotonic profile and ratified revision", async () => {
    const result = await ratifyProfile(mayaProfile, "2026-08-31T00:00:00.000Z");
    expect(result.profile.revision).toBe(mayaProfile.revision + 1);
    expect(result.profile.ratifiedVersion).toBe((mayaProfile.ratifiedVersion ?? 0) + 1);
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(mayaProfile.revision).toBe(1);
  });
});
