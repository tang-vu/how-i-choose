import { z } from "zod";

import { hashProfile, ratifyProfile } from "@/domain/canonicalize";
import type { CommunicationRule } from "@/domain/profile";
import type { RehearsalState } from "@/domain/rehearsal";
import { StableIdSchema } from "@/domain/schema";
import { transitionRehearsal } from "@/machine/rehearsal-machine";
import type { ProfileVersionRecord } from "@/persistence/db";
import type { CommandResult, WorkspaceRepository } from "@/persistence/repository";
import {
  prepareAtomicRequest,
  type CommandDependencies,
} from "@/application/command-bus";
import { mayaProfile, mayaScenario, mayaSession } from "@/fixtures/maya";
import { blankProfile, blankScenario, blankSession } from "@/fixtures/blank";

const ExpectedVersionsSchema = z.object({
  expectedProfileRevision: z.number().int().nonnegative(),
  expectedSessionVersion: z.number().int().positive(),
  idempotencyKey: StableIdSchema.max(128),
}).strict();

const UpdateRuleCommandSchema = ExpectedVersionsSchema.extend({
  ruleId: StableIdSchema,
  changes: z.object({
    displayText: z.string().trim().min(1).max(500).optional(),
    controlledValue: z.string().trim().min(1).max(120).optional(),
    status: z.enum(["draft", "active", "retired"]).optional(),
    agentVisible: z.boolean().optional(),
  }).strict().refine((value) => Object.keys(value).length > 0, "At least one rule change is required."),
}).strict();

const SelectSignalCommandSchema = ExpectedVersionsSchema.extend({
  signalId: StableIdSchema,
}).strict();

const SetDisclosureCommandSchema = ExpectedVersionsSchema.extend({
  fieldKind: z.enum(["rule", "signal", "context", "scenario_summary"]),
  fieldId: StableIdSchema,
  agentVisible: z.boolean(),
}).strict();

const AddSignalCommandSchema = ExpectedVersionsSchema.extend({
  label: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(500),
  expectedPartnerAction: z.string().trim().min(1).max(500),
  agentVisible: z.boolean(),
}).strict();

const UpdateTitleCommandSchema = ExpectedVersionsSchema.extend({
  title: z.string().trim().min(1).max(120),
}).strict();

export type WorkspaceIds = {
  profileId: string;
  sessionId: string;
  scenarioId: string;
};

export class OwnerWorkflowService {
  constructor(
    private readonly repository: WorkspaceRepository,
    private readonly ids: WorkspaceIds,
    private readonly dependencies: CommandDependencies,
  ) {}

  async resetSyntheticDemo(): Promise<void> {
    await this.resetTemplate(
      structuredClone(mayaProfile),
      structuredClone(mayaScenario),
      structuredClone(mayaSession),
    );
  }

  async resetBlankProfile(): Promise<void> {
    await this.resetTemplate(
      structuredClone(blankProfile),
      structuredClone(blankScenario),
      structuredClone(blankSession),
    );
  }

  private async resetTemplate(
    profile: typeof mayaProfile,
    scenario: typeof mayaScenario,
    sessionTemplate: typeof mayaSession,
  ): Promise<void> {
    const profileHash = await hashProfile(profile);
    const session = { ...sessionTemplate, profileHash };
    const profileVersion: ProfileVersionRecord | undefined = profile.ratifiedVersion
      ? {
          id: `${profile.id}:v${profile.ratifiedVersion}`,
          profileId: profile.id,
          ratifiedVersion: profile.ratifiedVersion,
          revision: profile.revision,
          hash: profileHash,
          ratifiedAt: profile.reviewedAt ?? profile.updatedAt,
          profile,
        }
      : undefined;
    await this.repository.resetWorkspace({
      profile,
      session,
      scenario,
      profileVersion,
    });
  }

