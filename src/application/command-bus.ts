import { canonicalStringify, sha256Hex } from "@/domain/canonicalize";
import type { AtomicCommandRequest } from "@/persistence/repository";

export type CommandDependencies = {
  now: () => string;
  id: (prefix: string) => string;
};

export const browserCommandDependencies: CommandDependencies = {
  now: () => new Date().toISOString(),
  id: (prefix) => `${prefix}-${crypto.randomUUID()}`,
};

export async function prepareAtomicRequest(
  input: Omit<
    AtomicCommandRequest,
    "fingerprint" | "receiptId" | "correlationId" | "startedAt" | "completedAt"
  >,
  payload: unknown,
  dependencies: CommandDependencies,
): Promise<AtomicCommandRequest> {
  const startedAt = dependencies.now();
  const fingerprint = await sha256Hex(canonicalStringify(payload));
  const completedAt = dependencies.now();
  return {
    ...input,
    fingerprint,
    receiptId: dependencies.id("receipt"),
    correlationId: dependencies.id("correlation"),
    startedAt,
    completedAt,
  };
}
