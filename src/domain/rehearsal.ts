import { z } from "zod";

import {
  DisplayTextSchema,
  IsoDateSchema,
  MAX_EVENTS,
  PositiveVersionSchema,
  RevisionSchema,
  ShortTextSchema,
  StableIdSchema,
  assertUniqueIds,
} from "@/domain/schema";
import { SignalMeaningSchema } from "@/domain/signals";

export const RehearsalStateSchema = z.enum([
  "scenario_draft",
  "awaiting_owner_review",
  "ready",
  "active",
  "paused",
  "stopped",
  "debrief",
  "protocol_patch_staged",
  "owner_review",
  "complete",
]);

export const TurnSegmentSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("statement"), text: DisplayTextSchema }).strict(),
  z.object({ kind: z.literal("question"), text: DisplayTextSchema }).strict(),
]);

export const ResponseOptionSchema = z.object({
  id: StableIdSchema,
  label: ShortTextSchema,
  value: z.string().trim().min(1).max(120),
  preselected: z.boolean().default(false),
}).strict();

export const PartnerIntentSchema = z.enum([
  "choice",
  "acknowledge",
  "clarify",
  "rephrase",
  "provide_information",
  "interpret_as_yes",
  "interpret_as_no",
]);

export const StructuredPartnerTurnSchema = z.object({
  segments: z.array(TurnSegmentSchema).min(1).max(12),
  intentTags: z.array(PartnerIntentSchema).min(1).max(8),
  responseOptions: z.array(ResponseOptionSchema).max(6).superRefine(assertUniqueIds),
  channel: z.enum(["text", "speech", "aac", "gesture"]),
  responseTimerSeconds: z.number().int().positive().max(3_600).nullable().optional(),
  acknowledgesSignalEventId: StableIdSchema.optional(),
  meaningKey: z.string().trim().min(1).max(120).optional(),
  rationale: z.string().trim().min(1).max(240).optional(),
}).strict();

const BaseEventSchema = z.object({
  id: StableIdSchema,
  sequence: z.number().int().nonnegative().max(MAX_EVENTS),
  at: IsoDateSchema,
  actor: z.enum(["owner", "agent", "partner", "system"]),
});

export const RehearsalEventSchema = z.discriminatedUnion("type", [
  BaseEventSchema.extend({
    type: z.literal("state_changed"),
    from: RehearsalStateSchema,
    to: RehearsalStateSchema,
  }).strict(),
  BaseEventSchema.extend({
    type: z.literal("partner_turn_accepted"),
    turn: StructuredPartnerTurnSchema,
    ruleIds: z.array(StableIdSchema).max(80),
    repairedViolationEventIds: z.array(StableIdSchema).max(24),
  }).strict(),
  BaseEventSchema.extend({
    type: z.literal("partner_turn_rejected"),
    violationCodes: z.array(ShortTextSchema).min(1).max(24),
    ruleIds: z.array(StableIdSchema).max(80),
  }).strict(),
  BaseEventSchema.extend({
    type: z.literal("signal_selected"),
    signalId: StableIdSchema,
    meaning: SignalMeaningSchema,
    consumed: z.boolean(),
  }).strict(),
  BaseEventSchema.extend({
    type: z.literal("signal_acknowledged"),
    signalEventId: StableIdSchema,
  }).strict(),
  BaseEventSchema.extend({
    type: z.literal("protocol_patch_staged"),
    patchId: StableIdSchema,
    sourceEventIds: z.array(StableIdSchema).min(1).max(50),
  }).strict(),
  BaseEventSchema.extend({
    type: z.literal("patch_reviewed"),
    patchId: StableIdSchema,
    outcome: z.enum(["accepted", "rejected", "rewritten"]),
  }).strict(),
]);

export const ReportCategorySchema = z.enum([
  "rule_respected",
  "rule_violated",
  "violation_repaired",
  "signal_acknowledged",
  "signal_still_unresolved",
  "session_paused",
  "stop_honored",
  "revision_conflict_recovered",
  "needs_human_review",
]);

export const RehearsalReportEntrySchema = z.object({
  id: StableIdSchema,
  category: ReportCategorySchema,
  label: ShortTextSchema,
  evidenceEventIds: z.array(StableIdSchema).max(100),
  ruleIds: z.array(StableIdSchema).max(80),
}).strict();

export const RehearsalReportSchema = z.object({
  generatedAt: IsoDateSchema,
  profileRevision: RevisionSchema,
  sessionVersion: PositiveVersionSchema,
  entries: z.array(RehearsalReportEntrySchema).max(500),
  unresolvedSignalEventIds: z.array(StableIdSchema).max(100),
  needsHumanReview: z.boolean(),
}).strict();

export const RehearsalSessionSchema = z.object({
  id: StableIdSchema,
  profileRevision: RevisionSchema,
  profileHash: z.string().regex(/^[a-f0-9]{64}$/),
  sessionVersion: PositiveVersionSchema,
  scenarioId: StableIdSchema,
  contextId: StableIdSchema,
  agentAccessEnabled: z.boolean().default(false),
  state: RehearsalStateSchema,
  events: z.array(RehearsalEventSchema).max(MAX_EVENTS).superRefine(assertUniqueIds),
  pendingSignalEventId: StableIdSchema.optional(),
  report: RehearsalReportSchema.optional(),
}).strict();

export type RehearsalState = z.infer<typeof RehearsalStateSchema>;
export type TurnSegment = z.infer<typeof TurnSegmentSchema>;
export type ResponseOption = z.infer<typeof ResponseOptionSchema>;
export type PartnerIntent = z.infer<typeof PartnerIntentSchema>;
export type StructuredPartnerTurn = z.infer<typeof StructuredPartnerTurnSchema>;
export type RehearsalEvent = z.infer<typeof RehearsalEventSchema>;
export type ReportCategory = z.infer<typeof ReportCategorySchema>;
export type RehearsalReport = z.infer<typeof RehearsalReportSchema>;
export type RehearsalSession = z.infer<typeof RehearsalSessionSchema>;
