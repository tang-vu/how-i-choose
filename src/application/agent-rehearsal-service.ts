import { z } from "zod";

import { activeRulesForContext } from "@/domain/profile";
import { StableIdSchema } from "@/domain/schema";
import {
  StructuredPartnerTurnSchema,
  type RehearsalEvent,
} from "@/domain/rehearsal";
import { validatePartnerTurn } from "@/domain/turn-validator";
import { transitionRehearsal } from "@/machine/rehearsal-machine";
import type { CommandResult, WorkspaceRepository } from "@/persistence/repository";
import {
  prepareAtomicRequest,
  type CommandDependencies,
} from "@/application/command-bus";
import type { WorkspaceIds } from "@/application/owner-workflow-service";

const ExpectedVersionsSchema = z.object({
  expectedProfileRevision: z.number().int().nonnegative(),
  expectedSessionVersion: z.number().int().positive(),
  idempotencyKey: StableIdSchema.max(128),
}).strict();

const OfferPartnerTurnCommandSchema = ExpectedVersionsSchema.extend({
  turn: StructuredPartnerTurnSchema,
}).strict();

export class AgentRehearsalService {
  constructor(
    private readonly repository: WorkspaceRepository,
    private readonly ids: WorkspaceIds,
    private readonly dependencies: CommandDependencies,
    private readonly source: "webmcp" | "owner_ui" = "webmcp",
  ) {}

  async startApprovedRehearsal(
    unchecked: z.input<typeof ExpectedVersionsSchema>,
  ): Promise<CommandResult<{ state: string }>> {
    const command = ExpectedVersionsSchema.parse(unchecked);
    const request = await prepareAtomicRequest({
      scope: "start_approved_rehearsal",
      idempotencyKey: command.idempotencyKey,
      ...this.ids,
      expectedProfileRevision: command.expectedProfileRevision,
      expectedSessionVersion: command.expectedSessionVersion,
      source: this.source,
      toolName: "start_approved_rehearsal",
    }, command, this.dependencies);
    return this.repository.runAtomicCommand<{ state: string }>(request, ({ session, scenario }) => {
      if (scenario.status !== "approved") {
        return {
          accepted: false,
          code: "OWNER_REVIEW_REQUIRED",
          nextActions: ["approve_scenario_in_ui"],
          violations: [{ code: "OWNER_REVIEW_REQUIRED", message: "The person must approve this scenario in the visible page." }],
        };
      }
      const transition = transitionRehearsal(session.state, "start_approved_rehearsal");
      if (!transition.ok) {
        return {
          accepted: false,
          code: session.state === "stopped" ? "SESSION_STOPPED" : "TOOL_NOT_AVAILABLE_IN_STATE",
          nextActions: [],
          violations: [{ code: transition.code, message: "The approved rehearsal cannot start from this state." }],
        };
      }
      const eventId = this.dependencies.id("event");
      const event: RehearsalEvent = {
        id: eventId,
        sequence: session.events.length,
        at: this.dependencies.now(),
        actor: "agent",
        type: "state_changed",
        from: session.state,
        to: transition.state,
      };
      return {
        accepted: true,
        session: {
          ...session,
          state: transition.state,
          sessionVersion: session.sessionVersion + 1,
          events: [...session.events, event],
        },
        data: { state: transition.state },
        changedIds: [session.id, eventId],
        nextActions: ["offer_partner_turn", "read_latest_signal"],
      };
    });
  }

