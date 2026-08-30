import type { CommunicationProfile, CommunicationRule } from "@/domain/profile";
import type { RehearsalSession, StructuredPartnerTurn } from "@/domain/rehearsal";
import type { Scenario } from "@/domain/scenario";

const now = "2026-08-30T12:00:00.000Z";
const contextId = "community-workshop";

function rule(
  id: string,
  category: CommunicationRule["category"],
  controlledValue: string,
  displayText: string,
  effect: CommunicationRule["effect"] = "require",
): CommunicationRule {
  return {
    id,
    status: "active",
    category,
    effect,
    strength: "must",
    contextIds: [],
    controlledValue,
    displayText,
    agentVisible: true,
    provenance: { source: "person", acceptedAt: now },
  };
}

export const mayaProfile: CommunicationProfile = {
  schemaVersion: 1,
  id: "profile-maya",
  title: "Maya — synthetic sample",
  revision: 1,
  ratifiedVersion: 1,
  rules: [
    rule("rule-channel-text", "channel", "text", "Use text-first communication."),
    rule("rule-one-question", "question_format", "question_count:1", "Ask exactly one question at a time."),
    rule("rule-twelve-words", "question_format", "max_question_words:12", "Use no more than 12 words per question."),
    rule("rule-two-options", "question_format", "max_options:2", "Offer at most two substantive options."),
    rule("rule-no-default", "question_format", "no_default_answer:true", "Do not preselect an answer."),
    rule("rule-no-countdown", "pacing", "countdown:blocked", "Do not use a countdown or forced timer.", "block"),
    rule("rule-literal", "language", "literal_language:true", "Use short, literal sentences."),
    rule("rule-rephrase", "language", "rephrase_must_differ:true", "Do not repeat the same wording after a rephrase request."),
    rule("rule-acknowledge", "signal_handling", "acknowledge_pending:true", "Acknowledge a pending signal before another question."),
    rule("rule-silence", "signal_handling", "silence_is_not_agreement:true", "Silence or delayed response is never agreement."),
  ],
  signals: [
    { id: "signal-yes", semanticMeaning: "yes", label: "Yes", description: "I mean yes.", expectedPartnerAction: "Acknowledge yes without adding meaning.", agentVisible: true },
    { id: "signal-no", semanticMeaning: "no", label: "No", description: "I mean no.", expectedPartnerAction: "Acknowledge no and do not pressure me.", agentVisible: true },
    { id: "signal-amber", semanticMeaning: "not_sure", label: "Amber — not sure", description: "I am not sure. Explain differently.", expectedPartnerAction: "Acknowledge uncertainty and explain differently.", agentVisible: true },
    { id: "signal-blue", semanticMeaning: "need_more_time", label: "Blue — more time", description: "I need more time.", expectedPartnerAction: "Wait without asking another question.", agentVisible: true },
    { id: "signal-purple", semanticMeaning: "need_information", label: "Purple — information", description: "I need more information.", expectedPartnerAction: "Give relevant information before another choice.", agentVisible: true },
    { id: "signal-rephrase", semanticMeaning: "rephrase", label: "Rephrase", description: "Say that differently.", expectedPartnerAction: "Use different literal wording without changing meaning.", agentVisible: true },
    { id: "signal-pause", semanticMeaning: "pause", label: "Pause", description: "Pause this rehearsal.", expectedPartnerAction: "Offer no new turns until I resume on the page.", agentVisible: true },
    { id: "signal-red", semanticMeaning: "stop", label: "Red — stop", description: "Stop this rehearsal.", expectedPartnerAction: "End this rehearsal immediately.", agentVisible: true },
  ],
  contexts: [{ id: contextId, label: "Community workshop", description: "Choosing a workshop time and reminder method.", agentVisible: true }],
  disclosures: [
    ...Array.from({ length: 10 }, (_, index) => ({ id: `disclosure-rule-${index + 1}`, fieldKind: "rule" as const, fieldId: `rule-${index + 1}`, agentVisible: true })),
    { id: "disclosure-context", fieldKind: "context", fieldId: contextId, agentVisible: true },
  ],
  privateNotes: "Never available to Site tools.",
  createdAt: now,
  updatedAt: now,
  reviewedAt: now,
};

export const mayaScenario: Scenario = {
  id: "scenario-community-workshop",
  title: "Choose a community-workshop plan",
  summary: "Choose between morning or afternoon, then choose a text or calendar reminder.",
  contextId,
  status: "approved",
  approvedAt: now,
  synthetic: true,
};

export const mayaSession: RehearsalSession = {
  id: "session-maya-demo",
  profileRevision: 1,
  profileHash: "0".repeat(64),
  sessionVersion: 1,
  scenarioId: mayaScenario.id,
  contextId,
  state: "active",
  events: [],
};

export const validMayaTurn: StructuredPartnerTurn = {
  segments: [{ kind: "question", text: "Would morning or afternoon work better?" }],
  intentTags: ["choice"],
  responseOptions: [
    { id: "option-morning", label: "Morning", value: "morning", preselected: false },
    { id: "option-afternoon", label: "Afternoon", value: "afternoon", preselected: false },
  ],
  channel: "text",
  responseTimerSeconds: null,
  meaningKey: "choose-workshop-time",
  rationale: "One short literal question with two options.",
};

export const allRequiredSignalMeanings = [
  "not_sure",
  "need_information",
  "need_more_time",
  "rephrase",
  "pause",
  "stop",
] as const;
