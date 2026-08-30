import { activeRulesForContext, isFieldDisclosed } from "@/domain/profile";
import { findActiveRuleConflicts } from "@/domain/conflict-engine";
import { buildAgentProfileProjection } from "@/domain/provenance";
import { buildRehearsalReport } from "@/domain/report-engine";
import { allRequiredSignalMeanings } from "@/fixtures/maya";
import type { ActivityReceipt } from "@/persistence/db";
import type { CommandResult, WorkspaceRepository, WorkspaceSnapshot } from "@/persistence/repository";
import type { CommandDependencies } from "@/application/command-bus";
import type { WorkspaceIds } from "@/application/owner-workflow-service";

const guideBoundary = "Ask me directly whenever possible. This guide explains how to communicate with me. It is not consent, a capacity assessment, an advance directive, or medical authorization.";

export class RehearsalQueryService {
  constructor(
    private readonly repository: WorkspaceRepository,
    private readonly ids: WorkspaceIds,
    private readonly dependencies: CommandDependencies,
    private readonly source: ActivityReceipt["source"] = "webmcp",
  ) {}

  async getBrief() {
    return this.read("get_rehearsal_brief", async (workspace) => {
      const projection = buildAgentProfileProjection(workspace.profile, workspace.session, workspace.scenario);
      if (projection.sharedFieldCount === 0) {
        return { code: "AGENT_ACCESS_DISABLED", data: null, violations: [{ code: "AGENT_ACCESS_DISABLED", message: "No fields are shared with the active agent." }], nextActions: ["enable_fields_in_visible_ui"] };
      }
      const pending = workspace.session.pendingSignalEventId
        ? workspace.session.events.find((event) => event.id === workspace.session.pendingSignalEventId && event.type === "signal_selected")
        : undefined;
      const pendingDefinition = pending?.type === "signal_selected"
        ? workspace.profile.signals.find(({ id }) => id === pending.signalId)
        : undefined;
      const pendingShared = pendingDefinition
        ? pendingDefinition.agentVisible && isFieldDisclosed(workspace.profile, "signal", pendingDefinition.id)
        : false;
      return {
        code: "OK",
        data: {
          profileRevision: workspace.profile.revision,
          profileHash: workspace.session.profileHash,
          sessionState: workspace.session.state,
          sessionVersion: workspace.session.sessionVersion,
          activeContext: projection.activeContext,
          communicationRules: projection.rules,
          signalMeanings: projection.signals,
          scenario: projection.scenario,
          pendingSignal: pending
            ? { exists: true, shared: pendingShared, eventId: pendingShared ? pending.id : null, meaning: pendingShared && pending.type === "signal_selected" ? pending.meaning : null }
            : { exists: false, shared: false, eventId: null, meaning: null },
          disclosure: { sharedFields: projection.sharedFieldCount, totalFields: projection.totalFieldCount },
          validNextActions: this.validAgentActions(workspace),
        },
        violations: [],
        nextActions: this.validAgentActions(workspace),
      };
    });
  }

