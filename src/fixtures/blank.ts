import type { CommunicationProfile } from "@/domain/profile";
import type { RehearsalSession } from "@/domain/rehearsal";
import type { Scenario } from "@/domain/scenario";

const createdAt = "2026-08-31T00:00:00.000Z";

export const blankProfile: CommunicationProfile = {
  schemaVersion: 1,
  id: "profile-maya",
  title: "Untitled communication profile",
  revision: 0,
  ratifiedVersion: null,
  rules: [],
  signals: [
    { id: "signal-yes", semanticMeaning: "yes", label: "Yes", description: "I mean yes.", expectedPartnerAction: "Acknowledge yes without adding meaning.", agentVisible: false },
    { id: "signal-no", semanticMeaning: "no", label: "No", description: "I mean no.", expectedPartnerAction: "Acknowledge no and do not pressure me.", agentVisible: false },
    { id: "signal-unsure", semanticMeaning: "not_sure", label: "Not sure", description: "I am not sure.", expectedPartnerAction: "Acknowledge uncertainty and explain differently.", agentVisible: false },
    { id: "signal-information", semanticMeaning: "need_information", label: "More information", description: "I need more information.", expectedPartnerAction: "Give relevant information before another choice.", agentVisible: false },
    { id: "signal-more-time", semanticMeaning: "need_more_time", label: "More time", description: "I need more time.", expectedPartnerAction: "Wait without asking another question.", agentVisible: false },
    { id: "signal-rephrase", semanticMeaning: "rephrase", label: "Rephrase", description: "Say that differently.", expectedPartnerAction: "Use different wording without changing meaning.", agentVisible: false },
    { id: "signal-pause", semanticMeaning: "pause", label: "Pause", description: "Pause this rehearsal.", expectedPartnerAction: "Offer no new turns until I resume on the page.", agentVisible: false },
    { id: "signal-stop", semanticMeaning: "stop", label: "Stop", description: "Stop this rehearsal.", expectedPartnerAction: "End this rehearsal immediately.", agentVisible: false },
  ],
  contexts: [{ id: "practice-context", label: "Practice context", description: "Describe a low-stakes context.", agentVisible: false }],
  disclosures: [],
  createdAt,
  updatedAt: createdAt,
};

export const blankScenario: Scenario = {
  id: "scenario-community-workshop",
  title: "Untitled low-stakes scenario",
  summary: "Describe a low-stakes communication choice before rehearsal.",
  contextId: "practice-context",
  status: "draft",
  synthetic: false,
};

export const blankSession: RehearsalSession = {
  id: "session-maya-demo",
  profileRevision: 0,
  profileHash: "0".repeat(64),
  sessionVersion: 1,
  scenarioId: blankScenario.id,
  contextId: "practice-context",
  state: "scenario_draft",
  events: [],
};
