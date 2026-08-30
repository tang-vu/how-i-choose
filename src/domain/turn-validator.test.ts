import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { CommunicationRule } from "@/domain/profile";
import { SignalMeaningSchema } from "@/domain/signals";
import {
  countWords,
  validatePartnerTurn,
  type TurnValidationContext,
} from "@/domain/turn-validator";
import {
  allRequiredSignalMeanings,
  mayaProfile,
  mayaSession,
  validMayaTurn,
} from "@/fixtures/maya";

function context(overrides: Partial<TurnValidationContext> = {}): TurnValidationContext {
  return {
    activeRules: mayaProfile.rules,
    session: mayaSession,
    availableSignalMeanings: allRequiredSignalMeanings,
    ...overrides,
  };
}

function codes(result: ReturnType<typeof validatePartnerTurn>) {
  return result.violations.map(({ code }) => code);
}

describe("turn validator", () => {
  it("accepts the valid one-question Maya turn", () => {
    const result = validatePartnerTurn(validMayaTurn, context());
    expect(result.valid).toBe(true);
    expect(result.questionCount).toBe(1);
    expect(result.questionWordCounts).toEqual([6]);
  });

  it("returns identical output for identical input", () => {
    expect(validatePartnerTurn(validMayaTurn, context())).toEqual(
      validatePartnerTurn(validMayaTurn, context()),
    );
  });

  it("does not change when active rules are reordered", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.shuffledSubarray(mayaProfile.rules, {
          minLength: mayaProfile.rules.length,
          maxLength: mayaProfile.rules.length,
        }),
        async (rules) => {
          expect(validatePartnerTurn(validMayaTurn, context({ activeRules: rules }))).toEqual(
            validatePartnerTurn(validMayaTurn, context()),
          );
        },
      ),
      { numRuns: 25 },
    );
  });

  it("ignores draft and retired rules", () => {
    const impossible: CommunicationRule[] = [
      { ...mayaProfile.rules[2]!, id: "draft-one-word", status: "draft", controlledValue: "max_question_words:1" },
      { ...mayaProfile.rules[2]!, id: "retired-no-options", status: "retired", controlledValue: "max_options:0" },
    ];
    expect(validatePartnerTurn(validMayaTurn, context({ activeRules: [...mayaProfile.rules, ...impossible] }))).toEqual(
      validatePartnerTurn(validMayaTurn, context()),
    );
  });

  it("rejects a deliberately long two-question turn with exact rule IDs", () => {
    const invalid = structuredClone(validMayaTurn);
    invalid.segments = [
      { kind: "question", text: "Would you like the community workshop in the morning or afternoon next Saturday?" },
      { kind: "question", text: "And should the reminder arrive by text or calendar notification?" },
    ];
    const result = validatePartnerTurn(invalid, context());
    expect(result.valid).toBe(false);
    expect(codes(result)).toEqual(expect.arrayContaining(["QUESTION_COUNT", "QUESTION_WORD_LIMIT"]));
    expect(result.violations.find(({ code }) => code === "QUESTION_COUNT")?.ruleIds).toEqual(["rule-one-question"]);
    expect(result.violations.find(({ code }) => code === "QUESTION_WORD_LIMIT")?.ruleIds).toEqual(["rule-twelve-words"]);
  });

  it("counts words deterministically across whitespace", () => {
    fc.assert(
      fc.property(fc.array(fc.stringMatching(/^[A-Za-z]{1,8}$/), { minLength: 1, maxLength: 20 }), (words) => {
        expect(countWords(`  ${words.join("   ")}  `)).toBe(words.length);
      }),
    );
  });

  it("enforces option limit, distinct options, and no default", () => {
    const invalid = structuredClone(validMayaTurn);
    invalid.responseOptions = [
      { id: "first", label: "Morning", value: "morning", preselected: true },
      { id: "second", label: " morning ", value: "morning-two", preselected: false },
      { id: "third", label: "Afternoon", value: "afternoon", preselected: false },
    ];
    expect(codes(validatePartnerTurn(invalid, context()))).toEqual(
      expect.arrayContaining(["OPTION_LIMIT", "DUPLICATE_OPTIONS", "DEFAULT_ANSWER_NOT_ALLOWED"]),
    );
  });

  it("lets a hard channel block dominate a preference", () => {
    const preferSpeech: CommunicationRule = {
      ...mayaProfile.rules[0]!,
      id: "prefer-speech",
      controlledValue: "speech",
      effect: "prefer",
    };
    const blockSpeech: CommunicationRule = {
      ...preferSpeech,
      id: "block-speech",
      effect: "block",
    };
    const spoken = { ...validMayaTurn, channel: "speech" as const };
    const result = validatePartnerTurn(spoken, context({ activeRules: [preferSpeech, blockSpeech, ...mayaProfile.rules.slice(1)] }));
    expect(codes(result)).toContain("CHANNEL_NOT_ALLOWED");
  });

  it("rejects timers and missing person-controlled signals", () => {
    const timed = { ...validMayaTurn, responseTimerSeconds: 20 };
    expect(codes(validatePartnerTurn(timed, context({ availableSignalMeanings: ["stop"] })))).toEqual(
      expect.arrayContaining(["COUNTDOWN_NOT_ALLOWED", "REQUIRED_SIGNAL_CONTROL_MISSING"]),
    );
  });

  it("blocks every partner turn while paused or stopped", () => {
    expect(codes(validatePartnerTurn(validMayaTurn, context({ session: { state: "paused" } })))).toContain("SESSION_PAUSED");
    expect(codes(validatePartnerTurn(validMayaTurn, context({ session: { state: "stopped" } })))).toContain("SESSION_STOPPED");
  });

  it("requires acknowledgment before another question", () => {
    const result = validatePartnerTurn(
      validMayaTurn,
      context({
        session: { state: "active", pendingSignalEventId: "event-blue" },
        pendingSignal: { eventId: "event-blue", meaning: "need_more_time" },
      }),
    );
    expect(codes(result)).toEqual(expect.arrayContaining(["PENDING_SIGNAL_UNACKNOWLEDGED", "MORE_TIME_ADVANCED"]));
  });

  it("acknowledges more time without advancing", () => {
    const acknowledgment = {
      ...validMayaTurn,
      segments: [{ kind: "statement" as const, text: "I will wait. Take the time you need." }],
      intentTags: ["acknowledge" as const],
      responseOptions: [],
      acknowledgesSignalEventId: "event-blue",
    };
    const result = validatePartnerTurn(
      acknowledgment,
      context({
        activeRules: mayaProfile.rules.filter(({ id }) => id !== "rule-one-question"),
        session: { state: "active", pendingSignalEventId: "event-blue" },
        pendingSignal: { eventId: "event-blue", meaning: "need_more_time" },
      }),
    );
    expect(result.valid).toBe(true);
    expect(result.questionCount).toBe(0);
  });

  it("never interprets not-sure as yes or no", () => {
    const unsafe = {
      ...validMayaTurn,
      intentTags: ["acknowledge" as const, "interpret_as_yes" as const],
      acknowledgesSignalEventId: "event-amber",
    };
    expect(codes(validatePartnerTurn(unsafe, context({
      session: { state: "active", pendingSignalEventId: "event-amber" },
      pendingSignal: { eventId: "event-amber", meaning: "not_sure" },
    })))).toContain("NOT_SURE_INTERPRETED");
  });

  it("requires information before another choice", () => {
    const acknowledgment = {
      ...validMayaTurn,
      intentTags: ["acknowledge" as const],
      acknowledgesSignalEventId: "event-purple",
    };
    expect(codes(validatePartnerTurn(acknowledgment, context({
      session: { state: "active", pendingSignalEventId: "event-purple" },
      pendingSignal: { eventId: "event-purple", meaning: "need_information" },
    })))).toContain("INFORMATION_NOT_PROVIDED");
  });

  it("requires genuinely different wording without changing the meaning key", () => {
    const repeated = {
      ...validMayaTurn,
      intentTags: ["acknowledge" as const, "rephrase" as const],
      acknowledgesSignalEventId: "event-rephrase",
      meaningKey: "different-choice",
    };
    const result = validatePartnerTurn(repeated, context({
      session: { state: "active", pendingSignalEventId: "event-rephrase" },
      pendingSignal: { eventId: "event-rephrase", meaning: "rephrase" },
      previousAcceptedTurn: validMayaTurn,
    }));
    expect(codes(result)).toEqual(expect.arrayContaining(["REPHRASE_NOT_DIFFERENT", "REPHRASE_MEANING_CHANGED"]));
  });

  it("labels mechanical language findings advisory instead of claiming neutrality", () => {
    const turn = structuredClone(validMayaTurn);
    turn.segments = [{ kind: "question", text: "Which is obviously best for you?" }];
    const result = validatePartnerTurn(turn, context());
    expect(result.valid).toBe(true);
    expect(result.violations).toContainEqual(expect.objectContaining({ code: "ADVISORY_LANGUAGE", severity: "advisory" }));
  });

  it("does not define silence as a semantic signal", () => {
    expect(SignalMeaningSchema.safeParse("silence").success).toBe(false);
  });
});