  async updateProfileTitle(unchecked: z.input<typeof UpdateTitleCommandSchema>): Promise<CommandResult<{ profileId: string }>> {
    const command = UpdateTitleCommandSchema.parse(unchecked);
    return this.mutateProfile("owner_update_profile_title", command, (profile) => ({
      ...profile,
      title: command.title,
    }), { profileId: this.ids.profileId });
  }

  async setDisclosure(unchecked: z.input<typeof SetDisclosureCommandSchema>): Promise<CommandResult<{ fieldId: string; agentVisible: boolean }>> {
    const command = SetDisclosureCommandSchema.parse(unchecked);
    return this.mutateProfile("owner_set_disclosure", command, (profile) => {
      const index = profile.disclosures.findIndex(
        ({ fieldKind, fieldId }) => fieldKind === command.fieldKind && fieldId === command.fieldId,
      );
      const disclosure = {
        id: index >= 0 ? profile.disclosures[index]!.id : this.dependencies.id("disclosure"),
        fieldKind: command.fieldKind,
        fieldId: command.fieldId,
        agentVisible: command.agentVisible,
      };
      return {
        ...profile,
        disclosures:
          index >= 0
            ? profile.disclosures.with(index, disclosure)
            : [...profile.disclosures, disclosure],
      };
    }, { fieldId: command.fieldId, agentVisible: command.agentVisible });
  }

  async addCustomSignal(unchecked: z.input<typeof AddSignalCommandSchema>): Promise<CommandResult<{ signalId: string }>> {
    const command = AddSignalCommandSchema.parse(unchecked);
    const signalId = this.dependencies.id("signal-custom");
    return this.mutateProfile("owner_add_custom_signal", command, (profile) => ({
      ...profile,
      signals: [...profile.signals, {
        id: signalId,
        semanticMeaning: "custom" as const,
        label: command.label,
        description: command.description,
        expectedPartnerAction: command.expectedPartnerAction,
        agentVisible: command.agentVisible,
      }],
      disclosures: command.agentVisible
        ? [...profile.disclosures, {
            id: this.dependencies.id("disclosure"),
            fieldKind: "signal" as const,
            fieldId: signalId,
            agentVisible: true,
          }]
        : profile.disclosures,
    }), { signalId });
  }

  private async mutateProfile<T extends object>(
    scope: string,
    command: z.infer<typeof ExpectedVersionsSchema>,
    update: (profile: typeof mayaProfile) => typeof mayaProfile,
    data: T,
  ): Promise<CommandResult<T>> {
    const request = await prepareAtomicRequest({
      scope,
      idempotencyKey: command.idempotencyKey,
      ...this.ids,
      expectedProfileRevision: command.expectedProfileRevision,
      expectedSessionVersion: command.expectedSessionVersion,
      source: "owner_ui",
      toolName: scope,
    }, command, this.dependencies);
    return this.repository.runAtomicCommand<T>(request, ({ profile, session }) => {
      const now = this.dependencies.now();
      const nextProfile = {
        ...update(profile),
        revision: profile.revision + 1,
        updatedAt: now,
      };
      return {
        accepted: true,
        profile: nextProfile,
        session: {
          ...session,
          profileRevision: nextProfile.revision,
          sessionVersion: session.sessionVersion + 1,
        },
        data,
        changedIds: [profile.id, session.id, ...("fieldId" in data ? [String(data.fieldId)] : []), ...("signalId" in data ? [String(data.signalId)] : [])],
        nextActions: ["review_profile", "get_rehearsal_brief"],
      };
    });
  }

