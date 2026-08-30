import { z } from "zod";

import { StageProtocolPatchCommandSchema } from "@/application/proposal-service";
import { StructuredPartnerTurnSchema } from "@/domain/rehearsal";
import { StableIdSchema } from "@/domain/schema";

const EmptyInputSchema = z.object({}).strict();
const AuditInputSchema = z.object({
  expectedProfileRevision: z.number().int().nonnegative(),
  scenarioId: StableIdSchema,
}).strict();
const StartInputSchema = z.object({
  expectedProfileRevision: z.number().int().nonnegative(),
  expectedSessionVersion: z.number().int().positive(),
  scenarioId: StableIdSchema,
  idempotencyKey: StableIdSchema.max(128),
}).strict();
const OfferInputSchema = z.object({
  expectedProfileRevision: z.number().int().nonnegative(),
  expectedSessionVersion: z.number().int().positive(),
  idempotencyKey: StableIdSchema.max(128),
  segments: StructuredPartnerTurnSchema.shape.segments,
  intentTags: StructuredPartnerTurnSchema.shape.intentTags,
  responseOptions: StructuredPartnerTurnSchema.shape.responseOptions,
  channel: StructuredPartnerTurnSchema.shape.channel,
  responseTimerSeconds: StructuredPartnerTurnSchema.shape.responseTimerSeconds,
  acknowledgesSignalEventId: StructuredPartnerTurnSchema.shape.acknowledgesSignalEventId,
  meaningKey: StructuredPartnerTurnSchema.shape.meaningKey,
  rationale: z.string().trim().min(1).max(240),
}).strict();

export const WebMcpInputSchemas = {
  get_rehearsal_brief: EmptyInputSchema,
  audit_rehearsal_readiness: AuditInputSchema,
  start_approved_rehearsal: StartInputSchema,
  offer_partner_turn: OfferInputSchema,
  read_latest_signal: EmptyInputSchema,
  get_rehearsal_report: EmptyInputSchema,
  stage_protocol_patch: StageProtocolPatchCommandSchema,
  verify_support_guide: EmptyInputSchema,
} as const;

export type HowIChooseToolName = keyof typeof WebMcpInputSchemas;

const idSchema = { type: "string", minLength: 1, maxLength: 64, pattern: "^[a-zA-Z0-9][a-zA-Z0-9._-]*$" } as const;
const revisionSchema = { type: "integer", minimum: 0 } as const;
const versionSchema = { type: "integer", minimum: 1 } as const;
const noInput = { type: "object", properties: {}, additionalProperties: false } as const;
const expectedMutationProperties = {
  expectedProfileRevision: revisionSchema,
  expectedSessionVersion: versionSchema,
  idempotencyKey: { ...idSchema, maxLength: 128 },
} as const;
const segmentSchema = {
  type: "object",
  properties: {
    kind: { type: "string", enum: ["statement", "question"] },
    text: { type: "string", minLength: 1, maxLength: 500 },
  },
  required: ["kind", "text"],
  additionalProperties: false,
} as const;
const optionSchema = {
  type: "object",
  properties: {
    id: idSchema,
    label: { type: "string", minLength: 1, maxLength: 120 },
    value: { type: "string", minLength: 1, maxLength: 120 },
    preselected: { type: "boolean" },
  },
  required: ["id", "label", "value", "preselected"],
  additionalProperties: false,
} as const;
const proposalSchema = {
  type: "object",
  properties: {
    operation: { type: "string", enum: ["add", "update"] },
    targetRuleId: idSchema,
    category: { type: "string", enum: ["channel", "question_format", "pacing", "processing_time", "language", "signal_handling", "privacy"] },
    effect: { type: "string", enum: ["require", "prefer", "avoid", "block"] },
    strength: { type: "string", enum: ["must", "should", "may"] },
    contextIds: { type: "array", items: idSchema, maxItems: 24 },
    controlledValue: { type: "string", minLength: 1, maxLength: 120 },
    displayText: { type: "string", minLength: 1, maxLength: 500 },
  },
  required: ["operation", "category", "effect", "strength", "contextIds", "controlledValue", "displayText"],
  additionalProperties: false,
} as const;

