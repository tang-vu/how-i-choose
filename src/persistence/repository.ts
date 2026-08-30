import { z } from "zod";

import { CommunicationProfileSchema, type CommunicationProfile } from "@/domain/profile";
import { RehearsalSessionSchema, type RehearsalSession } from "@/domain/rehearsal";
import { ScenarioSchema, type Scenario } from "@/domain/scenario";
import { StableIdSchema } from "@/domain/schema";
import {
  HowIChooseDatabase,
  type ActivityReceipt,
  type IdempotencyRecord,
  type ProfileVersionRecord,
} from "@/persistence/db";

export type WorkspaceSnapshot = {
  profile: CommunicationProfile;
  session: RehearsalSession;
  scenario: Scenario;
};

export type CommandViolation = {
  code: string;
  ruleIds?: string[];
  message: string;
  repair?: string;
};

export type CommandResult<T> = {
  ok: boolean;
  code: string;
  profileRevision: number;
  sessionVersion: number;
  profileHash: string;
  receiptId: string;
  data: T | null;
  violations: CommandViolation[];
  changedIds: string[];
  nextActions: string[];
  replayed: boolean;
};

export type AtomicCommandRequest = {
  scope: string;
  idempotencyKey: string;
  fingerprint: string;
  profileId: string;
  sessionId: string;
  scenarioId: string;
  expectedProfileRevision: number;
  expectedSessionVersion: number;
  source: ActivityReceipt["source"];
  toolName: string;
  receiptId: string;
  correlationId: string;
  startedAt: string;
  completedAt: string;
};

export type AcceptedMutation<T> = {
  accepted: true;
  code?: string;
  profile?: CommunicationProfile;
  session?: RehearsalSession;
  scenario?: Scenario;
  profileVersion?: ProfileVersionRecord;
  data: T;
  changedIds: string[];
  nextActions: string[];
  violations?: CommandViolation[];
};

export type RejectedMutation = {
  accepted: false;
  code: string;
  session?: RehearsalSession;
  data?: never;
  changedIds?: string[];
  nextActions: string[];
  violations: CommandViolation[];
};

export type MutationOutcome<T> = AcceptedMutation<T> | RejectedMutation;

export type ResetWorkspaceInput = WorkspaceSnapshot & {
  profileVersion?: ProfileVersionRecord;
};

const RequestSchema = z.object({
  scope: z.string().trim().min(1).max(80),
  idempotencyKey: StableIdSchema.max(128),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  profileId: StableIdSchema,
  sessionId: StableIdSchema,
  scenarioId: StableIdSchema,
  expectedProfileRevision: z.number().int().nonnegative(),
  expectedSessionVersion: z.number().int().positive(),
  source: z.enum(["owner_ui", "webmcp", "system"]),
  toolName: z.string().trim().min(1).max(80),
  receiptId: StableIdSchema,
  correlationId: StableIdSchema,
  startedAt: z.string().datetime({ offset: true }),
  completedAt: z.string().datetime({ offset: true }),
}).strict();

function durationMs(startedAt: string, completedAt: string): number {
  return Math.max(0, new Date(completedAt).getTime() - new Date(startedAt).getTime());
}

function receipt(
  request: AtomicCommandRequest,
  code: string,
  profileRevision: number,
  sessionVersion: number,
  changedIds: readonly string[],
): ActivityReceipt {
  return {
    id: request.receiptId,
    source: request.source,
    toolName: request.toolName,
    startedAt: request.startedAt,
    completedAt: request.completedAt,
    durationMs: durationMs(request.startedAt, request.completedAt),
    code,
    profileRevision,
    sessionVersion,
    changedIds: [...changedIds].toSorted(),
    correlationId: request.correlationId,
  };
}

export class WorkspaceRepository {
  constructor(readonly db: HowIChooseDatabase) {}

