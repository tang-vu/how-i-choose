import { z } from "zod";

import { prepareAtomicRequest, type CommandDependencies } from "@/application/command-bus";
import type { WorkspaceIds } from "@/application/owner-workflow-service";
import { findActiveRuleConflicts } from "@/domain/conflict-engine";
import {
  RuleCategorySchema,
  RuleEffectSchema,
  RuleStrengthSchema,
  type CommunicationRule,
} from "@/domain/profile";
import type { RehearsalEvent } from "@/domain/rehearsal";
import { DisplayTextSchema, StableIdSchema } from "@/domain/schema";
import { transitionRehearsal } from "@/machine/rehearsal-machine";
import type { CommandResult, WorkspaceRepository } from "@/persistence/repository";

export const ProposedRuleSchema = z.object({
  operation: z.enum(["add", "update"]),
  targetRuleId: StableIdSchema.optional(),
  category: RuleCategorySchema,
  effect: RuleEffectSchema,
  strength: RuleStrengthSchema,
  contextIds: z.array(StableIdSchema).max(24),
  controlledValue: z.string().trim().min(1).max(120),
  displayText: DisplayTextSchema,
}).strict().superRefine((proposal, context) => {
  if (proposal.operation === "update" && !proposal.targetRuleId) {
    context.addIssue({ code: "custom", path: ["targetRuleId"], message: "An update requires a target rule ID." });
  }
  if (proposal.operation === "add" && proposal.targetRuleId) {
    context.addIssue({ code: "custom", path: ["targetRuleId"], message: "An addition cannot target an existing rule." });
  }
});

export const StageProtocolPatchCommandSchema = z.object({
  expectedProfileRevision: z.number().int().nonnegative(),
  expectedSessionVersion: z.number().int().positive(),
  idempotencyKey: StableIdSchema.max(128),
  proposedRules: z.array(ProposedRuleSchema).min(1).max(8),
  sourceRehearsalEventIds: z.array(StableIdSchema).min(1).max(50),
  rationale: z.string().trim().min(1).max(500),
}).strict();

export type StagedRuleDiff = {
  suggestionRuleId: string;
  operation: "add" | "update";
  targetRuleId: string | null;
  before: null | Pick<CommunicationRule, "category" | "effect" | "strength" | "contextIds" | "controlledValue" | "displayText">;
  after: Pick<CommunicationRule, "category" | "effect" | "strength" | "contextIds" | "controlledValue" | "displayText">;
};

export class ProposalService {
  constructor(
    private readonly repository: WorkspaceRepository,
    private readonly ids: WorkspaceIds,
    private readonly dependencies: CommandDependencies,
  ) {}

