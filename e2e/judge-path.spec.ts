import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

type ToolResult<T = unknown> = {
  ok: boolean;
  code: string;
  profileRevision: number;
  sessionVersion: number;
  data: T | null;
  violations: Array<{ code: string }>;
};

async function installModelContext(page: Page) {
  await page.addInitScript(() => {
    const tools: Array<{ name: string; execute(input: unknown): Promise<unknown> }> = [];
    Object.defineProperty(window, "__judgeTools", { value: tools, configurable: true });
    Object.defineProperty(Document.prototype, "modelContext", {
      configurable: true,
      get() {
        return {
          registerTool(tool: { name: string; execute(input: unknown): Promise<unknown> }) {
            tools.push(tool);
            return Promise.resolve();
          },
        };
      },
    });
  });
}

async function callTool<T>(page: Page, name: string, input: unknown): Promise<ToolResult<T>> {
  return page.evaluate(async ({ toolName, toolInput }) => {
    const tools = (window as unknown as { __judgeTools: Array<{ name: string; execute(input: unknown): Promise<unknown> }> }).__judgeTools;
    const tool = tools.find(({ name }) => name === toolName);
    if (!tool) throw new Error(`Tool not registered: ${toolName}`);
    return tool.execute(toolInput);
  }, { toolName: name, toolInput: input }) as Promise<ToolResult<T>>;
}

function validTurnInput(profileRevision: number, sessionVersion: number, idempotencyKey: string) {
  return {
    expectedProfileRevision: profileRevision,
    expectedSessionVersion: sessionVersion,
    idempotencyKey,
    segments: [{ kind: "question", text: "Would morning or afternoon work better?" }],
    intentTags: ["choice"],
    responseOptions: [
      { id: "morning", label: "Morning", value: "morning", preselected: false },
      { id: "afternoon", label: "Afternoon", value: "afternoon", preselected: false },
    ],
    channel: "text",
    responseTimerSeconds: null,
    meaningKey: "choose-workshop-time",
    rationale: "One short literal question with two uniform options.",
  };
}