  async auditReadiness(expectedProfileRevision: number, scenarioId: string) {
    return this.read("audit_rehearsal_readiness", async (workspace) => {
      if (workspace.profile.revision !== expectedProfileRevision) {
        return { code: "STALE_PROFILE_REVISION", data: null, violations: [], nextActions: ["get_rehearsal_brief"] };
      }
      if (workspace.scenario.id !== scenarioId) {
        return { code: "TOOL_NOT_AVAILABLE_IN_STATE", data: null, violations: [{ code: "SCENARIO_NOT_ACTIVE", message: "That scenario is not the active local rehearsal." }], nextActions: ["get_rehearsal_brief"] };
      }
      const activeRules = activeRulesForContext(workspace.profile, workspace.session.contextId);
      const conflicts = findActiveRuleConflicts(activeRules);
      const missingRequirements: string[] = [];
      if (activeRules.length === 0) missingRequirements.push("ACTIVE_COMMUNICATION_RULE");
      for (const meaning of allRequiredSignalMeanings) {
        if (!workspace.profile.signals.some((signal) => signal.semanticMeaning === meaning)) {
          missingRequirements.push(`SIGNAL_${meaning.toUpperCase()}`);
        }
      }
      const disclosureGaps = [
        ...activeRules.filter((rule) => !rule.agentVisible || !isFieldDisclosed(workspace.profile, "rule", rule.id)).map((rule) => ({ fieldKind: "rule" as const, fieldId: rule.id })),
        ...workspace.profile.signals.filter((signal) => !signal.agentVisible || !isFieldDisclosed(workspace.profile, "signal", signal.id)).map((signal) => ({ fieldKind: "signal" as const, fieldId: signal.id })),
        ...(!isFieldDisclosed(workspace.profile, "scenario_summary", workspace.scenario.id) ? [{ fieldKind: "scenario_summary" as const, fieldId: workspace.scenario.id }] : []),
      ];
      const readyForOwnerReview = missingRequirements.length === 0 && conflicts.length === 0;
      return {
        code: "OK",
        data: {
          scenarioId,
          scenarioStatus: workspace.scenario.status,
          missingRequirements,
          activeConflicts: conflicts,
          disclosureGaps,
          readyForOwnerReview,
          approvedForAgentStart: readyForOwnerReview && workspace.scenario.status === "approved" && workspace.session.state === "ready",
        },
        violations: conflicts.map((conflict) => ({ code: "ACTIVE_RULE_CONFLICT", ruleIds: conflict.ruleIds, message: conflict.reason })),
        nextActions: workspace.scenario.status === "approved" && workspace.session.state === "ready" ? ["start_approved_rehearsal"] : ["owner_review_in_visible_ui"],
      };
    });
  }

  async readLatestSignal() {
    return this.read<{ signal: null | { eventId: string; signalId: string; meaning: string; label: string; description: string; expectedPartnerAction: string; authorship: "person" } }>("read_latest_signal", async (workspace) => {
      const acknowledged = new Set(workspace.session.events.filter((event) => event.type === "signal_acknowledged").map(({ signalEventId }) => signalEventId));
      const event = workspace.session.events.findLast((candidate) => candidate.type === "signal_selected" && !candidate.consumed && !acknowledged.has(candidate.id));
      if (!event || event.type !== "signal_selected") {
        return { code: "OK", data: { signal: null }, violations: [], nextActions: this.validAgentActions(workspace) };
      }
      const definition = workspace.profile.signals.find(({ id }) => id === event.signalId);
      if (!definition?.agentVisible || !isFieldDisclosed(workspace.profile, "signal", event.signalId)) {
        return { code: "FIELD_NOT_SHARED", data: null, violations: [{ code: "FIELD_NOT_SHARED", message: "The selected signal is not exposed to the active agent." }], nextActions: ["wait_for_visible_owner_action"] };
      }
      return {
        code: "OK",
        data: {
          signal: {
            eventId: event.id,
            signalId: event.signalId,
            meaning: event.meaning,
            label: definition.label,
            description: definition.description,
            expectedPartnerAction: definition.expectedPartnerAction,
            authorship: "person" as const,
          },
        },
        violations: [],
        nextActions: ["offer_partner_turn"],
      };
    });
  }

  async getReport() {
    return this.read("get_rehearsal_report", async (workspace) => {
      const baseReport = buildRehearsalReport(workspace.session, this.dependencies.now());
      const receipts = await this.repository.listReceipts();
      const staleReceipt = receipts.find(({ code, source }) => source === "webmcp" && (code === "STALE_PROFILE_REVISION" || code === "STALE_SESSION_VERSION"));
      const recoveredReceipt = staleReceipt
        ? receipts.find(({ toolName, code, completedAt }) => toolName === "get_rehearsal_brief" && code === "OK" && completedAt >= staleReceipt.completedAt)
        : undefined;
      const report = recoveredReceipt && staleReceipt
        ? {
            ...baseReport,
            entries: [...baseReport.entries, {
              id: `report-revision-${staleReceipt.id}`,
              category: "revision_conflict_recovered" as const,
              label: "The agent reread current revisions after a stale write",
              evidenceEventIds: [],
              ruleIds: [],
            }],
          }
        : baseReport;
      return {
        code: "OK",
        data: {
          subject: "communication_partner_adherence" as const,
          report,
          repairedViolationEvidenceIds: report.entries.filter(({ category }) => category === "violation_repaired").flatMap(({ evidenceEventIds }) => evidenceEventIds),
          unresolvedItems: report.entries.filter(({ category }) => category === "signal_still_unresolved"),
          revisionRecoveryReceiptIds: recoveredReceipt && staleReceipt ? [staleReceipt.id, recoveredReceipt.id] : [],
        },
        violations: [],
        nextActions: this.validAgentActions(workspace),
      };
    });
  }