  async updateRule(unchecked: z.input<typeof UpdateRuleCommandSchema>): Promise<CommandResult<{ ruleId: string }>> {
    const command = UpdateRuleCommandSchema.parse(unchecked);
    const request = await prepareAtomicRequest({
      scope: "owner_update_rule",
      idempotencyKey: command.idempotencyKey,
      ...this.ids,
      expectedProfileRevision: command.expectedProfileRevision,
      expectedSessionVersion: command.expectedSessionVersion,
      source: "owner_ui",
      toolName: "owner_update_rule",
    }, command, this.dependencies);
    return this.repository.runAtomicCommand<{ ruleId: string }>(request, ({ profile, session }) => {
      const ruleIndex = profile.rules.findIndex(({ id }) => id === command.ruleId);
      if (ruleIndex < 0) {
        return {
          accepted: false,
          code: "FIELD_NOT_FOUND",
          nextActions: ["review_profile"],
          violations: [{ code: "FIELD_NOT_FOUND", message: "The rule no longer exists." }],
        };
      }
      const currentRule = profile.rules[ruleIndex]!;
      const nextRule: CommunicationRule = {
        ...currentRule,
        ...command.changes,
        provenance: { source: "person" },
      };
      const rules = profile.rules.with(ruleIndex, nextRule);
      const now = this.dependencies.now();
      const nextProfile = {
        ...profile,
        revision: profile.revision + 1,
        rules,
        updatedAt: now,
      };
      const nextSession = {
        ...session,
        profileRevision: nextProfile.revision,
        sessionVersion: session.sessionVersion + 1,
      };
      return {
        accepted: true,
        profile: nextProfile,
        session: nextSession,
        data: { ruleId: nextRule.id },
        changedIds: [nextRule.id, session.id],
        nextActions: ["review_profile", "get_rehearsal_brief"],
      };
    });
  }

  async selectSignal(unchecked: z.input<typeof SelectSignalCommandSchema>): Promise<CommandResult<{ eventId: string; meaning: string }>> {
    const command = SelectSignalCommandSchema.parse(unchecked);
    const request = await prepareAtomicRequest({
      scope: "owner_select_signal",
      idempotencyKey: command.idempotencyKey,
      ...this.ids,
      expectedProfileRevision: command.expectedProfileRevision,
      expectedSessionVersion: command.expectedSessionVersion,
      source: "owner_ui",
      toolName: "owner_select_signal",
    }, command, this.dependencies);
    return this.repository.runAtomicCommand<{ eventId: string; meaning: string }>(request, ({ profile, session }) => {
      const signal = profile.signals.find(({ id }) => id === command.signalId);
      if (!signal) {
        return {
          accepted: false,
          code: "FIELD_NOT_FOUND",
          nextActions: ["use_visible_signal_controls"],
          violations: [{ code: "FIELD_NOT_FOUND", message: "The signal no longer exists." }],
        };
      }
      if (
        session.state === "stopped" ||
        session.state === "complete" ||
        (session.state !== "active" && signal.semanticMeaning !== "stop")
      ) {
        return {
          accepted: false,
          code: session.state === "stopped" ? "SESSION_STOPPED" : "TOOL_NOT_AVAILABLE_IN_STATE",
          nextActions: [],
          violations: [{ code: "TOOL_NOT_AVAILABLE_IN_STATE", message: "This signal is not available in the current state." }],
        };
      }
      const eventId = this.dependencies.id("event");
      const now = this.dependencies.now();
      const signalEvent = {
        id: eventId,
        sequence: session.events.length,
        at: now,
        actor: "owner" as const,
        type: "signal_selected" as const,
        signalId: signal.id,
        meaning: signal.semanticMeaning,
        consumed: signal.semanticMeaning === "pause" || signal.semanticMeaning === "stop",
      };
      const events = [...session.events, signalEvent];
      let state: RehearsalState = session.state;
      if (signal.semanticMeaning === "pause") state = "paused";
      if (signal.semanticMeaning === "stop") state = "stopped";
      if (state !== session.state) {
        events.push({
          id: this.dependencies.id("event"),
          sequence: events.length,
          at: now,
          actor: "owner",
          type: "state_changed",
          from: session.state,
          to: state,
        });
      }
      const terminal = signal.semanticMeaning === "pause" || signal.semanticMeaning === "stop";
      const nextSession = {
        ...session,
        state,
        events,
        sessionVersion: session.sessionVersion + 1,
        pendingSignalEventId: terminal ? undefined : eventId,
      };
      return {
        accepted: true,
        session: nextSession,
        data: { eventId, meaning: signal.semanticMeaning },
        changedIds: [session.id, eventId],
        nextActions: signal.semanticMeaning === "stop" ? ["get_rehearsal_report"] : ["read_latest_signal"],
      };
    });
  }

