import { z } from "zod";

export const MAX_RULES = 80;
export const MAX_SIGNALS = 24;
export const MAX_CONTEXTS = 24;
export const MAX_DISCLOSURES = 160;
export const MAX_EVENTS = 1_000;
export const MAX_TEXT = 500;

export const StableIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9._-]*$/i, "Use letters, numbers, dots, underscores, or hyphens.");

export const ShortTextSchema = z.string().trim().min(1).max(120);
export const DisplayTextSchema = z.string().trim().min(1).max(MAX_TEXT);
export const OptionalDisplayTextSchema = z.string().trim().max(MAX_TEXT);
export const IsoDateSchema = z.string().datetime({ offset: true });
export const RevisionSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const PositiveVersionSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);

export function assertUniqueIds(items: ReadonlyArray<{ id: string }>, ctx: z.RefinementCtx) {
  const seen = new Set<string>();
  for (const [index, item] of items.entries()) {
    if (seen.has(item.id)) {
      ctx.addIssue({
        code: "custom",
        message: `Duplicate id: ${item.id}`,
        path: [index, "id"],
      });
    }
    seen.add(item.id);
  }
}
