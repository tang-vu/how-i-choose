import { describe, expect, it } from "vitest";

import { buildRehearsalReport } from "@/domain/report-engine";
import type { RehearsalEvent } from "@/domain/rehearsal";
import { mayaSession, validMayaTurn } from "@/fixtures/maya";

const at = "2026-08-31T00:00:00.000Z";

describe("partner adherence report", () => {
  it("reports violations, repairs, signals, pause, and stop without person scores", () => {
    const events: RehearsalEvent[] = [
      { id: "event-rejected", sequence: 0, at, actor: "agent", type: "partner_turn_rejected", violationCodes: ["QUESTION_COUNT"], ruleIds: ["rule-one-question"] },
      { id: "event-accepted", sequence: 1, at, actor: "agent", type: "partner_turn_accepted", turn: validMayaTurn, ruleIds: ["rule-one-question"], repairedViolationEventIds: ["event-rejected"] },
      { id: "event-signal", sequence: 2, at, actor: "owner", type: "signal_selected", signalId: "signal-amber", meaning: "not_sure", consumed: true },
      { id: "event-ack", sequence: 3, at, actor: "agent", type: "signal_acknowledged", signalEventId: "event-signal" },
      { id: "event-paused", sequence: 4, at, actor: "owner", type: "state_changed", from: "active", to: "paused" },
      { id: "event-stopped", sequence: 5, at, actor: "owner", type: "state_changed", from: "paused", to: "stopped" },
    ];
    const report = buildRehearsalReport({ ...mayaSession, sessionVersion: 7, state: "stopped", events }, at);
    const categories = report.entries.map(({ category }) => category);

    expect(categories).toEqual(expect.arrayContaining([
      "rule_violated",
      "rule_respected",
      "violation_repaired",
      "signal_acknowledged",
      "session_paused",
      "stop_honored",
    ]));
    expect(report.unresolvedSignalEventIds).toEqual([]);
    expect(JSON.stringify(report)).not.toMatch(/personScore|capacityScore|consentScore|comprehensionScore|consistencyScore/i);
  });

  it("keeps unacknowledged signals visibly unresolved", () => {
    const signal: RehearsalEvent = {
      id: "event-blue",
      sequence: 0,
      at,
      actor: "owner",
      type: "signal_selected",
      signalId: "signal-blue",
      meaning: "need_more_time",
      consumed: false,
    };
    const report = buildRehearsalReport({ ...mayaSession, events: [signal] }, at);
    expect(report.unresolvedSignalEventIds).toEqual(["event-blue"]);
    expect(report.needsHumanReview).toBe(true);
  });

  it("links an explicit acknowledgment to an unconsumed signal", () => {
    const signal: RehearsalEvent = {
      id: "event-purple",
      sequence: 0,
      at,
      actor: "owner",
      type: "signal_selected",
      signalId: "signal-purple",
      meaning: "need_information",
      consumed: false,
    };
    const acknowledgment: RehearsalEvent = {
      id: "event-purple-ack",
      sequence: 1,
      at,
      actor: "agent",
      type: "signal_acknowledged",
      signalEventId: signal.id,
    };
    const accepted: RehearsalEvent = {
      id: "event-clean-turn",
      sequence: 2,
      at,
      actor: "agent",
      type: "partner_turn_accepted",
      turn: validMayaTurn,
      ruleIds: [],
      repairedViolationEventIds: [],
    };
    const report = buildRehearsalReport({ ...mayaSession, events: [signal, acknowledgment, accepted] }, at);
    expect(report.unresolvedSignalEventIds).toEqual([]);
    expect(report.entries).toContainEqual(expect.objectContaining({
      category: "signal_acknowledged",
      evidenceEventIds: [signal.id, acknowledgment.id],
    }));
    expect(report.entries.some(({ category }) => category === "violation_repaired")).toBe(false);
  });

  it("records a consumed owner signal even without a separate agent acknowledgment", () => {
    const signal: RehearsalEvent = {
      id: "event-red",
      sequence: 0,
      at,
      actor: "owner",
      type: "signal_selected",
      signalId: "signal-red",
      meaning: "stop",
      consumed: true,
    };
    const report = buildRehearsalReport({ ...mayaSession, events: [signal] }, at);
    expect(report.entries).toContainEqual(expect.objectContaining({
      category: "signal_acknowledged",
      evidenceEventIds: [signal.id],
    }));
    expect(report.needsHumanReview).toBe(false);
  });
});
