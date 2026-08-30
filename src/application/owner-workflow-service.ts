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
    const profile = structuredClone(mayaProfile);
    const profileHash = await hashProfile(profile);
    const session = { ...structuredClone(mayaSession), profileHash };
    const profileVersion: ProfileVersionRecord = {
      id: `${profile.id}:v${profile.ratifiedVersion ?? 1}`,
      profileId: profile.id,
      ratifiedVersion: profile.ratifiedVersion ?? 1,
      revision: profile.revision,
      hash: profileHash,
      ratifiedAt: profile.reviewedAt ?? profile.updatedAt,
      profile,
    };
    await this.repository.resetWorkspace({
      profile,
      session,
      scenario: structuredClone(mayaScenario),
      profileVersion,
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
