import type { CommunicationRule } from "@/domain/profile";

type NumericConstraint = { value: number; ruleIds: string[] };
type BooleanConstraint = { enabled: boolean; ruleIds: string[] };

export type RehearsalPolicy = {
  allowedChannels: string[];
  blockedChannels: string[];
  channelRuleIds: string[];
  questionCount: NumericConstraint | null;
  maxQuestionWords: NumericConstraint | null;
  maxOptions: NumericConstraint | null;
  noDefaultAnswer: BooleanConstraint;
  noCountdown: BooleanConstraint;
  pendingSignalAcknowledgment: BooleanConstraint;
  rephraseMustDiffer: BooleanConstraint;
  literalLanguage: BooleanConstraint;
};

const strengthRank = { must: 3, should: 2, may: 1 } as const;
const effectRank = { block: 4, require: 3, avoid: 2, prefer: 1 } as const;

function dominantRules(rules: readonly CommunicationRule[]): CommunicationRule[] {
  if (rules.length === 0) return [];
  const highestStrength = Math.max(...rules.map((rule) => strengthRank[rule.strength]));
  const strongest = rules.filter((rule) => strengthRank[rule.strength] === highestStrength);
  const highestEffect = Math.max(...strongest.map((rule) => effectRank[rule.effect]));
  return strongest.filter((rule) => effectRank[rule.effect] === highestEffect);
}

function numericConstraint(
  rules: readonly CommunicationRule[],
  key: string,
  select: "minimum" | "exact",
): NumericConstraint | null {
  const matching = dominantRules(
    rules.filter((rule) => rule.controlledValue.startsWith(`${key}:`)),
  );
  const parsed = matching
    .map((rule) => ({ rule, value: Number(rule.controlledValue.slice(key.length + 1)) }))
    .filter(({ value }) => Number.isInteger(value) && value >= 0);
  if (parsed.length === 0) return null;
  const value = select === "minimum" ? Math.min(...parsed.map((item) => item.value)) : parsed[0]!.value;
  return {
    value,
    ruleIds: parsed.filter((item) => select === "exact" || item.value === value).map(({ rule }) => rule.id).toSorted(),
  };
}

function booleanConstraint(rules: readonly CommunicationRule[], controlledValue: string): BooleanConstraint {
  const matching = dominantRules(rules.filter((rule) => rule.controlledValue === controlledValue));
  return { enabled: matching.length > 0, ruleIds: matching.map(({ id }) => id).toSorted() };
}

export function buildRehearsalPolicy(activeRules: readonly CommunicationRule[]): RehearsalPolicy {
  const rules = activeRules.filter(({ status }) => status === "active");
  const channelRules = dominantRules(rules.filter(({ category }) => category === "channel"));
  return {
    allowedChannels: channelRules
      .filter(({ effect }) => effect === "require" || effect === "prefer")
      .flatMap(({ controlledValue }) => controlledValue.split(",").map((channel) => channel.trim()).filter(Boolean))
      .toSorted(),
    blockedChannels: channelRules
      .filter(({ effect }) => effect === "block" || effect === "avoid")
      .flatMap(({ controlledValue }) => controlledValue.split(",").map((channel) => channel.trim()).filter(Boolean))
      .toSorted(),
    channelRuleIds: channelRules.map(({ id }) => id).toSorted(),
    questionCount: numericConstraint(rules, "question_count", "exact"),
    maxQuestionWords: numericConstraint(rules, "max_question_words", "minimum"),
    maxOptions: numericConstraint(rules, "max_options", "minimum"),
    noDefaultAnswer: booleanConstraint(rules, "no_default_answer:true"),
    noCountdown: booleanConstraint(rules, "countdown:blocked"),
    pendingSignalAcknowledgment: booleanConstraint(rules, "acknowledge_pending:true"),
    rephraseMustDiffer: booleanConstraint(rules, "rephrase_must_differ:true"),
    literalLanguage: booleanConstraint(rules, "literal_language:true"),
  };
}