  async stageProtocolPatch(
    unchecked: z.input<typeof StageProtocolPatchCommandSchema>,
  ): Promise<CommandResult<{ patchId: string; diffs: StagedRuleDiff[]; activeConflicts: ReturnType<typeof findActiveRuleConflicts>; coverage: { activeRuleCount: number; signalMeaningCount: number } }>> {
    const command = StageProtocolPatchCommandSchema.parse(unchecked);
    const request = await prepareAtomicRequest({
      scope: "stage_protocol_patch",
      idempotencyKey: command.idempotencyKey,
      ...this.ids,
      expectedProfileRevision: command.expectedProfileRevision,
      expectedSessionVersion: command.expectedSessionVersion,
      source: "webmcp",
      toolName: "stage_protocol_patch",
    }, command, this.dependencies);
    return this.repository.runAtomicCommand<{ patchId: string; diffs: StagedRuleDiff[]; activeConflicts: ReturnType<typeof findActiveRuleConflicts>; coverage: { activeRuleCount: number; signalMeaningCount: number } }>(request, ({ profile, session }) => {
      if (!session.agentAccessEnabled) {
        return {
          accepted: false,
          code: "AGENT_ACCESS_DISABLED",
          violations: [{ code: "AGENT_ACCESS_DISABLED", message: "Human-only mode blocks Site tool access." }],
          nextActions: ["enable_agent_rehearsal_in_visible_ui"],
        };
      }
      const transition = transitionRehearsal(session.state, "stage_protocol_patch");
      if (!transition.ok) {
        return {
          accepted: false,
          code: "TOOL_NOT_AVAILABLE_IN_STATE",
          violations: [{ code: transition.code, message: "Protocol changes can be staged only after the person opens debrief." }],
          nextActions: session.state === "stopped" ? ["owner_open_debrief_in_visible_ui"] : [],
        };
      }
      const eventIds = new Set(session.events.map(({ id }) => id));
      const missingEventIds = command.sourceRehearsalEventIds.filter((id) => !eventIds.has(id));
      if (missingEventIds.length > 0) {
        return {
          accepted: false,
          code: "FIELD_NOT_SHARED",
          violations: missingEventIds.map((id) => ({ code: "SOURCE_EVENT_NOT_FOUND", message: `Source rehearsal event ${id} is not in this session.` })),
          nextActions: ["get_rehearsal_report"],
        };
      }
      const contextIds = new Set(profile.contexts.map(({ id }) => id));
      const invalidContextIds = command.proposedRules.flatMap(({ contextIds: ids }) => ids).filter((id) => !contextIds.has(id));
      if (invalidContextIds.length > 0) {
        return {
          accepted: false,
          code: "FIELD_NOT_SHARED",
          violations: invalidContextIds.map((id) => ({ code: "CONTEXT_NOT_FOUND", message: `Context ${id} is not part of this profile.` })),
          nextActions: ["get_rehearsal_brief"],
        };
      }
      const targets = new Set<string>();
      const missingTargets = command.proposedRules
        .filter(({ operation }) => operation === "update")
        .flatMap(({ targetRuleId }) => targetRuleId ? [targetRuleId] : [])
        .filter((id) => {
          if (targets.has(id)) return true;
          targets.add(id);
          return !profile.rules.some((rule) => rule.id === id && rule.status === "active");
        });
      if (missingTargets.length > 0) {
        return {
          accepted: false,
          code: "FIELD_NOT_SHARED",
          violations: missingTargets.map((id) => ({ code: "TARGET_RULE_NOT_FOUND", ruleIds: [id], message: `Active target rule ${id} is unavailable.` })),
          nextActions: ["get_rehearsal_brief"],
        };
      }

      const patchId = this.dependencies.id("patch");
      const now = this.dependencies.now();
      const suggestions = command.proposedRules.map((proposal, index): CommunicationRule => ({
        id: this.dependencies.id(`suggestion-${index + 1}`),
        status: "draft",
        category: proposal.category,
        effect: proposal.effect,
        strength: proposal.strength,
        contextIds: proposal.contextIds,
        controlledValue: proposal.controlledValue,
        displayText: proposal.displayText,
        agentVisible: false,
        provenance: {
          source: "agent_suggestion",
          sourceSessionId: session.id,
          sourcePatchId: patchId,
          sourceEventIds: command.sourceRehearsalEventIds,
          targetRuleId: proposal.targetRuleId,
        },
      }));
      const diffs = suggestions.map((suggestion, index): StagedRuleDiff => {
        const proposal = command.proposedRules[index]!;
        const target = proposal.targetRuleId ? profile.rules.find(({ id }) => id === proposal.targetRuleId) : undefined;
        return {
          suggestionRuleId: suggestion.id,
          operation: proposal.operation,
          targetRuleId: proposal.targetRuleId ?? null,
          before: target ? pickRuleFields(target) : null,
          after: pickRuleFields(suggestion),
        };
      });
      const prospectiveRules = [
        ...profile.rules.map((rule) => targets.has(rule.id) ? { ...rule, status: "retired" as const } : rule),
        ...suggestions.map((rule) => ({ ...rule, status: "active" as const })),
      ];
      const activeConflicts = findActiveRuleConflicts(prospectiveRules);
      const stagedEvent: RehearsalEvent = {
        id: this.dependencies.id("event"),
        sequence: session.events.length,
        at: now,
        actor: "agent",
        type: "protocol_patch_staged",
        patchId,
        sourceEventIds: command.sourceRehearsalEventIds,
      };
      const nextProfile = {
        ...profile,
        revision: profile.revision + 1,
        updatedAt: now,
        rules: [...profile.rules, ...suggestions],
      };
      const nextSession = {
        ...session,
        profileRevision: nextProfile.revision,
        sessionVersion: session.sessionVersion + 1,
        state: transition.state,
        events: [...session.events, stagedEvent],
      };
      return {
        accepted: true,
        profile: nextProfile,
        session: nextSession,
        data: {
          patchId,
          diffs,
          activeConflicts,
          coverage: {
            activeRuleCount: prospectiveRules.filter(({ status }) => status === "active").length,
            signalMeaningCount: new Set(profile.signals.map(({ semanticMeaning }) => semanticMeaning).filter((meaning) => meaning !== "custom")).size,
          },
        },
        changedIds: [profile.id, session.id, stagedEvent.id, patchId, ...suggestions.map(({ id }) => id)],
        violations: activeConflicts.map((conflict) => ({ code: "ACTIVE_RULE_CONFLICT", ruleIds: conflict.ruleIds, message: conflict.reason })),
        nextActions: ["owner_review_each_patch_item_in_visible_ui", "verify_support_guide"],
      };
    });
  }
}

function pickRuleFields(rule: CommunicationRule): StagedRuleDiff["after"] {
  return {
    category: rule.category,
    effect: rule.effect,
    strength: rule.strength,
    contextIds: [...rule.contextIds],
    controlledValue: rule.controlledValue,
    displayText: rule.displayText,
  };
}
