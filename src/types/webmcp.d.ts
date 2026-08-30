export {};

declare global {
  interface WebMcpToolAnnotations {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  }

  interface WebMcpToolDefinition {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    annotations?: WebMcpToolAnnotations;
    execute: (input: unknown) => Promise<unknown> | unknown;
  }

  interface ModelContext {
    registerTool(tool: WebMcpToolDefinition): Promise<void> | void;
  }

  interface Document {
    modelContext?: ModelContext;
  }
}
