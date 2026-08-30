import {
  readOnlyTools,
  toolDescriptions,
  WebMcpJsonSchemas,
  type HowIChooseToolName,
} from "@/webmcp/contracts";
import { WebMcpHandlers, type HandlerDependencies } from "@/webmcp/handlers";

export const HOW_I_CHOOSE_TOOL_NAMES = [
  "get_rehearsal_brief",
  "audit_rehearsal_readiness",
  "start_approved_rehearsal",
  "offer_partner_turn",
  "read_latest_signal",
  "get_rehearsal_report",
  "stage_protocol_patch",
  "verify_support_guide",
] as const satisfies readonly HowIChooseToolName[];

const registrations = new WeakMap<Document, Promise<boolean>>();

export function isTopLevelDocument(target: Document): boolean {
  const view = target.defaultView;
  if (!view) return true;
  try {
    return view.top === view.self;
  } catch {
    return false;
  }
}

export function registerHowIChooseTools(
  target: Document,
  dependencies: HandlerDependencies = {},
): Promise<boolean> {
  const previous = registrations.get(target);
  if (previous) return previous;
  const registration = register(target, dependencies);
  registrations.set(target, registration);
  return registration;
}

async function register(target: Document, dependencies: HandlerDependencies): Promise<boolean> {
  if (!isTopLevelDocument(target) || typeof target.modelContext?.registerTool !== "function") return false;
  const handlers = new WebMcpHandlers(dependencies);
  for (const name of HOW_I_CHOOSE_TOOL_NAMES) {
    const readOnly = readOnlyTools.has(name);
    await target.modelContext.registerTool({
      name,
      description: toolDescriptions[name],
      inputSchema: WebMcpJsonSchemas[name],
      annotations: {
        readOnlyHint: readOnly,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      execute: (input) => handlers.execute(name, input),
    });
  }
  return true;
}