test("the complete synthetic Maya judge path preserves owner authority", async ({ page }) => {
  await installModelContext(page);
  await page.goto("/demo/");
  const continueButton = page.getByRole("button", { name: "Continue with current local data" });
  if (await continueButton.isVisible()) await continueButton.click();
  await page.getByRole("button", { name: "Reset judge demo" }).click();
  await expect(page.locator(".revision-strip")).toContainText("ready · v1");
  await expect(page.getByText("Site tools available", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Agent rehearsal" }).click();
  await expect(page.locator(".revision-strip")).toContainText("ready · v2");

  const brief = await callTool<{ sessionState: string; validNextActions: string[] }>(page, "get_rehearsal_brief", {});
  expect(brief).toEqual(expect.objectContaining({ ok: true, profileRevision: 1, sessionVersion: 2 }));
  expect(brief.data).toEqual(expect.objectContaining({ sessionState: "ready", validNextActions: expect.arrayContaining(["start_approved_rehearsal"]) }));

  const audit = await callTool<{ readyForOwnerReview: boolean; approvedForAgentStart: boolean }>(page, "audit_rehearsal_readiness", {
    expectedProfileRevision: 1,
    scenarioId: "scenario-community-workshop",
  });
  expect(audit.data).toEqual(expect.objectContaining({ readyForOwnerReview: true, approvedForAgentStart: true }));

  const started = await callTool<{ state: string }>(page, "start_approved_rehearsal", {
    expectedProfileRevision: 1,
    expectedSessionVersion: 2,
    scenarioId: "scenario-community-workshop",
    idempotencyKey: "judge-start",
  });
  expect(started).toEqual(expect.objectContaining({ ok: true, sessionVersion: 3, data: { state: "active" } }));

  const invalid = {
    ...validTurnInput(1, 3, "judge-invalid-long-two-question"),
    segments: [
      { kind: "question", text: "Would you prefer the morning workshop or the afternoon workshop for this community event?" },
      { kind: "question", text: "Would you also like a text reminder or a calendar reminder for the workshop?" },
    ],
  };
  const rejected = await callTool(page, "offer_partner_turn", invalid);
  expect(rejected).toEqual(expect.objectContaining({ ok: false, code: "INVALID_PARTNER_TURN", sessionVersion: 4 }));
  expect(rejected.violations.map(({ code }) => code)).toEqual(expect.arrayContaining(["QUESTION_COUNT", "QUESTION_WORD_LIMIT"]));

  const repaired = await callTool<{ eventId: string }>(page, "offer_partner_turn", validTurnInput(1, 4, "judge-repaired-turn"));
  expect(repaired).toEqual(expect.objectContaining({ ok: true, sessionVersion: 5, data: expect.objectContaining({ eventId: expect.any(String) }) }));
  await expect(page.locator(".turn-list")).toContainText("Would morning or afternoon work better?");

  await page.getByRole("button", { name: /Amber — not sure/ }).click();
  await expect(page.locator(".safety-bar")).toContainText("Pending: not sure");
  const signal = await callTool<{ signal: { eventId: string; meaning: string; authorship: string } }>(page, "read_latest_signal", {});
  expect(signal.data?.signal).toEqual(expect.objectContaining({ meaning: "not_sure", authorship: "person" }));

  const rephrased = await callTool<{ eventId: string }>(page, "offer_partner_turn", {
    expectedProfileRevision: 1,
    expectedSessionVersion: 6,
    idempotencyKey: "judge-acknowledge-amber",
    segments: [{ kind: "question", text: "Is morning or afternoon a better time?" }],
    intentTags: ["acknowledge", "rephrase"],
    responseOptions: [
      { id: "morning-rephrased", label: "Morning", value: "morning", preselected: false },
      { id: "afternoon-rephrased", label: "Afternoon", value: "afternoon", preselected: false },
    ],
    channel: "text",
    responseTimerSeconds: null,
    acknowledgesSignalEventId: signal.data!.signal.eventId,
    meaningKey: "choose-workshop-time",
    rationale: "Acknowledges uncertainty and asks the same choice differently.",
  });
  expect(rephrased).toEqual(expect.objectContaining({ ok: true, sessionVersion: 7 }));
  await expect(page.locator(".turn-list")).toContainText("Is morning or afternoon a better time?");

  await page.getByLabel("Allowed communication channels").selectOption("text");
  await expect(page.locator(".revision-strip")).toContainText("revision 2");
  await expect(page.getByLabel("Allowed communication channels")).toHaveValue("text");

  const stale = await callTool(page, "offer_partner_turn", validTurnInput(1, 7, "judge-stale-after-owner-edit"));
  expect(stale).toEqual(expect.objectContaining({ ok: false, code: "STALE_PROFILE_REVISION", profileRevision: 2, sessionVersion: 8 }));
  const refreshed = await callTool<{ communicationRules: Array<{ category: string; controlledValue: string }> }>(page, "get_rehearsal_brief", {});
  expect(refreshed.data?.communicationRules).toEqual(expect.arrayContaining([expect.objectContaining({ category: "channel", controlledValue: "text" })]));

  const adapted = await callTool<{ eventId: string }>(page, "offer_partner_turn", {
    expectedProfileRevision: 2,
    expectedSessionVersion: 8,
    idempotencyKey: "judge-adapted-text-only-turn",
    segments: [{ kind: "question", text: "Would a text or calendar reminder help?" }],
    intentTags: ["choice"],
    responseOptions: [
      { id: "text-reminder", label: "Text reminder", value: "text-reminder", preselected: false },
      { id: "calendar-reminder", label: "Calendar reminder", value: "calendar-reminder", preselected: false },
    ],
    channel: "text",
    responseTimerSeconds: null,
    meaningKey: "choose-reminder-method",
    rationale: "Uses the refreshed text-only channel rule.",
  });
  expect(adapted).toEqual(expect.objectContaining({ ok: true, sessionVersion: 9 }));

  await page.getByRole("button", { name: "Stop", exact: true }).first().click();
  await expect(page.getByText("Stopped.", { exact: true })).toBeVisible();
  const blocked = await callTool(page, "offer_partner_turn", validTurnInput(2, 10, "judge-turn-after-stop"));
  expect(blocked).toEqual(expect.objectContaining({ ok: false, code: "SESSION_STOPPED", sessionVersion: 10 }));

  const report = await callTool<{ report: { entries: Array<{ category: string }> }; subject: string }>(page, "get_rehearsal_report", {});
  const categories = report.data!.report.entries.map(({ category }) => category);
  expect(report.data?.subject).toBe("communication_partner_adherence");
  expect(categories).toEqual(expect.arrayContaining(["rule_violated", "violation_repaired", "signal_acknowledged", "stop_honored", "revision_conflict_recovered"]));

  const stoppedA11y = await new AxeBuilder({ page }).analyze();
  expect(stoppedA11y.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);

  await page.getByRole("button", { name: "Open debrief" }).click();
  await expect(page.locator(".revision-strip")).toContainText("debrief · v11");
  const staged = await callTool<{ patchId: string; diffs: Array<{ before: { displayText: string }; after: { displayText: string } }> }>(page, "stage_protocol_patch", {
    expectedProfileRevision: 2,
    expectedSessionVersion: 11,
    idempotencyKey: "judge-stage-one-improvement",
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
    sourceRehearsalEventIds: [adapted.data!.eventId],
    rationale: "The accepted turns show that one sentence at a time is easier to audit.",
  });
  expect(staged).toEqual(expect.objectContaining({ ok: true, profileRevision: 3, sessionVersion: 12 }));
  expect(staged.data?.diffs[0]).toEqual(expect.objectContaining({ before: expect.objectContaining({ displayText: "Use short, literal sentences." }), after: expect.objectContaining({ displayText: "Use one short literal sentence at a time." }) }));
  const patchPanel = page.locator(".patch-panel");
  await expect(patchPanel).toContainText("Use short, literal sentences.");
  await expect(patchPanel).toContainText("Use one short literal sentence at a time.");
  await patchPanel.getByRole("button", { name: "Accept" }).click();
  await expect(page.locator(".revision-strip")).toContainText("complete · v13");

  const verified = await callTool<{ derivationValid: boolean; draftWatermarkRequired: boolean; guideProfileRevision: number }>(page, "verify_support_guide", {});
  expect(verified.data).toEqual(expect.objectContaining({ derivationValid: true, draftWatermarkRequired: true, guideProfileRevision: 4 }));
  const ratify = page.getByRole("button", { name: "Ratify visible draft" });
  await expect(ratify).toBeEnabled();
  await ratify.click();
  await expect(page.locator(".revision-strip")).toContainText("version 2");
  await expect(page.getByText("Draft · visible owner review required", { exact: true })).toHaveCount(0);

  const reviewedA11y = await new AxeBuilder({ page }).analyze();
  expect(reviewedA11y.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
});
