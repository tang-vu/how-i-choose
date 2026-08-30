import type {
  RehearsalEvent,
  RehearsalReport,
  RehearsalReportEntrySchema,
  RehearsalSession,
} from "@/domain/rehearsal";
import type { z } from "zod";

type ReportEntry = z.infer<typeof RehearsalReportEntrySchema>;

function entry(
  id: string,
  category: ReportEntry["category"],
  label: string,
  events: readonly RehearsalEvent[],
  ruleIds: readonly string[] = [],
): ReportEntry {
  return {
    id,
    category,
    label,
    evidenceEventIds: events.map(({ id: eventId }) => eventId),
    ruleIds: [...new Set(ruleIds)].toSorted(),
  };
}

export function buildRehearsalReport(
  session: RehearsalSession,
  generatedAt: string,
): RehearsalReport {
  const entries: ReportEntry[] = [];
  const selectedSignals = session.events.filter((event) => event.type === "signal_selected");
  const acknowledgments = session.events.filter((event) => event.type === "signal_acknowledged");
  const acknowledgedIds = new Set(acknowledgments.map(({ signalEventId }) => signalEventId));

  for (const event of session.events) {
    if (event.type === "partner_turn_accepted") {
      entries.push(entry(`report-respected-${event.id}`, "rule_respected", "Partner turn respected active rules", [event], event.ruleIds));
      if (event.repairedViolationEventIds.length > 0) {
        entries.push(entry(`report-repaired-${event.id}`, "violation_repaired", "A rejected turn was repaired", [event]));
      }
    }
    if (event.type === "partner_turn_rejected") {
      entries.push(entry(`report-violated-${event.id}`, "rule_violated", "Partner turn was rejected by the protocol", [event], event.ruleIds));
    }
    if (event.type === "state_changed" && event.to === "paused") {
      entries.push(entry(`report-paused-${event.id}`, "session_paused", "Pause prevented new partner turns", [event]));
    }
    if (event.type === "state_changed" && event.to === "stopped") {
      entries.push(entry(`report-stopped-${event.id}`, "stop_honored", "Stop ended the current rehearsal", [event]));
    }
  }

  for (const signal of selectedSignals) {
    if (acknowledgedIds.has(signal.id)) {
      const acknowledgment = acknowledgments.find(({ signalEventId }) => signalEventId === signal.id);
      entries.push(entry(`report-signal-${signal.id}`, "signal_acknowledged", `Signal '${signal.meaning}' was acknowledged`, acknowledgment ? [signal, acknowledgment] : [signal]));
    } else {
      entries.push(entry(`report-unresolved-${signal.id}`, "signal_still_unresolved", `Signal '${signal.meaning}' still needs acknowledgment`, [signal]));
    }
  }

  const unresolvedSignalEventIds = selectedSignals
    .filter(({ id }) => !acknowledgedIds.has(id))
    .map(({ id }) => id)
    .toSorted();

  return {
    generatedAt,
    profileRevision: session.profileRevision,
    sessionVersion: session.sessionVersion,
    entries,
    unresolvedSignalEventIds,
    needsHumanReview: unresolvedSignalEventIds.length > 0,
  };
}