  async readWorkspace(
    profileId: string,
    sessionId: string,
    scenarioId: string,
  ): Promise<WorkspaceSnapshot | null> {
    const [profile, session, scenario] = await Promise.all([
      this.db.profiles.get(profileId),
      this.db.sessions.get(sessionId),
      this.db.scenarios.get(scenarioId),
    ]);
    if (!profile || !session || !scenario) return null;
    return { profile, session, scenario };
  }

  async resetWorkspace(input: ResetWorkspaceInput): Promise<void> {
    const profile = CommunicationProfileSchema.parse(input.profile);
    const session = RehearsalSessionSchema.parse(input.session);
    const scenario = ScenarioSchema.parse(input.scenario);
    await this.db.transaction(
      "rw",
      [
        this.db.profiles,
        this.db.sessions,
        this.db.scenarios,
        this.db.profileVersions,
        this.db.activityReceipts,
        this.db.idempotency,
      ],
      async () => {
        await Promise.all([
          this.db.profiles.clear(),
          this.db.sessions.clear(),
          this.db.scenarios.clear(),
          this.db.profileVersions.clear(),
          this.db.activityReceipts.clear(),
          this.db.idempotency.clear(),
        ]);
        await Promise.all([
          this.db.profiles.add(profile),
          this.db.sessions.add(session),
          this.db.scenarios.add(scenario),
          ...(input.profileVersion ? [this.db.profileVersions.add(input.profileVersion)] : []),
        ]);
      },
    );
  }

  async replaceImportedWorkspace(input: {
    profiles: CommunicationProfile[];
    sessions: RehearsalSession[];
    scenarios: Scenario[];
    profileVersions: ProfileVersionRecord[];
  }): Promise<void> {
    const profiles = input.profiles.map((value) => CommunicationProfileSchema.parse(value));
    const sessions = input.sessions.map((value) => RehearsalSessionSchema.parse(value));
    const scenarios = input.scenarios.map((value) => ScenarioSchema.parse(value));
    await this.db.transaction(
      "rw",
      [this.db.profiles, this.db.sessions, this.db.scenarios, this.db.profileVersions, this.db.idempotency],
      async () => {
        await Promise.all([
          this.db.profiles.clear(),
          this.db.sessions.clear(),
          this.db.scenarios.clear(),
          this.db.profileVersions.clear(),
          this.db.idempotency.clear(),
        ]);
        await this.db.profiles.bulkAdd(profiles);
        await this.db.sessions.bulkAdd(sessions);
        await this.db.scenarios.bulkAdd(scenarios);
        await this.db.profileVersions.bulkAdd(input.profileVersions);
      },
    );
  }

  async exportRecords() {
    const [profiles, sessions, scenarios, profileVersions] = await Promise.all([
      this.db.profiles.toArray(),
      this.db.sessions.toArray(),
      this.db.scenarios.toArray(),
      this.db.profileVersions.toArray(),
    ]);
    return { profiles, sessions, scenarios, profileVersions };
  }

  async listReceipts(): Promise<ActivityReceipt[]> {
    return this.db.activityReceipts.orderBy("startedAt").reverse().toArray();
  }

  async listProfileVersions(profileId: string): Promise<ProfileVersionRecord[]> {
    return this.db.profileVersions.where("profileId").equals(profileId).sortBy("ratifiedVersion");
  }