  async resume(input: z.input<typeof ExpectedVersionsSchema>): Promise<CommandResult<{ state: string }>> {
    return this.changeSessionState("owner_resume", "owner_resume", input);
  }

  async submitScenarioForReview(input: z.input<typeof ExpectedVersionsSchema>): Promise<CommandResult<{ state: string }>> {
    return this.reviewScenario("owner_submit_scenario", "submit_scenario", input);
  }

  async approveScenario(input: z.input<typeof ExpectedVersionsSchema>): Promise<CommandResult<{ state: string }>> {
    return this.reviewScenario("owner_approve_scenario", "owner_approve_scenario", input);
  }

  private async reviewScenario(
    scope: string,
    action: "submit_scenario" | "owner_approve_scenario",
    unchecked: z.input<typeof ExpectedVersionsSchema>,
  ): Promise<CommandResult<{ state: string }>> {
    const command = ExpectedVersionsSchema.parse(unchecked);
    const request = await prepareAtomicRequest({
      scope,
      idempotencyKey: command.idempotencyKey,
      ...this.ids,
      expectedProfileRevision: command.expectedProfileRevision,
      expectedSessionVersion: command.expectedSessionVersion,
      source: "owner_ui",
      toolName: scope,
    }, command, this.dependencies);
    return this.repository.runAtomicCommand<{ state: string }>(request, ({ session, scenario }) => {
      const transition = transitionRehearsal(session.state, action);
      if (!transition.ok) {
        return {
          accepted: false,
          code: "TOOL_NOT_AVAILABLE_IN_STATE",
          nextActions: [],
          violations: [{ code: transition.code, message: "That review action is not available now." }],
        };
      }
      const now = this.dependencies.now();
      const eventId = this.dependencies.id("event");
      return {
        accepted: true,
        scenario: {
          ...scenario,
          status: action === "submit_scenario" ? "awaiting_owner_review" : "approved",
          approvedAt: action === "owner_approve_scenario" ? now : undefined,
        },
        session: {
          ...session,
          state: transition.state,
          sessionVersion: session.sessionVersion + 1,
          events: [...session.events, {
            id: eventId,
            sequence: session.events.length,
            at: now,
            actor: "owner",
            type: "state_changed",
            from: session.state,
            to: transition.state,
          }],
        },
        data: { state: transition.state },
        changedIds: [scenario.id, session.id, eventId],
        nextActions:
          transition.state === "ready" ? ["start_human_rehearsal", "start_approved_rehearsal"] : ["approve_scenario_in_ui"],
      };
    });
  }

  async startHumanRehearsal(input: z.input<typeof ExpectedVersionsSchema>): Promise<CommandResult<{ state: string }>> {
    return this.changeSessionState("owner_start_rehearsal", "start_approved_rehearsal", input);
  }