  async verifySupportGuide() {
    return this.read("verify_support_guide", async (workspace) => {
      const versions = await this.repository.listProfileVersions(workspace.profile.id);
      const latest = versions.at(-1);
      const activeRules = activeRulesForContext(workspace.profile, workspace.session.contextId);
      const sourceRuleIds = activeRules.map(({ id }) => id);
      const sourceSignalIds = workspace.profile.signals.map(({ id }) => id);
      const staleProfileRevision = Boolean(latest && latest.revision !== workspace.profile.revision);
      const draftWatermarkRequired = !latest || staleProfileRevision;
      return {
        code: "OK",
        data: {
          guideProfileRevision: workspace.profile.revision,
          latestRatifiedRevision: latest?.revision ?? null,
          sourceRuleIds,
          sourceSignalIds,
          omittedRequiredRuleIds: [],
          unattributedOrInferredStatements: [],
          requiredBoundaryStatement: guideBoundary,
          staleProfileRevision,
          draftWatermarkRequired,
          derivationValid: true,
        },
        violations: [],
        nextActions: draftWatermarkRequired ? ["owner_review_and_ratify_in_visible_ui"] : ["print_in_visible_ui"],
      };
    });
  }

  async invalidInput(toolName: string, violations: Array<{ code: string; message: string }>) {
    return this.read(toolName, async () => ({ code: "INVALID_TOOL_INPUT", data: null, violations, nextActions: ["repair_tool_input"] }));
  }

  private validAgentActions(workspace: WorkspaceSnapshot): string[] {
    const actions = ["get_rehearsal_brief", "audit_rehearsal_readiness", "get_rehearsal_report", "verify_support_guide"];
    if (workspace.session.state === "ready" && workspace.scenario.status === "approved") actions.push("start_approved_rehearsal");
    if (workspace.session.state === "active") {
      actions.push("read_latest_signal");
      if (!workspace.session.pendingSignalEventId) actions.push("offer_partner_turn");
      else actions.push("offer_partner_turn_acknowledging_signal");
    }
    if (workspace.session.state === "debrief") actions.push("stage_protocol_patch");
    return actions.toSorted();
  }

  private async read<T>(
    toolName: string,
    operation: (workspace: WorkspaceSnapshot) => Promise<{ code: string; data: T | null; violations: Array<{ code: string; message: string; ruleIds?: string[] }>; nextActions: string[] }>,
  ): Promise<CommandResult<T>> {
    const startedAt = this.dependencies.now();
    const workspace = await this.repository.readWorkspace(this.ids.profileId, this.ids.sessionId, this.ids.scenarioId);
    const receiptId = this.dependencies.id("receipt");
    if (!workspace) throw new Error("WORKSPACE_NOT_FOUND");
    const outcome = await operation(workspace);
    const completedAt = this.dependencies.now();
    const activity: ActivityReceipt = {
      id: receiptId,
      source: this.source,
      toolName,
      startedAt,
      completedAt,
      durationMs: Math.max(0, new Date(completedAt).getTime() - new Date(startedAt).getTime()),
      code: outcome.code,
      profileRevision: workspace.profile.revision,
      sessionVersion: workspace.session.sessionVersion,
      changedIds: [],
      correlationId: this.dependencies.id("correlation"),
    };
    await this.repository.recordActivityReceipt(activity);
    return {
      ok: outcome.code === "OK",
      code: outcome.code,
      profileRevision: workspace.profile.revision,
      sessionVersion: workspace.session.sessionVersion,
      profileHash: workspace.session.profileHash,
      receiptId,
      data: outcome.data,
      violations: outcome.violations,
      changedIds: [],
      nextActions: outcome.nextActions,
      replayed: false,
    };
  }
}
