// Tool registration — call this once at startup
import { registerRushFilesTools } from "./rushfiles.js";
import { registerBrowserTools } from "./browser.js";

export { getTool, getAllTools, getToolsForDataAccess, toolsToAnthropicFormat } from "./registry.js";
export type { ToolDefinition } from "./registry.js";

export function registerAllTools(): void {
  registerRushFilesTools();
  registerBrowserTools();
  // Register more tool sets here as they're built:
  // registerEmailTools();
  // registerCalendarTools();
}
