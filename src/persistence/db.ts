import Dexie, { type EntityTable } from "dexie";

import type { CommunicationProfile } from "@/domain/profile";
import type { RehearsalSession } from "@/domain/rehearsal";
import type { Scenario } from "@/domain/scenario";

export type ProfileVersionRecord = {
  id: string;
  profileId: string;
  ratifiedVersion: number;
  revision: number;
  hash: string;
  ratifiedAt: string;
  profile: CommunicationProfile;
};

export type ActivityReceipt = {
  id: string;
  source: "owner_ui" | "webmcp" | "system";
  toolName: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  code: string;
  profileRevision: number;
  sessionVersion: number;
  changedIds: string[];
  correlationId: string;
};

export type IdempotencyRecord = {
  id: string;
  scope: string;
  key: string;
  fingerprint: string;
  createdAt: string;
  result: unknown;
};

export class HowIChooseDatabase extends Dexie {
  profiles!: EntityTable<CommunicationProfile, "id">;
  sessions!: EntityTable<RehearsalSession, "id">;
  scenarios!: EntityTable<Scenario, "id">;
  profileVersions!: EntityTable<ProfileVersionRecord, "id">;
  activityReceipts!: EntityTable<ActivityReceipt, "id">;
  idempotency!: EntityTable<IdempotencyRecord, "id">;

  constructor(name = "how-i-choose") {
    super(name);
    this.version(1).stores({
      profiles: "id, revision, updatedAt",
      sessions: "id, scenarioId, state, sessionVersion",
      scenarios: "id, contextId, status",
      profileVersions: "id, profileId, ratifiedVersion, revision",
      activityReceipts: "id, toolName, startedAt, code",
      idempotency: "id, scope, key, createdAt",
    });
    this.version(2).stores({
      sessions: "id, scenarioId, state, sessionVersion",
    }).upgrade(async (transaction) => {
      await transaction.table<RehearsalSession, string>("sessions").toCollection().modify((session) => {
        session.agentAccessEnabled ??= false;
      });
    });
  }
}

let singleton: HowIChooseDatabase | undefined;

export function getDatabase(): HowIChooseDatabase {
  singleton ??= new HowIChooseDatabase();
  return singleton;
}
