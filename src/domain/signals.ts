import { z } from "zod";

import {
  DisplayTextSchema,
  MAX_SIGNALS,
  ShortTextSchema,
  StableIdSchema,
  assertUniqueIds,
} from "@/domain/schema";

export const SignalMeaningSchema = z.enum([
  "yes",
  "no",
  "not_sure",
  "need_information",
  "need_more_time",
  "rephrase",
  "pause",
  "stop",
  "custom",
]);

export const SignalDefinitionSchema = z.object({
  id: StableIdSchema,
  semanticMeaning: SignalMeaningSchema,
  label: ShortTextSchema,
  description: DisplayTextSchema,
  expectedPartnerAction: DisplayTextSchema,
  keyboardShortcut: z.string().trim().min(1).max(24).optional(),
  agentVisible: z.boolean(),
}).strict();

export const SignalDefinitionsSchema = z
  .array(SignalDefinitionSchema)
  .min(1)
  .max(MAX_SIGNALS)
  .superRefine(assertUniqueIds);

export type SignalMeaning = z.infer<typeof SignalMeaningSchema>;
export type SignalDefinition = z.infer<typeof SignalDefinitionSchema>;
