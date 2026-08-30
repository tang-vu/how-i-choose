import { expect, test } from "@playwright/test";

const forbiddenTools = [
  "set_user_signal",
  "answer_for_user",
  "ratify",
  "publish",
  "share",
  "export_private_profile",
  "contact_supporter",
  "assess_capacity",
  "verify_consent",
  "delete_profile",
];

test("top-level imperative tools register once and render a repaired agent turn", async ({ page }) => {
  await page.addInitScript(() => {
    const tools: Array<{ name: string; execute(input: unknown): Promise<unknown> }> = [];
    Object.defineProperty(window, "__howIChooseTools", { value: tools, configurable: true });
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
  await page.goto("/demo/");
  const continueButton = page.getByRole("button", { name: "Continue with current local data" });
  if (await continueButton.isVisible()) await continueButton.click();
  await expect(page.getByText("Site tools available", { exact: true })).toBeVisible();

  const names = await page.evaluate(() => (window as unknown as { __howIChooseTools: Array<{ name: string }> }).__howIChooseTools.map(({ name }) => name));
  expect(names).toHaveLength(8);
  expect(new Set(names).size).toBe(8);
  expect(names.filter((name) => forbiddenTools.includes(name))).toEqual([]);

  const brief = await page.evaluate(async () => {
    const tool = (window as unknown as { __howIChooseTools: Array<{ name: string; execute(input: unknown): Promise<unknown> }> }).__howIChooseTools.find(({ name }) => name === "get_rehearsal_brief")!;
    return tool.execute({});
  }) as { ok: boolean; profileRevision: number; sessionVersion: number };
  expect(brief).toEqual(expect.objectContaining({ ok: true, profileRevision: 1, sessionVersion: 1 }));

  const rejected = await page.evaluate(async () => {
    const tool = (window as unknown as { __howIChooseTools: Array<{ name: string; execute(input: unknown): Promise<unknown> }> }).__howIChooseTools.find(({ name }) => name === "offer_partner_turn")!;
    return tool.execute({
      expectedProfileRevision: 1,
      expectedSessionVersion: 1,
      idempotencyKey: "browser-invalid-turn",
      segments: [
        { kind: "question", text: "Would you prefer the morning workshop or the afternoon workshop for this community event?" },
        { kind: "question", text: "Which reminder method should I add for you?" },
      ],
      intentTags: ["choice"],
      responseOptions: [
        { id: "morning", label: "Morning", value: "morning", preselected: false },
        { id: "afternoon", label: "Afternoon", value: "afternoon", preselected: false },
      ],
      channel: "text",
      responseTimerSeconds: null,
      rationale: "Intentional invalid demonstration turn.",
    });
  }) as { ok: boolean; code: string; sessionVersion: number; violations: Array<{ code: string }> };
  expect(rejected).toEqual(expect.objectContaining({ ok: false, code: "INVALID_PARTNER_TURN", sessionVersion: 2 }));
  expect(rejected.violations.map(({ code }) => code)).toEqual(expect.arrayContaining(["QUESTION_COUNT", "QUESTION_WORD_LIMIT"]));

  const repaired = await page.evaluate(async () => {
    const tool = (window as unknown as { __howIChooseTools: Array<{ name: string; execute(input: unknown): Promise<unknown> }> }).__howIChooseTools.find(({ name }) => name === "offer_partner_turn")!;
    return tool.execute({
      expectedProfileRevision: 1,
      expectedSessionVersion: 2,
      idempotencyKey: "browser-repaired-turn",
      segments: [{ kind: "question", text: "Would morning or afternoon work better?" }],
      intentTags: ["choice"],
      responseOptions: [
        { id: "morning", label: "Morning", value: "morning", preselected: false },
        { id: "afternoon", label: "Afternoon", value: "afternoon", preselected: false },
      ],
      channel: "text",
      responseTimerSeconds: null,
      meaningKey: "choose-workshop-time",
      rationale: "Repaired to one short literal question.",
    });
  }) as { ok: boolean; sessionVersion: number };
  expect(repaired).toEqual(expect.objectContaining({ ok: true, sessionVersion: 3 }));

  await page.getByRole("button", { name: "Agent rehearsal" }).click();
  await expect(page.locator(".turn-list")).toContainText("Would morning or afternoon work better?");
  await expect(page.getByText(/INVALID_PARTNER_TURN/)).toBeVisible();
});
