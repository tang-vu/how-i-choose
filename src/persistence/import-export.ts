import { z } from "zod";

import { canonicalStringify } from "@/domain/canonicalize";
import { CommunicationProfileSchema } from "@/domain/profile";
import { RehearsalSessionSchema } from "@/domain/rehearsal";
import { ScenarioSchema } from "@/domain/scenario";
import type { ProfileVersionRecord } from "@/persistence/db";
import type { WorkspaceRepository } from "@/persistence/repository";

const MAX_IMPORT_BYTES = 1_000_000;

const ProfileVersionSchema: z.ZodType<ProfileVersionRecord> = z.object({
  id: z.string().min(1).max(160),
  profileId: z.string().min(1).max(64),
  ratifiedVersion: z.number().int().positive(),
  revision: z.number().int().nonnegative(),
  hash: z.string().regex(/^[a-f0-9]{64}$/),
  ratifiedAt: z.string().datetime({ offset: true }),
  profile: CommunicationProfileSchema,
}).strict();

export const WorkspaceExportSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string().datetime({ offset: true }),
  profiles: z.array(CommunicationProfileSchema).max(20),
  sessions: z.array(RehearsalSessionSchema).max(100),
  scenarios: z.array(ScenarioSchema).max(100),
  profileVersions: z.array(ProfileVersionSchema).max(100),
}).strict();

export type WorkspaceExport = z.infer<typeof WorkspaceExportSchema>;

export async function exportWorkspaceJson(
  repository: WorkspaceRepository,
  exportedAt: string,
): Promise<string> {
  const records = await repository.exportRecords();
  return canonicalStringify(WorkspaceExportSchema.parse({ schemaVersion: 1, exportedAt, ...records }));
}

export function parseWorkspaceJson(input: string): WorkspaceExport {
  if (new TextEncoder().encode(input).byteLength > MAX_IMPORT_BYTES) {
    throw new Error("IMPORT_TOO_LARGE");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(input) as unknown;
  } catch {
    throw new Error("IMPORT_INVALID_JSON");
  }
  return WorkspaceExportSchema.parse(parsed);
}

export async function importWorkspaceJson(
  repository: WorkspaceRepository,
  input: string,
): Promise<WorkspaceExport> {
  const parsed = parseWorkspaceJson(input);
  await repository.replaceImportedWorkspace(parsed);
  return parsed;
}
