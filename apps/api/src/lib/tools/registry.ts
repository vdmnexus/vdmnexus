// Tool Registry — maps skill names to executable tools for the agentic loop

export interface ToolParameter {
  type: string;
  description: string;
  enum?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
  execute: (input: Record<string, unknown>) => Promise<string>;
}

// Global registry of all available tools
const toolRegistry = new Map<string, ToolDefinition>();

export function registerTool(tool: ToolDefinition): void {
  toolRegistry.set(tool.name, tool);
}

export function getTool(name: string): ToolDefinition | undefined {
  return toolRegistry.get(name);
}

export function getAllTools(): ToolDefinition[] {
  return Array.from(toolRegistry.values());
}

// Get tools relevant for a specific set of skill data-access tags
export function getToolsForDataAccess(dataAccessTags: string[]): ToolDefinition[] {
  if (dataAccessTags.length === 0) return getAllTools();

  // Tools register with tags in their name prefix (e.g., "rushfiles_list_folder")
  // For now, return all tools — we can refine filtering later
  return getAllTools();
}

// Convert tools to Anthropic API format (without the execute function)
export function toolsToAnthropicFormat(tools: ToolDefinition[]): {
  name: string;
  description: string;
  input_schema: ToolDefinition["input_schema"];
}[] {
  return tools.map(({ name, description, input_schema }) => ({
    name,
    description,
    input_schema,
  }));
}
