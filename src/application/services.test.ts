import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AgentRehearsalService } from "@/application/agent-rehearsal-service";
import {
  prepareAtomicRequest,
  type CommandDependencies,
} from "@/application/command-bus";
import { OwnerWorkflowService, type WorkspaceIds } from "@/application/owner-workflow-service";
import { RehearsalQueryService } from "@/application/rehearsal-query-service";
import { hashProfile } from "@/domain/canonicalize";
import { mayaProfile, validMayaTurn } from "@/fixtures/maya";
import { HowIChooseDatabase } from "@/persistence/db";
import {
  exportWorkspaceJson,
  importWorkspaceJson,
  parseWorkspaceJson,
} from "@/persistence/import-export";
import { WorkspaceRepository } from "@/persistence/repository";

const ids: WorkspaceIds = {
  profileId: "profile-maya",
  sessionId: "session-maya-demo",
  scenarioId: "scenario-community-workshop",
};

function deterministicDependencies(): CommandDependencies {
  let nextId = 0;
  return {
    now: () => "2026-08-31T01:00:00.000Z",
    id: (prefix) => `${prefix}-${++nextId}`,
  };
}

describe("atomic application services", () => {
  let db: HowIChooseDatabase;
  let repository: WorkspaceRepository;
  let owner: OwnerWorkflowService;
  let agent: AgentRehearsalService;
  let dependencies: CommandDependencies;

  beforeEach(async () => {
    db = new HowIChooseDatabase(`how-i-choose-test-${crypto.randomUUID()}`);
    repository = new WorkspaceRepository(db);
    dependencies = deterministicDependencies();
    owner = new OwnerWorkflowService(repository, ids, dependencies);
    agent = new AgentRehearsalService(repository, ids, dependencies);
    await owner.resetSyntheticDemo();
  });

  afterEach(async () => {
    await db.delete();
  });

  it("updates profile and pinned session revisions atomically", async () => {
    const result = await owner.updateRule({
      expectedProfileRevision: 1,
      expectedSessionVersion: 1,
      idempotencyKey: "edit-channel",
      ruleId: "rule-channel-text",
      changes: { displayText: "Use text only." },
    });
    const workspace = await repository.readWorkspace(ids.profileId, ids.sessionId, ids.scenarioId);

    expect(result.ok).toBe(true);
    expect(result.profileRevision).toBe(2);
    expect(result.sessionVersion).toBe(2);
    expect(workspace?.profile.revision).toBe(2);
    expect(workspace?.session.profileRevision).toBe(2);
    expect(workspace?.profile.rules.find(({ id }) => id === "rule-channel-text")?.displayText).toBe("Use text only.");
  });

  it("rejects stale profile and session revisions without mutation", async () => {
    await owner.updateRule({
      expectedProfileRevision: 1,
      expectedSessionVersion: 1,
      idempotencyKey: "first-edit",
      ruleId: "rule-channel-text",
      changes: { displayText: "Use text only." },
    });
    const staleProfile = await owner.updateRule({
      expectedProfileRevision: 1,
      expectedSessionVersion: 2,
      idempotencyKey: "stale-profile",
      ruleId: "rule-channel-text",
      changes: { displayText: "Stale write." },
    });
    const staleSession = await owner.updateRule({
      expectedProfileRevision: 2,
      expectedSessionVersion: 1,
      idempotencyKey: "stale-session",
      ruleId: "rule-channel-text",
      changes: { displayText: "Another stale write." },
    });
    const workspace = await repository.readWorkspace(ids.profileId, ids.sessionId, ids.scenarioId);

    expect(staleProfile.code).toBe("STALE_PROFILE_REVISION");
    expect(staleSession.code).toBe("STALE_SESSION_VERSION");
    expect(workspace?.profile.rules.find(({ id }) => id === "rule-channel-text")?.displayText).toBe("Use text only.");
    expect(workspace?.profile.revision).toBe(2);
  });

  it("replays the same idempotent command without duplicate changes", async () => {
    const command = {
      expectedProfileRevision: 1,
      expectedSessionVersion: 1,
      idempotencyKey: "same-edit",
      ruleId: "rule-channel-text",
      changes: { displayText: "Use text only." },
    } as const;
    const first = await owner.updateRule(command);
    const replay = await owner.updateRule(command);
    const workspace = await repository.readWorkspace(ids.profileId, ids.sessionId, ids.scenarioId);

    expect(first.code).toBe("OK");
    expect(replay.code).toBe("IDEMPOTENT_REPLAY");
    expect(replay.replayed).toBe(true);
    expect(replay.changedIds).toEqual([]);
    expect(workspace?.profile.revision).toBe(2);
    expect(workspace?.session.sessionVersion).toBe(2);
  });

  it("rejects reuse of an idempotency key with a different payload", async () => {
    await owner.updateRule({
      expectedProfileRevision: 1,
      expectedSessionVersion: 1,
      idempotencyKey: "reused-key",
      ruleId: "rule-channel-text",
      changes: { displayText: "Use text only." },
    });
    const conflict = await owner.updateRule({
      expectedProfileRevision: 2,
      expectedSessionVersion: 2,
      idempotencyKey: "reused-key",
      ruleId: "rule-channel-text",
      changes: { displayText: "Different payload." },
    });
    expect(conflict.code).toBe("IDEMPOTENCY_KEY_REUSED");
    expect(conflict.ok).toBe(false);
  });

  it("never partially applies a command whose next document is invalid", async () => {
    const request = await prepareAtomicRequest({
      scope: "test_invalid_atomic",
      idempotencyKey: "invalid-atomic",
      ...ids,
      expectedProfileRevision: 1,
      expectedSessionVersion: 1,
      source: "system",
      toolName: "test_invalid_atomic",
    }, { test: true }, dependencies);

    await expect(repository.runAtomicCommand(request, ({ profile, session }) => ({
      accepted: true,
      profile: { ...profile, revision: 2 },
      session: { ...session, sessionVersion: 0 },
      data: { shouldNotPersist: true },
      changedIds: [profile.id, session.id],
      nextActions: [],
    }))).rejects.toThrow();

    const workspace = await repository.readWorkspace(ids.profileId, ids.sessionId, ids.scenarioId);
    expect(workspace?.profile.revision).toBe(1);
    expect(workspace?.session.sessionVersion).toBe(1);
  });

  it("records the exact owner-selected semantic signal and exposes it un-inferred", async () => {
    await owner.startHumanRehearsal({ expectedProfileRevision: 1, expectedSessionVersion: 1, idempotencyKey: "start-for-signal" });
    const selected = await owner.selectSignal({
      expectedProfileRevision: 1,
      expectedSessionVersion: 2,
      idempotencyKey: "select-amber",
      signalId: "signal-amber",
    });
    const latest = await agent.readLatestSignal();

    expect(selected.data).toEqual(expect.objectContaining({ meaning: "not_sure" }));
    expect(latest).toEqual(expect.objectContaining({
      actor: "owner",
      type: "signal_selected",
      signalId: "signal-amber",
      meaning: "not_sure",
    }));
  });

  it("rejects invalid partner turns while recording non-visible adherence evidence", async () => {
    await owner.startHumanRehearsal({ expectedProfileRevision: 1, expectedSessionVersion: 1, idempotencyKey: "start-for-invalid" });
    const invalid = structuredClone(validMayaTurn);
    invalid.segments.push({ kind: "question", text: "Which reminder should I add?" });
    const result = await agent.offerPartnerTurn({
      expectedProfileRevision: 1,
      expectedSessionVersion: 2,
      idempotencyKey: "invalid-turn",
      turn: invalid,
    });
    const workspace = await repository.readWorkspace(ids.profileId, ids.sessionId, ids.scenarioId);
    const receipts = await repository.listReceipts();

    expect(result.code).toBe("INVALID_PARTNER_TURN");
    expect(result.violations).toEqual(expect.arrayContaining([expect.objectContaining({ code: "QUESTION_COUNT" })]));
    expect(workspace?.session.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "partner_turn_rejected", violationCodes: expect.arrayContaining(["QUESTION_COUNT"]) }),
    ]));
    expect(workspace?.session.events.some(({ type }) => type === "partner_turn_accepted")).toBe(false);
    expect(workspace?.session.sessionVersion).toBe(3);
    expect(receipts[0]).toEqual(expect.objectContaining({ toolName: "offer_partner_turn", code: "INVALID_PARTNER_TURN" }));
  });

  it("accepts a valid partner turn once and persists visible evidence", async () => {
    await owner.startHumanRehearsal({ expectedProfileRevision: 1, expectedSessionVersion: 1, idempotencyKey: "start-for-valid" });
    const command = {
      expectedProfileRevision: 1,
      expectedSessionVersion: 2,
      idempotencyKey: "valid-turn",
      turn: validMayaTurn,
    } as const;
    const first = await agent.offerPartnerTurn(command);
    const replay = await agent.offerPartnerTurn(command);
    const workspace = await repository.readWorkspace(ids.profileId, ids.sessionId, ids.scenarioId);

    expect(first.ok).toBe(true);
    expect(first.data?.visible).toBe(true);
    expect(replay.code).toBe("IDEMPOTENT_REPLAY");
    expect(workspace?.session.events.filter(({ type }) => type === "partner_turn_accepted")).toHaveLength(1);
  });

  it("ratifies only through the owner service and preserves immutable history", async () => {
    const queries = new RehearsalQueryService(repository, ids, dependencies, "owner_ui");
    await queries.verifySupportGuide();
    const result = await owner.ratify({
      expectedProfileRevision: 1,
      expectedSessionVersion: 1,
      idempotencyKey: "ratify-v2",
    });
    const versions = await repository.listProfileVersions(ids.profileId);

    expect(result.ok).toBe(true);
    expect(result.data?.ratifiedVersion).toBe(2);
    expect(versions.map(({ ratifiedVersion }) => ratifiedVersion)).toEqual([1, 2]);
    expect(versions[0]?.profile.revision).toBe(1);
    expect(versions[1]?.profile.revision).toBe(2);
    expect(versions[0]?.hash).not.toBe(versions[1]?.hash);
  });

  it("requires a current support-guide derivation receipt before ratification", async () => {
    const result = await owner.ratify({
      expectedProfileRevision: 1,
      expectedSessionVersion: 1,
      idempotencyKey: "ratify-without-verification",
    });
    expect(result).toEqual(expect.objectContaining({ ok: false, code: "OWNER_REVIEW_REQUIRED" }));
    expect(result.violations).toEqual(expect.arrayContaining([expect.objectContaining({ code: "SUPPORT_GUIDE_NOT_VERIFIED" })]));
    expect(await repository.listProfileVersions(ids.profileId)).toHaveLength(1);
  });

  it("undoes one visible draft edit through the owner service with monotonic revisions", async () => {
    const before = (await repository.readWorkspace(ids.profileId, ids.sessionId, ids.scenarioId))!.profile;
    await owner.updateProfileTitle({
      expectedProfileRevision: 1,
      expectedSessionVersion: 1,
      idempotencyKey: "rename-before-undo",
      title: "Temporary draft title",
    });
    const undone = await owner.restorePreviousDraft({
      expectedProfileRevision: 2,
      expectedSessionVersion: 2,
      idempotencyKey: "undo-rename",
      previousProfile: before,
    });
    const workspace = await repository.readWorkspace(ids.profileId, ids.sessionId, ids.scenarioId);
    expect(undone).toEqual(expect.objectContaining({ ok: true, profileRevision: 3, sessionVersion: 3 }));
    expect(workspace?.profile.title).toBe(before.title);
    expect(workspace?.profile.revision).toBe(3);
  });

  it("loads another low-stakes scenario template and returns it to visible review", async () => {
    const chosen = await owner.chooseScenarioTemplate({
      expectedProfileRevision: 1,
      expectedSessionVersion: 1,
      idempotencyKey: "choose-library-template",
      templateId: "library-meetup",
    });
    const workspace = await repository.readWorkspace(ids.profileId, ids.sessionId, ids.scenarioId);
    expect(chosen).toEqual(expect.objectContaining({ ok: true, data: { templateId: "library-meetup", state: "scenario_draft" } }));
    expect(workspace?.scenario).toEqual(expect.objectContaining({ title: "Plan a library meetup", status: "draft", synthetic: true }));
    expect(workspace?.session.state).toBe("scenario_draft");
  });

  it("round-trips import/export without changing canonical hashes", async () => {
    const exported = await exportWorkspaceJson(repository, "2026-08-31T02:00:00.000Z");
    const secondDb = new HowIChooseDatabase(`how-i-choose-import-${crypto.randomUUID()}`);
    const secondRepository = new WorkspaceRepository(secondDb);
    try {
      await importWorkspaceJson(secondRepository, exported);
      const reexported = await exportWorkspaceJson(secondRepository, "2026-08-31T02:00:00.000Z");
      expect(reexported).toBe(exported);
      expect(await hashProfile(parseWorkspaceJson(reexported).profiles[0]!)).toBe(
        await hashProfile(mayaProfile),
      );
    } finally {
      await secondDb.delete();
    }
  });

  it("fully validates an import before replacing stored data", async () => {
    const invalid = JSON.stringify({ schemaVersion: 1, executable: "alert(1)" });
    await expect(importWorkspaceJson(repository, invalid)).rejects.toThrow();
    const workspace = await repository.readWorkspace(ids.profileId, ids.sessionId, ids.scenarioId);
    expect(workspace?.profile.id).toBe(ids.profileId);
  });

  it("persists across a database close and reload", async () => {
    const databaseName = db.name;
    db.close();
    const reopened = new HowIChooseDatabase(databaseName);
    const reopenedRepository = new WorkspaceRepository(reopened);
    const workspace = await reopenedRepository.readWorkspace(ids.profileId, ids.sessionId, ids.scenarioId);
    expect(workspace?.profile.title).toBe("Maya — synthetic sample");
    db = reopened;
  });

  it("keeps activity receipts metadata-only", async () => {
    await owner.updateRule({
      expectedProfileRevision: 1,
      expectedSessionVersion: 1,
      idempotencyKey: "receipt-test",
      ruleId: "rule-channel-text",
      changes: { displayText: "A private authored sentence must not enter receipts." },
    });
    const serialized = JSON.stringify(await repository.listReceipts());
    expect(serialized).not.toContain("private authored sentence");
    expect(serialized).not.toContain(mayaProfile.privateNotes);
  });
});