  private async changeSessionState(
    scope: string,
    action: "owner_resume" | "start_approved_rehearsal",
    unchecked: z.input<typeof ExpectedVersionsSchema>,
  ): Promise<CommandResult<{ state: string }>> {
    const command = ExpectedVersionsSchema.parse(unchecked);
    const request = await prepareAtomicRequest({
      scope,
      idempotencyKey: command.idempotencyKey,
      ...this.ids,
      expectedProfileRevision: command.expectedProfileRevision,
      expectedSessionVersion: command.expectedSessionVersion,
      source: "owner_ui",
      toolName: scope,
    }, command, this.dependencies);
    return this.repository.runAtomicCommand<{ state: string }>(request, ({ session, scenario }) => {
      if (action === "start_approved_rehearsal" && scenario.status !== "approved") {
        return {
          accepted: false,
          code: "OWNER_REVIEW_REQUIRED",
          nextActions: ["approve_scenario_in_ui"],
          violations: [{ code: "OWNER_REVIEW_REQUIRED", message: "The scenario needs visible owner approval." }],
        };
      }
      const transition = transitionRehearsal(session.state, action);
      if (!transition.ok) {
        return {
          accepted: false,
          code: session.state === "stopped" ? "SESSION_STOPPED" : "TOOL_NOT_AVAILABLE_IN_STATE",
          nextActions: [],
          violations: [{ code: transition.code, message: "That state transition is not allowed." }],
        };
      }
      const now = this.dependencies.now();
      const eventId = this.dependencies.id("event");
      const nextSession = {
        ...session,
        state: transition.state,
        sessionVersion: session.sessionVersion + 1,
        events: [...session.events, {
          id: eventId,
          sequence: session.events.length,
          at: now,
          actor: "owner" as const,
          type: "state_changed" as const,
          from: session.state,
          to: transition.state,
        }],
      };
      return {
        accepted: true,
        session: nextSession,
        data: { state: transition.state },
        changedIds: [session.id, eventId],
        nextActions: transition.state === "active" ? ["offer_partner_turn", "use_visible_signal_controls"] : [],
      };
    });
  }

  async ratify(unchecked: z.input<typeof ExpectedVersionsSchema>): Promise<CommandResult<{ ratifiedVersion: number; hash: string }>> {
    const command = ExpectedVersionsSchema.parse(unchecked);
    const current = await this.repository.readWorkspace(this.ids.profileId, this.ids.sessionId, this.ids.scenarioId);
    if (!current) throw new Error("WORKSPACE_NOT_FOUND");
    const now = this.dependencies.now();
    const ratified = await ratifyProfile(current.profile, now);
    const request = await prepareAtomicRequest({
      scope: "owner_ratify_profile",
      idempotencyKey: command.idempotencyKey,
      ...this.ids,
      expectedProfileRevision: command.expectedProfileRevision,
      expectedSessionVersion: command.expectedSessionVersion,
      source: "owner_ui",
      toolName: "owner_ratify_profile",
    }, command, this.dependencies);
    return this.repository.runAtomicCommand<{ ratifiedVersion: number; hash: string }>(request, ({ profile, session }) => {
      const unreviewed = profile.rules.filter(
        (rule) => rule.provenance.source === "agent_suggestion" && !rule.provenance.acceptedAt,
      );
      if (unreviewed.length > 0) {
        return {
          accepted: false,
          code: "OWNER_REVIEW_REQUIRED",
          nextActions: ["review_staged_patch"],
          violations: [{ code: "OWNER_REVIEW_REQUIRED", message: "Review every agent suggestion before ratifying." }],
        };
      }
      if (profile.revision !== current.profile.revision) {
        return {
          accepted: false,
          code: "STALE_PROFILE_REVISION",
          nextActions: ["review_profile"],
          violations: [],
        };
      }
      const ratifiedVersion = ratified.profile.ratifiedVersion ?? 1;
      const version: ProfileVersionRecord = {
        id: `${profile.id}:v${ratifiedVersion}`,
        profileId: profile.id,
        ratifiedVersion,
        revision: ratified.profile.revision,
        hash: ratified.hash,
        ratifiedAt: now,
        profile: ratified.profile,
      };
      const nextSession = {
        ...session,
        profileRevision: ratified.profile.revision,
        profileHash: ratified.hash,
        sessionVersion: session.sessionVersion + 1,
      };
      return {
        accepted: true,
        profile: ratified.profile,
        session: nextSession,
        profileVersion: version,
        data: { ratifiedVersion, hash: ratified.hash },
        changedIds: [profile.id, session.id, version.id],
        nextActions: ["verify_support_guide"],
      };
    });
  }
}
