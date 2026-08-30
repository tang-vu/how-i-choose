import type { CommunicationRule } from "@/domain/profile";
import type {
  PartnerIntent,
  RehearsalSession,
  StructuredPartnerTurn,
} from "@/domain/rehearsal";
import type { SignalMeaning } from "@/domain/signals";
import { buildRehearsalPolicy } from "@/domain/policy-engine";

export type TurnViolationCode =
  | "SESSION_NOT_ACTIVE"
  | "SESSION_PAUSED"
  | "SESSION_STOPPED"
  | "QUESTION_COUNT"
  | "QUESTION_WORD_LIMIT"
  | "OPTION_LIMIT"
  | "DUPLICATE_OPTIONS"
  | "DEFAULT_ANSWER_NOT_ALLOWED"
  | "CHANNEL_NOT_ALLOWED"
  | "COUNTDOWN_NOT_ALLOWED"
  | "REQUIRED_SIGNAL_CONTROL_MISSING"
  | "PENDING_SIGNAL_UNACKNOWLEDGED"
  | "MORE_TIME_ADVANCED"
  | "NOT_SURE_INTERPRETED"
  | "INFORMATION_NOT_PROVIDED"
  | "REPHRASE_NOT_DIFFERENT"
  | "REPHRASE_MEANING_CHANGED"
  | "ADVISORY_LANGUAGE";

export type TurnViolation = {
  code: TurnViolationCode;
  severity: "error" | "advisory";
  ruleIds: string[];
  message: string;
  repair: string;
};

export type PendingSignal = {
  eventId: string;
  meaning: SignalMeaning;
};

export type TurnValidationContext = {
  activeRules: readonly CommunicationRule[];
  session: Pick<RehearsalSession, "state" | "pendingSignalEventId">;
  pendingSignal?: PendingSignal;
  availableSignalMeanings: readonly SignalMeaning[];
  previousAcceptedTurn?: StructuredPartnerTurn;
};

export type TurnValidationResult = {
  valid: boolean;
  violations: TurnViolation[];
  appliedRuleIds: string[];
  questionCount: number;
  questionWordCounts: number[];
};

export function countWords(text: string): number {
  const normalized = text.trim();
  return normalized === "" ? 0 : normalized.split(/\s+/u).length;
}

