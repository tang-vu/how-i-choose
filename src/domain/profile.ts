import { z } from "zod";

import {
  DisplayTextSchema,
  IsoDateSchema,
  MAX_CONTEXTS,
  MAX_DISCLOSURES,
  MAX_RULES,
  OptionalDisplayTextSchema,
  RevisionSchema,
  ShortTextSchema,
  StableIdSchema,
  assertUniqueIds,
} from "@/domain/schema";
import { SignalDefinitionsSchema } from "@/domain/signals";

export const RuleStatusSchema = z.enum(["draft", "active", "retired"]);
export const RuleCategorySchema = z.enum([
  "channel",
  "question_format",
  "pacing",
  "processing_time",
  "language",
  "signal_handling",
  "privacy",
]);
export const RuleEffectSchema = z.enum(["require", "prefer", "avoid", "block"]);
export const RuleStrengthSchema = z.enum(["must", "should", "may"]);
export const RuleProvenanceSchema = z.object({
  source: z.enum(["person", "agent_suggestion", "template"]),
  sourceSessionId: StableIdSchema.optional(),
  sourcePatchId: StableIdSchema.optional(),
  sourceEventIds: z.array(StableIdSchema).max(50).optional(),
  targetRuleId: StableIdSchema.optional(),
  acceptedAt: IsoDateSchema.optional(),
  reviewedAt: IsoDateSchema.optional(),
  reviewOutcome: z.enum(["accepted", "rejected", "rewritten"]).optional(),
}).strict();

export const CommunicationRuleSchema = z.object({
  id: StableIdSchema,
  status: RuleStatusSchema,
  category: RuleCategorySchema,
  effect: RuleEffectSchema,
  strength: RuleStrengthSchema,
  contextIds: z.array(StableIdSchema).max(MAX_CONTEXTS),
  controlledValue: z.string().trim().min(1).max(120),
  displayText: DisplayTextSchema,
  agentVisible: z.boolean(),
  provenance: RuleProvenanceSchema,
}).strict();

export const ContextDefinitionSchema = z.object({
  id: StableIdSchema,
  label: ShortTextSchema,
  description: OptionalDisplayTextSchema,
  agentVisible: z.boolean(),
}).strict();

export const FieldDisclosureSchema = z.object({
  id: StableIdSchema,
  fieldKind: z.enum(["rule", "signal", "context", "scenario_summary"]),
  fieldId: StableIdSchema,
  agentVisible: z.boolean(),
}).strict();

export const CommunicationProfileSchema = z.object({
  schemaVersion: z.literal(1),
  id: StableIdSchema,
  title: ShortTextSchema,
  revision: RevisionSchema,
  ratifiedVersion: RevisionSchema.nullable(),
  rules: z.array(CommunicationRuleSchema).max(MAX_RULES).superRefine(assertUniqueIds),
  signals: SignalDefinitionsSchema,
  contexts: z.array(ContextDefinitionSchema).max(MAX_CONTEXTS).superRefine(assertUniqueIds),
  disclosures: z.array(FieldDisclosureSchema).max(MAX_DISCLOSURES).superRefine(assertUniqueIds),
  privateNotes: z.string().max(2_000).optional(),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
  reviewedAt: IsoDateSchema.optional(),
}).strict().superRefine((profile, ctx) => {
  const contextIds = new Set(profile.contexts.map(({ id }) => id));
  for (const [ruleIndex, rule] of profile.rules.entries()) {
    for (const [contextIndex, contextId] of rule.contextIds.entries()) {
      if (!contextIds.has(contextId)) {
        ctx.addIssue({
          code: "custom",
          message: `Unknown context id: ${contextId}`,
          path: ["rules", ruleIndex, "contextIds", contextIndex],
        });
      }
    }
  }
});

export type RuleStatus = z.infer<typeof RuleStatusSchema>;
export type RuleCategory = z.infer<typeof RuleCategorySchema>;
export type RuleEffect = z.infer<typeof RuleEffectSchema>;
export type RuleStrength = z.infer<typeof RuleStrengthSchema>;
export type CommunicationRule = z.infer<typeof CommunicationRuleSchema>;
export type ContextDefinition = z.infer<typeof ContextDefinitionSchema>;
export type FieldDisclosure = z.infer<typeof FieldDisclosureSchema>;
export type CommunicationProfile = z.infer<typeof CommunicationProfileSchema>;

export function activeRulesForContext(
  profile: CommunicationProfile,
  contextId: string,
): CommunicationRule[] {
  return profile.rules
    .filter(
      (rule) =>
        rule.status === "active" &&
        (rule.contextIds.length === 0 || rule.contextIds.includes(contextId)),
    )
    .toSorted((left, right) => left.id.localeCompare(right.id));
}

export function isFieldDisclosed(
  profile: CommunicationProfile,
  fieldKind: FieldDisclosure["fieldKind"],
  fieldId: string,
): boolean {
  return profile.disclosures.some(
    (disclosure) =>
      disclosure.fieldKind === fieldKind &&
      disclosure.fieldId === fieldId &&
      disclosure.agentVisible,
  );
}
