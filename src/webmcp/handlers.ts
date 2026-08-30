import { AgentRehearsalService } from "@/application/agent-rehearsal-service";
import { browserCommandDependencies, type CommandDependencies } from "@/application/command-bus";
import type { WorkspaceIds } from "@/application/owner-workflow-service";
import { ProposalService } from "@/application/proposal-service";
import { RehearsalQueryService } from "@/application/rehearsal-query-service";
import { getDatabase } from "@/persistence/db";
import { WorkspaceRepository } from "@/persistence/repository";
import { WebMcpInputSchemas, type HowIChooseToolName } from "@/webmcp/contracts";

export const defaultWorkspaceIds: WorkspaceIds = {
  profileId: "profile-maya",
  sessionId: "session-maya-demo",
  scenarioId: "scenario-community-workshop",
};

export type HandlerDependencies = {
  repository?: WorkspaceRepository;
  ids?: WorkspaceIds;
  commands?: CommandDependencies;
  onInvocation?: (toolName: HowIChooseToolName, mutated: boolean) => void;
};

const mutatingTools = new Set<HowIChooseToolName>([
  "start_approved_rehearsal",
  "offer_partner_turn",
  "stage_protocol_patch",
]);

export class WebMcpHandlers {
  private readonly repository: WorkspaceRepository;
  private readonly ids: WorkspaceIds;
  private readonly agent: AgentRehearsalService;
  private readonly proposals: ProposalService;
  private readonly queries: RehearsalQueryService;

  constructor(private readonly dependencies: HandlerDependencies = {}) {
    this.repository = dependencies.repository ?? new WorkspaceRepository(getDatabase());
    this.ids = dependencies.ids ?? defaultWorkspaceIds;
    const commands = dependencies.commands ?? browserCommandDependencies;
    this.agent = new AgentRehearsalService(this.repository, this.ids, commands);
    this.proposals = new ProposalService(this.repository, this.ids, commands);
    this.queries = new RehearsalQueryService(this.repository, this.ids, commands);
  }

  async execute(toolName: HowIChooseToolName, uncheckedInput: unknown): Promise<unknown> {
    const parsed = WebMcpInputSchemas[toolName].safeParse(uncheckedInput ?? {});
    if (!parsed.success) {
      const result = await this.queries.invalidInput(toolName, parsed.error.issues.slice(0, 12).map((issue) => ({
        code: "INVALID_TOOL_INPUT",
        message: `${issue.path.join(".") || "input"}: ${issue.message}`,
      })));
      this.dependencies.onInvocation?.(toolName, false);
      return result;
    }

    let result: unknown;
    switch (toolName) {
      case "get_rehearsal_brief":
        result = await this.queries.getBrief();
        break;
      case "audit_rehearsal_readiness": {
        const input = WebMcpInputSchemas.audit_rehearsal_readiness.parse(parsed.data);
        result = await this.queries.auditReadiness(input.expectedProfileRevision, input.scenarioId);
        break;
      }
      case "start_approved_rehearsal": {
        const input = WebMcpInputSchemas.start_approved_rehearsal.parse(parsed.data);
        if (input.scenarioId !== this.ids.scenarioId) {
          result = await this.queries.invalidInput(toolName, [{ code: "SCENARIO_NOT_ACTIVE", message: "scenarioId: That scenario is not the active local rehearsal." }]);
        } else {
          result = await this.agent.startApprovedRehearsal({
            expectedProfileRevision: input.expectedProfileRevision,
            expectedSessionVersion: input.expectedSessionVersion,
            idempotencyKey: input.idempotencyKey,
          });
        }
        break;
      }
      case "offer_partner_turn": {
        const input = WebMcpInputSchemas.offer_partner_turn.parse(parsed.data);
        result = await this.agent.offerPartnerTurn({
          expectedProfileRevision: input.expectedProfileRevision,
          expectedSessionVersion: input.expectedSessionVersion,
          idempotencyKey: input.idempotencyKey,
          turn: {
            segments: input.segments,
            intentTags: input.intentTags,
            responseOptions: input.responseOptions,
            channel: input.channel,
            responseTimerSeconds: input.responseTimerSeconds,
            acknowledgesSignalEventId: input.acknowledgesSignalEventId,
            meaningKey: input.meaningKey,
            rationale: input.rationale,
          },
        });
        break;
      }
      case "read_latest_signal":
        result = await this.queries.readLatestSignal();
        break;
      case "get_rehearsal_report":
        result = await this.queries.getReport();
        break;
      case "stage_protocol_patch":
        result = await this.proposals.stageProtocolPatch(WebMcpInputSchemas.stage_protocol_patch.parse(parsed.data));
        break;
      case "verify_support_guide":
        result = await this.queries.verifySupportGuide();
        break;
      default:
        toolName satisfies never;
        throw new Error("UNKNOWN_WEBMCP_TOOL");
    }
    this.dependencies.onInvocation?.(toolName, mutatingTools.has(toolName));
    return result;
  }
}