  async offerPartnerTurn(
    unchecked: z.input<typeof OfferPartnerTurnCommandSchema>,
  ): Promise<CommandResult<{ eventId: string; visible: true }>> {
    const command = OfferPartnerTurnCommandSchema.parse(unchecked);
    const request = await prepareAtomicRequest({
      scope: "offer_partner_turn",
      idempotencyKey: command.idempotencyKey,
      ...this.ids,
      expectedProfileRevision: command.expectedProfileRevision,
      expectedSessionVersion: command.expectedSessionVersion,
      source: this.source,
      toolName: "offer_partner_turn",
    }, command, this.dependencies);
    return this.repository.runAtomicCommand<{ eventId: string; visible: true }>(request, ({ profile, session }) => {
      const pending = session.pendingSignalEventId
        ? session.events.find(
            (event) => event.id === session.pendingSignalEventId && event.type === "signal_selected",
          )
        : undefined;
      const previousAccepted = session.events.findLast(
        (event) => event.type === "partner_turn_accepted",
      );
      const activeRules = activeRulesForContext(profile, session.contextId);
      const validation = validatePartnerTurn(command.turn, {
        activeRules,
        session,
        pendingSignal: pending?.type === "signal_selected"
          ? { eventId: pending.id, meaning: pending.meaning }
          : undefined,
        availableSignalMeanings: profile.signals.map(({ semanticMeaning }) => semanticMeaning),
        previousAcceptedTurn:
          previousAccepted?.type === "partner_turn_accepted" ? previousAccepted.turn : undefined,
      });
      if (!validation.valid) {
        const recordViolation = session.state === "active";
        const eventId = recordViolation ? this.dependencies.id("event") : null;
        const rejectedEvent: RehearsalEvent | null = eventId ? {
          id: eventId,
          sequence: session.events.length,
          at: this.dependencies.now(),
          actor: "agent",
          type: "partner_turn_rejected",
          violationCodes: validation.violations.map(({ code }) => code),
          ruleIds: validation.violations.flatMap(({ ruleIds }) => ruleIds).filter((id, index, all) => all.indexOf(id) === index),
        } : null;
        return {
          accepted: false,
          code:
            session.state === "paused"
              ? "SESSION_PAUSED"
              : session.state === "stopped"
                ? "SESSION_STOPPED"
                : validation.violations.some(({ code }) => code === "PENDING_SIGNAL_UNACKNOWLEDGED")
                  ? "PENDING_SIGNAL_UNACKNOWLEDGED"
                  : "INVALID_PARTNER_TURN",
          nextActions: session.state === "active" ? ["repair_partner_turn"] : [],
          ...(rejectedEvent ? {
            session: {
              ...session,
              sessionVersion: session.sessionVersion + 1,
              events: [...session.events, rejectedEvent],
            },
            changedIds: [session.id, rejectedEvent.id],
          } : {}),
          violations: validation.violations.map(({ code, ruleIds, message, repair }) => ({
            code,
            ruleIds,
            message,
            repair,
          })),
        };
      }
      const now = this.dependencies.now();
      const appended: RehearsalEvent[] = [];
      if (pending && command.turn.acknowledgesSignalEventId === pending.id) {
        appended.push({
          id: this.dependencies.id("event"),
          sequence: session.events.length,
          at: now,
          actor: "agent",
          type: "signal_acknowledged",
          signalEventId: pending.id,
        });
      }
      const repaired = session.events.findLast((event) => event.type === "partner_turn_rejected");
      const eventId = this.dependencies.id("event");
      appended.push({
        id: eventId,
        sequence: session.events.length + appended.length,
        at: now,
        actor: "agent",
        type: "partner_turn_accepted",
        turn: command.turn,
        ruleIds: validation.appliedRuleIds,
        repairedViolationEventIds:
          repaired?.type === "partner_turn_rejected" ? [repaired.id] : [],
      });
      return {
        accepted: true,
        session: {
          ...session,
          sessionVersion: session.sessionVersion + 1,
          events: [...session.events, ...appended],
          pendingSignalEventId: pending ? undefined : session.pendingSignalEventId,
        },
        data: { eventId, visible: true as const },
        changedIds: [session.id, ...appended.map(({ id }) => id)],
        nextActions: ["read_latest_signal", "get_rehearsal_report"],
      };
    });
  }

  async readLatestSignal() {
    const workspace = await this.repository.readWorkspace(
      this.ids.profileId,
      this.ids.sessionId,
      this.ids.scenarioId,
    );
    if (!workspace) return null;
    const acknowledged = new Set(
      workspace.session.events
        .filter((event) => event.type === "signal_acknowledged")
        .map(({ signalEventId }) => signalEventId),
    );
    return workspace.session.events.findLast(
      (event) => event.type === "signal_selected" && !acknowledged.has(event.id),
    ) ?? null;
  }
}
