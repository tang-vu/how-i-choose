import { z } from "zod";

import {
  DisplayTextSchema,
  IsoDateSchema,
  ShortTextSchema,
  StableIdSchema,
} from "@/domain/schema";

export const ScenarioStatusSchema = z.enum([
  "draft",
  "awaiting_owner_review",
  "approved",
]);

export const ScenarioSchema = z.object({
  id: StableIdSchema,
  title: ShortTextSchema,
  summary: DisplayTextSchema,
  contextId: StableIdSchema,
  status: ScenarioStatusSchema,
  approvedAt: IsoDateSchema.optional(),
  synthetic: z.boolean(),
}).strict();

export type Scenario = z.infer<typeof ScenarioSchema>;