export const WebMcpJsonSchemas: Record<HowIChooseToolName, Record<string, unknown>> = {
  get_rehearsal_brief: noInput,
  audit_rehearsal_readiness: {
    type: "object",
    properties: { expectedProfileRevision: revisionSchema, scenarioId: idSchema },
    required: ["expectedProfileRevision", "scenarioId"],
    additionalProperties: false,
  },
  start_approved_rehearsal: {
    type: "object",
    properties: { ...expectedMutationProperties, scenarioId: idSchema },
    required: ["expectedProfileRevision", "expectedSessionVersion", "scenarioId", "idempotencyKey"],
    additionalProperties: false,
  },
  offer_partner_turn: {
    type: "object",
    properties: {
      ...expectedMutationProperties,
      segments: { type: "array", items: segmentSchema, minItems: 1, maxItems: 12 },
      intentTags: { type: "array", items: { type: "string", enum: ["choice", "acknowledge", "clarify", "rephrase", "provide_information", "interpret_as_yes", "interpret_as_no"] }, minItems: 1, maxItems: 8 },
      responseOptions: { type: "array", items: optionSchema, maxItems: 6 },
      channel: { type: "string", enum: ["text", "speech", "aac", "gesture"] },
      responseTimerSeconds: { anyOf: [{ type: "integer", minimum: 1, maximum: 3600 }, { type: "null" }] },
      acknowledgesSignalEventId: idSchema,
      meaningKey: { type: "string", minLength: 1, maxLength: 120 },
      rationale: { type: "string", minLength: 1, maxLength: 240 },
    },
    required: ["expectedProfileRevision", "expectedSessionVersion", "idempotencyKey", "segments", "intentTags", "responseOptions", "channel", "rationale"],
    additionalProperties: false,
  },
  read_latest_signal: noInput,
  get_rehearsal_report: noInput,
  stage_protocol_patch: {
    type: "object",
    properties: {
      ...expectedMutationProperties,
      proposedRules: { type: "array", items: proposalSchema, minItems: 1, maxItems: 8 },
      sourceRehearsalEventIds: { type: "array", items: idSchema, minItems: 1, maxItems: 50 },
      rationale: { type: "string", minLength: 1, maxLength: 500 },
    },
    required: ["expectedProfileRevision", "expectedSessionVersion", "idempotencyKey", "proposedRules", "sourceRehearsalEventIds", "rationale"],
    additionalProperties: false,
  },
  verify_support_guide: noInput,
};

export const toolDescriptions: Record<HowIChooseToolName, string> = {
  get_rehearsal_brief: "Read only the current rehearsal fields that the person explicitly exposed to the active agent, plus revisions and valid next actions.",
  audit_rehearsal_readiness: "Deterministically audit the active scenario for missing requirements, rule conflicts, disclosure gaps, and visible owner-review readiness.",
  start_approved_rehearsal: "Start the active local rehearsal only after the person approved its scenario in the visible page. Requires current revisions and an idempotency key.",
  offer_partner_turn: "Validate a structured communication-partner turn against the person's active protocol and display it only when valid. Never answers or selects a signal for the person.",
  read_latest_signal: "Read the latest unconsumed semantic signal explicitly selected by the person, when that signal is shared with the active agent.",
  get_rehearsal_report: "Read the deterministic communication-partner adherence report and its event evidence. The report never scores the person.",
  stage_protocol_patch: "Stage provenance-linked rule additions or updates for exact, per-item visible owner review. Never accepts or ratifies a change.",
  verify_support_guide: "Verify the current support-guide preview against accepted active sources and report omissions, inference, staleness, and draft-watermark requirements.",
};

export const readOnlyTools = new Set<HowIChooseToolName>([
  "get_rehearsal_brief",
  "audit_rehearsal_readiness",
  "read_latest_signal",
  "get_rehearsal_report",
  "verify_support_guide",
]);