  async runAtomicCommand<T>(
    uncheckedRequest: AtomicCommandRequest,
    mutate: (snapshot: WorkspaceSnapshot) => MutationOutcome<T> | Promise<MutationOutcome<T>>,
  ): Promise<CommandResult<T>> {
    const request = RequestSchema.parse(uncheckedRequest);
    const idempotencyId = `${request.scope}:${request.idempotencyKey}`;

    return this.db.transaction(
      "rw",
      [
        this.db.profiles,
        this.db.sessions,
        this.db.scenarios,
        this.db.profileVersions,
        this.db.activityReceipts,
        this.db.idempotency,
      ],
      async () => {
        const [profile, session, scenario, previous] = await Promise.all([
          this.db.profiles.get(request.profileId),
          this.db.sessions.get(request.sessionId),
          this.db.scenarios.get(request.scenarioId),
          this.db.idempotency.get(idempotencyId),
        ]);

        if (!profile || !session || !scenario) {
          throw new Error("WORKSPACE_NOT_FOUND");
        }

        if (previous) {
          const code = previous.fingerprint === request.fingerprint ? "IDEMPOTENT_REPLAY" : "IDEMPOTENCY_KEY_REUSED";
          const prior = previous.result as CommandResult<T>;
          await this.db.activityReceipts.add(
            receipt(request, code, profile.revision, session.sessionVersion, []),
          );
          return {
            ...prior,
            ok: previous.fingerprint === request.fingerprint && prior.ok,
            code,
            profileRevision: profile.revision,
            sessionVersion: session.sessionVersion,
            profileHash: session.profileHash,
            receiptId: request.receiptId,
            changedIds: [],
            replayed: previous.fingerprint === request.fingerprint,
          };
        }

        if (profile.revision !== request.expectedProfileRevision) {
          const result: CommandResult<T> = {
            ok: false,
            code: "STALE_PROFILE_REVISION",
            profileRevision: profile.revision,
            sessionVersion: session.sessionVersion,
            profileHash: session.profileHash,
            receiptId: request.receiptId,
            data: null,
            violations: [],
            changedIds: [],
            nextActions: ["get_rehearsal_brief"],
            replayed: false,
          };
          await this.db.activityReceipts.add(receipt(request, result.code, profile.revision, session.sessionVersion, []));
          return result;
        }

        if (session.sessionVersion !== request.expectedSessionVersion) {
          const result: CommandResult<T> = {
            ok: false,
            code: "STALE_SESSION_VERSION",
            profileRevision: profile.revision,
            sessionVersion: session.sessionVersion,
            profileHash: session.profileHash,
            receiptId: request.receiptId,
            data: null,
            violations: [],
            changedIds: [],
            nextActions: ["get_rehearsal_brief"],
            replayed: false,
          };
          await this.db.activityReceipts.add(receipt(request, result.code, profile.revision, session.sessionVersion, []));
          return result;
        }

        const snapshot = { profile, session, scenario };
        const outcome = await mutate(snapshot);
        const nextProfile = outcome.accepted && outcome.profile ? CommunicationProfileSchema.parse(outcome.profile) : profile;
        const nextSession = outcome.session ? RehearsalSessionSchema.parse(outcome.session) : session;
        const nextScenario = outcome.accepted && outcome.scenario ? ScenarioSchema.parse(outcome.scenario) : scenario;
        const changedIds = outcome.changedIds ?? [];
        const result: CommandResult<T> = {
          ok: outcome.accepted,
          code: outcome.accepted ? (outcome.code ?? "OK") : outcome.code,
          profileRevision: nextProfile.revision,
          sessionVersion: nextSession.sessionVersion,
          profileHash: nextSession.profileHash,
          receiptId: request.receiptId,
          data: outcome.data ?? null,
          violations: outcome.violations ?? [],
          changedIds: [...changedIds].toSorted(),
          nextActions: outcome.nextActions,
          replayed: false,
        };

        if (outcome.accepted) {
          if (outcome.profile) await this.db.profiles.put(nextProfile);
          if (outcome.scenario) await this.db.scenarios.put(nextScenario);
          if (outcome.profileVersion) await this.db.profileVersions.add(outcome.profileVersion);
        }
        if (outcome.session) await this.db.sessions.put(nextSession);
        const idempotency: IdempotencyRecord = {
          id: idempotencyId,
          scope: request.scope,
          key: request.idempotencyKey,
          fingerprint: request.fingerprint,
          createdAt: request.completedAt,
          result,
        };
        await this.db.idempotency.add(idempotency);
        await this.db.activityReceipts.add(
          receipt(request, result.code, result.profileRevision, result.sessionVersion, changedIds),
        );
        return result;
      },
    );
  }

  async recordActivityReceipt(input: ActivityReceipt): Promise<void> {
    await this.db.activityReceipts.add(input);
  }
}
