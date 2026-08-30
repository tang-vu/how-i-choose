import {
  activeRulesForContext,
  isFieldDisclosed,
  type CommunicationProfile,
} from "@/domain/profile";
import type { RehearsalSession } from "@/domain/rehearsal";
import type { Scenario } from "@/domain/scenario";

export type AgentProfileProjection = {
  profileId: string;
  profileRevision: number;
  sharedFieldCount: number;
  totalFieldCount: number;
  activeContext: null | {
    id: string;
    label: string;
    description: string;
    authorship: "person" | "template";
  };
  rules: Array<{
    id: string;
    category: string;
    effect: string;
    strength: string;
    controlledValue: string;
    displayText: string;
    authorship: "person" | "agent_suggestion" | "template";
  }>;
  signals: Array<{
    id: string;
    semanticMeaning: string;
    label: string;
    description: string;
    expectedPartnerAction: string;
    authorship: "person";
  }>;
  scenario: null | {
    id: string;
    title: string;
    summary: string;
    authorship: "person" | "template";
  };
};

export function buildAgentProfileProjection(
  profile: CommunicationProfile,
  session: Pick<RehearsalSession, "contextId">,
  scenario: Scenario,
): AgentProfileProjection {
  const context = profile.contexts.find(({ id }) => id === session.contextId);
  const rules = activeRulesForContext(profile, session.contextId)
    .filter(
      (rule) =>
        rule.agentVisible && isFieldDisclosed(profile, "rule", rule.id),
    )
    .map((rule) => ({
      id: rule.id,
      category: rule.category,
      effect: rule.effect,
      strength: rule.strength,
      controlledValue: rule.controlledValue,
      displayText: rule.displayText,
      authorship: rule.provenance.source,
    }));
  const signals = profile.signals
    .filter(
      (signal) =>
        signal.agentVisible && isFieldDisclosed(profile, "signal", signal.id),
    )
    .map((signal) => ({
      id: signal.id,
      semanticMeaning: signal.semanticMeaning,
      label: signal.label,
      description: signal.description,
      expectedPartnerAction: signal.expectedPartnerAction,
      authorship: "person" as const,
    }));
  const activeContext =
    context?.agentVisible && isFieldDisclosed(profile, "context", context.id)
      ? {
          id: context.id,
          label: context.label,
          description: context.description,
          authorship: "person" as const,
        }
      : null;
  const visibleScenario = isFieldDisclosed(profile, "scenario_summary", scenario.id)
    ? {
        id: scenario.id,
        title: scenario.title,
        summary: scenario.summary,
        authorship: "person" as const,
      }
    : null;
  const totalFieldCount =
    profile.rules.length + profile.signals.length + profile.contexts.length + 1;
  return {
    profileId: profile.id,
    profileRevision: profile.revision,
    sharedFieldCount:
      rules.length + signals.length + Number(activeContext !== null) + Number(visibleScenario !== null),
    totalFieldCount,
    activeContext,
    rules,
    signals,
    scenario: visibleScenario,
  };
}
