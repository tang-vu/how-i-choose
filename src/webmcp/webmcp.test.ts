import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type CommandDependencies } from "@/application/command-bus";
import { OwnerWorkflowService, type WorkspaceIds } from "@/application/owner-workflow-service";
import { validMayaTurn } from "@/fixtures/maya";
import { HowIChooseDatabase } from "@/persistence/db";
import { WorkspaceRepository } from "@/persistence/repository";
import { WebMcpInputSchemas, WebMcpJsonSchemas } from "@/webmcp/contracts";
import { WebMcpHandlers } from "@/webmcp/handlers";
import { HOW_I_CHOOSE_TOOL_NAMES, registerHowIChooseTools } from "@/webmcp/registry";

const ids: WorkspaceIds = {
  profileId: "profile-maya",
  sessionId: "session-maya-demo",
  scenarioId: "scenario-community-workshop",
};

function deterministicDependencies(): CommandDependencies {
  let nextId = 0;
  let tick = 0;
  return {
    now: () => new Date(Date.UTC(2026, 7, 31, 2, 0, tick++)).toISOString(),
    id: (prefix) => `${prefix}-${++nextId}`,
  };
}

function offerInput(profileRevision: number, sessionVersion: number, idempotencyKey = "turn-one") {
  return {
    expectedProfileRevision: profileRevision,
    expectedSessionVersion: sessionVersion,
    idempotencyKey,
    ...structuredClone(validMayaTurn),
    rationale: validMayaTurn.rationale!,
  };
}

function expectClosedObjects(schema: unknown): void {
  if (!schema || typeof schema !== "object") return;
  const record = schema as Record<string, unknown>;
  if (record.type === "object") expect(record.additionalProperties).toBe(false);
  for (const value of Object.values(record)) {
    if (Array.isArray(value)) value.forEach(expectClosedObjects);
    else expectClosedObjects(value);
  }
}