function normalizeWording(text: string): string {
  return text.toLocaleLowerCase("en-US").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function questions(turn: StructuredPartnerTurn): string[] {
  return turn.segments.filter((segment) => segment.kind === "question").map(({ text }) => text);
}

function hasIntent(turn: StructuredPartnerTurn, intent: PartnerIntent): boolean {
  return turn.intentTags.includes(intent);
}

function violation(
  code: TurnViolationCode,
  message: string,
  repair: string,
  ruleIds: readonly string[] = [],
  severity: TurnViolation["severity"] = "error",
): TurnViolation {
  return { code, severity, ruleIds: [...ruleIds].toSorted(), message, repair };
}

const requiredSignalMeanings: SignalMeaning[] = [
  "not_sure",
  "need_information",
  "need_more_time",
  "rephrase",
  "pause",
  "stop",
];

const advisoryPhrases = ["obviously", "you should", "best for you"] as const;

export function validatePartnerTurn(
  turn: StructuredPartnerTurn,
  context: TurnValidationContext,
): TurnValidationResult {
  const policy = buildRehearsalPolicy(context.activeRules);
  const violations: TurnViolation[] = [];
  const turnQuestions = questions(turn);
  const questionWordCounts = turnQuestions.map(countWords);

  if (context.session.state === "paused") {
    violations.push(violation("SESSION_PAUSED", "The rehearsal is paused.", "Wait for the owner to resume through the visible page."));
  } else if (context.session.state === "stopped") {
    violations.push(violation("SESSION_STOPPED", "The rehearsal has stopped.", "Do not offer another partner turn in this rehearsal."));
  } else if (context.session.state !== "active") {
    violations.push(violation("SESSION_NOT_ACTIVE", "The rehearsal is not active.", "Use a next action that is valid for the current session state."));
  }

  const acknowledgmentOnly = Boolean(context.pendingSignal && hasIntent(turn, "acknowledge") && turnQuestions.length === 0);
  if (policy.questionCount && turnQuestions.length !== policy.questionCount.value && !acknowledgmentOnly) {
    violations.push(violation(
      "QUESTION_COUNT",
      `Expected exactly ${policy.questionCount.value} question; received ${turnQuestions.length}.`,
      `Offer exactly ${policy.questionCount.value} question segment.`,
      policy.questionCount.ruleIds,
    ));
  }

  if (policy.maxQuestionWords) {
    questionWordCounts.forEach((wordCount, index) => {
      if (wordCount > policy.maxQuestionWords!.value) {
        violations.push(violation(
          "QUESTION_WORD_LIMIT",
          `Question ${index + 1} has ${wordCount} words; maximum is ${policy.maxQuestionWords!.value}.`,
          `Shorten question ${index + 1} to ${policy.maxQuestionWords!.value} words or fewer.`,
          policy.maxQuestionWords!.ruleIds,
        ));
      }
    });
  }

  if (policy.maxOptions && turn.responseOptions.length > policy.maxOptions.value) {
    violations.push(violation(
      "OPTION_LIMIT",
      `Received ${turn.responseOptions.length} options; maximum is ${policy.maxOptions.value}.`,
      `Offer at most ${policy.maxOptions.value} substantive options.`,
      policy.maxOptions.ruleIds,
    ));
  }

  const normalizedOptions = turn.responseOptions.map(({ label }) => normalizeWording(label));
  if (new Set(normalizedOptions).size !== normalizedOptions.length) {
    violations.push(violation("DUPLICATE_OPTIONS", "Response option labels are not distinct.", "Use short, distinct option labels."));
  }

  if (policy.noDefaultAnswer.enabled && turn.responseOptions.some(({ preselected }) => preselected)) {
    violations.push(violation(
      "DEFAULT_ANSWER_NOT_ALLOWED",
      "A response option is preselected.",
      "Remove the default selection and let the person choose directly.",
      policy.noDefaultAnswer.ruleIds,
    ));
  }

  if (
    policy.blockedChannels.includes(turn.channel) ||
    (policy.allowedChannels.length > 0 && !policy.allowedChannels.includes(turn.channel))
  ) {
    violations.push(violation(
      "CHANNEL_NOT_ALLOWED",
      `Channel '${turn.channel}' is not allowed for this rehearsal.`,
      `Use an allowed channel: ${policy.allowedChannels.join(", ") || "none available"}.`,
      policy.channelRuleIds,
    ));
  }

  if (policy.noCountdown.enabled && turn.responseTimerSeconds != null) {
    violations.push(violation(
      "COUNTDOWN_NOT_ALLOWED",
      "This turn includes a response timer.",
      "Remove the timer and wait without auto-advancing.",
      policy.noCountdown.ruleIds,
    ));
  }

  const missingSignals = requiredSignalMeanings.filter(
    (meaning) => !context.availableSignalMeanings.includes(meaning),
  );
  if (missingSignals.length > 0) {
    violations.push(violation(
      "REQUIRED_SIGNAL_CONTROL_MISSING",
      `Visible signal controls are missing: ${missingSignals.join(", ")}.`,
      "Restore all relevant person-controlled signal buttons before offering a turn.",
    ));
  }

  const pending = context.pendingSignal;
  if (pending) {
    const acknowledged = turn.acknowledgesSignalEventId === pending.eventId && hasIntent(turn, "acknowledge");
    if (!acknowledged) {
      violations.push(violation(
        "PENDING_SIGNAL_UNACKNOWLEDGED",
        `Signal '${pending.meaning}' is still awaiting acknowledgment.`,
        `Acknowledge signal event '${pending.eventId}' before another choice.`,
        policy.pendingSignalAcknowledgment.ruleIds,
      ));
    }
    if (pending.meaning === "need_more_time" && turnQuestions.length > 0) {
      violations.push(violation("MORE_TIME_ADVANCED", "A new question was offered after a more-time signal.", "Acknowledge the signal without asking a new question."));
    }
    if (
      pending.meaning === "not_sure" &&
      (hasIntent(turn, "interpret_as_yes") || hasIntent(turn, "interpret_as_no"))
    ) {
      violations.push(violation("NOT_SURE_INTERPRETED", "Not sure was interpreted as yes or no.", "Acknowledge uncertainty and clarify without choosing for the person."));
    }
    if (pending.meaning === "need_information" && !hasIntent(turn, "provide_information")) {
      violations.push(violation("INFORMATION_NOT_PROVIDED", "The requested information was not provided.", "Provide the requested clarification before another choice."));
    }
    if (pending.meaning === "rephrase") {
      if (!hasIntent(turn, "rephrase")) {
        violations.push(violation("REPHRASE_NOT_DIFFERENT", "The turn is not tagged as a rephrase.", "Rephrase the previous question with different wording."));
      }
      const previousQuestion = context.previousAcceptedTurn ? questions(context.previousAcceptedTurn).at(-1) : undefined;
      const currentQuestion = turnQuestions.at(-1);
      if (
        policy.rephraseMustDiffer.enabled &&
        previousQuestion &&
        currentQuestion &&
        normalizeWording(previousQuestion) === normalizeWording(currentQuestion)
      ) {
        violations.push(violation(
          "REPHRASE_NOT_DIFFERENT",
          "The rephrased question repeats the same wording.",
          "Use materially different literal wording.",
          policy.rephraseMustDiffer.ruleIds,
        ));
      }
      if (
        context.previousAcceptedTurn?.meaningKey &&
        turn.meaningKey &&
        context.previousAcceptedTurn.meaningKey !== turn.meaningKey
      ) {
        violations.push(violation("REPHRASE_MEANING_CHANGED", "The meaning key changed during rephrase.", "Keep the original meaning key while changing only the wording."));
      }
    }
  }

  const combinedText = turn.segments.map(({ text }) => text.toLocaleLowerCase("en-US")).join(" ");
  const flaggedPhrase = advisoryPhrases.find((phrase) => combinedText.includes(phrase));
  if (flaggedPhrase) {
    violations.push(violation(
      "ADVISORY_LANGUAGE",
      `Advisory linter flagged '${flaggedPhrase}'.`,
      "Consider more neutral wording; this mechanical flag does not prove coercion or intent.",
      policy.literalLanguage.ruleIds,
      "advisory",
    ));
  }

  const ordered = violations.toSorted((left, right) =>
    `${left.severity}:${left.code}:${left.ruleIds.join(",")}`.localeCompare(
      `${right.severity}:${right.code}:${right.ruleIds.join(",")}`,
    ),
  );
  return {
    valid: ordered.every(({ severity }) => severity !== "error"),
    violations: ordered,
    appliedRuleIds: [
      ...new Set(
        context.activeRules.filter(({ status }) => status === "active").map(({ id }) => id),
      ),
    ].toSorted(),
    questionCount: turnQuestions.length,
    questionWordCounts,
  };
}
