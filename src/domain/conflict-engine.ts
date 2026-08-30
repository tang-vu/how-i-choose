import type { CommunicationRule } from "@/domain/profile";

export type RuleConflict = {
  id: string;
  ruleIds: [string, string];
  category: CommunicationRule["category"];
  policyKey: string;
  reason: "different_required_values" | "opposing_effects";
};

const opposingEffects = new Set(["block:require", "require:block", "avoid:prefer", "prefer:avoid"]);

export function policyKey(rule: CommunicationRule): string {
  if (rule.category === "channel") return "channel";
  return `${rule.category}:${rule.controlledValue.split(":", 1)[0]}`;
}

function contextsOverlap(left: CommunicationRule, right: CommunicationRule): boolean {
  if (left.contextIds.length === 0 || right.contextIds.length === 0) return true;
  return left.contextIds.some((contextId) => right.contextIds.includes(contextId));
}

function conflictReason(
  left: CommunicationRule,
  right: CommunicationRule,
): RuleConflict["reason"] | null {
  if (opposingEffects.has(`${left.effect}:${right.effect}`) && left.controlledValue === right.controlledValue) {
    return "opposing_effects";
  }
  if (
    left.controlledValue !== right.controlledValue &&
    ((left.effect === "require" && right.effect === "require") ||
      (left.effect === "prefer" && right.effect === "prefer"))
  ) {
    return "different_required_values";
  }
  return null;
}

export function findActiveRuleConflicts(rules: readonly CommunicationRule[]): RuleConflict[] {
  const active = rules
    .filter(({ status }) => status === "active")
    .toSorted((left, right) => left.id.localeCompare(right.id));
  const conflicts: RuleConflict[] = [];

  for (let leftIndex = 0; leftIndex < active.length; leftIndex += 1) {
    const left = active[leftIndex];
    if (!left) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < active.length; rightIndex += 1) {
      const right = active[rightIndex];
      if (!right) continue;
      if (
        left.strength !== right.strength ||
        left.category !== right.category ||
        policyKey(left) !== policyKey(right) ||
        !contextsOverlap(left, right)
      ) {
        continue;
      }
      const reason = conflictReason(left, right);
      if (!reason) continue;
      const ruleIds: [string, string] = [left.id, right.id];
      conflicts.push({
        id: `conflict-${ruleIds.join("-")}`,
        ruleIds,
        category: left.category,
        policyKey: policyKey(left),
        reason,
      });
    }
  }

  return conflicts;
}