describe("imperative WebMCP contracts and handlers", () => {
  let db: HowIChooseDatabase;
  let repository: WorkspaceRepository;
  let owner: OwnerWorkflowService;
  let handlers: WebMcpHandlers;
  let dependencies: CommandDependencies;

  beforeEach(async () => {
    db = new HowIChooseDatabase(`webmcp-test-${crypto.randomUUID()}`);
    repository = new WorkspaceRepository(db);
    dependencies = deterministicDependencies();
    owner = new OwnerWorkflowService(repository, ids, dependencies);
    handlers = new WebMcpHandlers({ repository, ids, commands: dependencies });
    await owner.resetSyntheticDemo();
  });

  afterEach(async () => {
    await db.delete();
  });

  it("registers the stable top-level catalog exactly once with no forbidden tool", async () => {
    const registrations: WebMcpToolDefinition[] = [];
    const target = document.implementation.createHTMLDocument("WebMCP test");
    target.modelContext = { registerTool: vi.fn((tool) => { registrations.push(tool); }) };

    const first = registerHowIChooseTools(target, { repository, ids, commands: dependencies });
    const second = registerHowIChooseTools(target, { repository, ids, commands: dependencies });
    expect(await first).toBe(true);
    expect(await second).toBe(true);
    expect(target.modelContext.registerTool).toHaveBeenCalledTimes(8);
    expect(registrations.map(({ name }) => name)).toEqual(HOW_I_CHOOSE_TOOL_NAMES);
    const forbidden = new Set(["set_user_signal", "answer_for_user", "ratify", "publish", "share", "export_private_profile", "contact_supporter", "assess_capacity", "verify_consent", "delete_profile"]);
    expect(registrations.filter(({ name }) => forbidden.has(name))).toEqual([]);
    expect(registrations.every(({ annotations }) => annotations?.destructiveHint === false && annotations.openWorldHint === false)).toBe(true);

    const brief = await registrations.find(({ name }) => name === "get_rehearsal_brief")!.execute({});
    expect(brief).toEqual(expect.objectContaining({ ok: true, profileRevision: 1, sessionVersion: 1 }));
  });

  it("honestly declines registration when the browser API is unavailable", async () => {
    const target = document.implementation.createHTMLDocument("Unsupported WebMCP test");
    expect(await registerHowIChooseTools(target, { repository, ids, commands: dependencies })).toBe(false);
  });

  it("uses strict bounded JSON schemas and matching Zod validation", () => {
    for (const schema of Object.values(WebMcpJsonSchemas)) expectClosedObjects(schema);
    expect(WebMcpInputSchemas.get_rehearsal_brief.safeParse({ extra: true }).success).toBe(false);
    expect(WebMcpInputSchemas.offer_partner_turn.safeParse({
      ...offerInput(1, 1),
      rationale: "x".repeat(241),
    }).success).toBe(false);
    expect(WebMcpInputSchemas.stage_protocol_patch.safeParse({
      expectedProfileRevision: 1,
      expectedSessionVersion: 1,
      idempotencyKey: "patch-one",
      proposedRules: [{
        operation: "update",
        category: "language",
        effect: "require",
        strength: "must",
        contextIds: [],
        controlledValue: "literal_language:true",
        displayText: "Keep language literal.",
      }],
      sourceRehearsalEventIds: ["event-one"],
      rationale: "Observed during the rehearsal.",
    }).success).toBe(false);
  });

  it("invokes every handler without UI and reads current state at execution time", async () => {
    const firstBrief = await handlers.execute("get_rehearsal_brief", {});
    expect(firstBrief).toEqual(expect.objectContaining({ ok: true, profileRevision: 1 }));
    const audit = await handlers.execute("audit_rehearsal_readiness", { expectedProfileRevision: 1, scenarioId: ids.scenarioId });
    expect(audit).toEqual(expect.objectContaining({ ok: true }));
    const report = await handlers.execute("get_rehearsal_report", {});
    expect(report).toEqual(expect.objectContaining({ ok: true, data: expect.objectContaining({ subject: "communication_partner_adherence" }) }));
    const guide = await handlers.execute("verify_support_guide", {});
    expect(guide).toEqual(expect.objectContaining({ ok: true, data: expect.objectContaining({ derivationValid: true }) }));

    await owner.updateRule({
      expectedProfileRevision: 1,
      expectedSessionVersion: 1,
      idempotencyKey: "owner-edits-during-agent",
      ruleId: "rule-channel-text",
      changes: { displayText: "Use text only now." },
    });
    const currentBrief = await handlers.execute("get_rehearsal_brief", {});
    expect(currentBrief).toEqual(expect.objectContaining({ profileRevision: 2, sessionVersion: 2 }));
    expect(JSON.stringify(currentBrief)).toContain("Use text only now.");
  });

  it("recovers from stale revisions, rejects invalid turns, and accepts a repaired turn", async () => {
    const stale = await handlers.execute("offer_partner_turn", offerInput(0, 1, "stale-turn"));
    expect(stale).toEqual(expect.objectContaining({ ok: false, code: "STALE_PROFILE_REVISION", nextActions: ["get_rehearsal_brief"] }));

    await handlers.execute("start_approved_rehearsal", {
      expectedProfileRevision: 1,
      expectedSessionVersion: 1,
      scenarioId: ids.scenarioId,
      idempotencyKey: "start-before-repair",
    });

    const invalid = offerInput(1, 2, "invalid-two-questions");
    invalid.segments.push({ kind: "question", text: "Which reminder should I add?" });
    const rejected = await handlers.execute("offer_partner_turn", invalid);
    expect(rejected).toEqual(expect.objectContaining({ ok: false, code: "INVALID_PARTNER_TURN", sessionVersion: 3 }));
    expect(JSON.stringify(rejected)).toContain("QUESTION_COUNT");

    const repaired = await handlers.execute("offer_partner_turn", offerInput(1, 3, "repaired-turn"));
    expect(repaired).toEqual(expect.objectContaining({ ok: true, sessionVersion: 4, data: expect.objectContaining({ visible: true }) }));
    const report = await handlers.execute("get_rehearsal_report", {});
    expect(JSON.stringify(report)).toContain("violation_repaired");
  });

  it("returns only the exact shared person-authored signal and enforces Stop", async () => {
    await owner.startHumanRehearsal({ expectedProfileRevision: 1, expectedSessionVersion: 1, idempotencyKey: "start-before-amber" });
    await owner.selectSignal({ expectedProfileRevision: 1, expectedSessionVersion: 2, idempotencyKey: "amber", signalId: "signal-amber" });
    const signal = await handlers.execute("read_latest_signal", {});
    expect(signal).toEqual(expect.objectContaining({
      ok: true,
      data: expect.objectContaining({ signal: expect.objectContaining({ meaning: "not_sure", authorship: "person" }) }),
    }));

    await owner.resetSyntheticDemo();
    await owner.startHumanRehearsal({ expectedProfileRevision: 1, expectedSessionVersion: 1, idempotencyKey: "start-before-stop" });
    await owner.selectSignal({ expectedProfileRevision: 1, expectedSessionVersion: 2, idempotencyKey: "red-stop", signalId: "signal-red" });
    const stopped = await handlers.execute("offer_partner_turn", offerInput(1, 3, "after-stop"));
    expect(stopped).toEqual(expect.objectContaining({ ok: false, code: "SESSION_STOPPED", sessionVersion: 3 }));
    const workspace = await repository.readWorkspace(ids.profileId, ids.sessionId, ids.scenarioId);
    expect(workspace?.session.events.some(({ type }) => type === "partner_turn_accepted")).toBe(false);
  });

  it("starts only an approved ready session and stages provenance without ratification", async () => {
    const started = await handlers.execute("start_approved_rehearsal", {
      expectedProfileRevision: 1,
      expectedSessionVersion: 1,
      scenarioId: ids.scenarioId,
      idempotencyKey: "agent-start",
    });
    expect(started).toEqual(expect.objectContaining({ ok: true, sessionVersion: 2, data: { state: "active" } }));
    const offered = await handlers.execute("offer_partner_turn", offerInput(1, 2, "source-turn")) as { data: { eventId: string }; sessionVersion: number };
    await owner.selectSignal({ expectedProfileRevision: 1, expectedSessionVersion: offered.sessionVersion, idempotencyKey: "stop-before-debrief", signalId: "signal-red" });
    const stoppedWorkspace = await repository.readWorkspace(ids.profileId, ids.sessionId, ids.scenarioId);
    await owner.openDebrief({
      expectedProfileRevision: 1,
      expectedSessionVersion: stoppedWorkspace!.session.sessionVersion,
      idempotencyKey: "open-debrief",
    });
    const debrief = await repository.readWorkspace(ids.profileId, ids.sessionId, ids.scenarioId);
    const staged = await handlers.execute("stage_protocol_patch", {
      expectedProfileRevision: 1,
      expectedSessionVersion: debrief!.session.sessionVersion,
      idempotencyKey: "stage-literal-update",
      proposedRules: [{
        operation: "update",
        targetRuleId: "rule-literal",
        category: "language",
        effect: "require",
        strength: "must",
        contextIds: [],
        controlledValue: "literal_language:true",
        displayText: "Use one short literal sentence at a time.",
      }],
      sourceRehearsalEventIds: [offered.data.eventId],
      rationale: "A more specific wording may help future practice.",
    });
    expect(staged).toEqual(expect.objectContaining({ ok: true, data: expect.objectContaining({ diffs: [expect.objectContaining({ targetRuleId: "rule-literal" })] }) }));
    const workspace = await repository.readWorkspace(ids.profileId, ids.sessionId, ids.scenarioId);
    const suggestion = workspace?.profile.rules.find(({ provenance }) => provenance.sourcePatchId);
    expect(suggestion).toEqual(expect.objectContaining({ status: "draft", agentVisible: false, provenance: expect.objectContaining({ source: "agent_suggestion", sourceEventIds: [offered.data.eventId] }) }));
    expect(workspace?.profile.ratifiedVersion).toBe(1);
    expect("ratify" in handlers).toBe(false);

    const reviewed = await owner.reviewAgentSuggestion({
      expectedProfileRevision: workspace!.profile.revision,
      expectedSessionVersion: workspace!.session.sessionVersion,
      idempotencyKey: "owner-accepts-one-item",
      ruleId: suggestion!.id,
      outcome: "accepted",
    });
    expect(reviewed).toEqual(expect.objectContaining({ ok: true, data: expect.objectContaining({ outcome: "accepted", state: "complete" }) }));
    const reviewedWorkspace = await repository.readWorkspace(ids.profileId, ids.sessionId, ids.scenarioId);
    expect(reviewedWorkspace?.profile.rules.find(({ id }) => id === suggestion!.id)).toEqual(expect.objectContaining({ status: "active", provenance: expect.objectContaining({ acceptedAt: expect.any(String), reviewOutcome: "accepted" }) }));
    expect(reviewedWorkspace?.profile.rules.find(({ id }) => id === "rule-literal")?.status).toBe("retired");
  });

  it("records metadata-only receipts for reads, invalid input, and mutations", async () => {
    await handlers.execute("get_rehearsal_brief", {});
    await handlers.execute("offer_partner_turn", { extra: "private prose must not persist" });
    await owner.startHumanRehearsal({ expectedProfileRevision: 1, expectedSessionVersion: 1, idempotencyKey: "start-before-receipt" });
    await handlers.execute("offer_partner_turn", offerInput(1, 2));
    const receipts = await repository.listReceipts();
    expect(receipts.map(({ toolName }) => toolName)).toEqual(expect.arrayContaining(["get_rehearsal_brief", "offer_partner_turn"]));
    expect(JSON.stringify(receipts)).not.toContain("private prose");
    expect(JSON.stringify(receipts)).not.toContain("community workshop");
  });
});
