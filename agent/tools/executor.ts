import type { ToolCall, ToolResult } from "../types/index.js";
import type { DriveTokenStore } from "../core/driveTokenStore.js";
import type { VectorStore } from "../vector/vectorStore.js";

import { runWebSearch } from "./webSearch.js";
import { runWebScrape } from "./webScrape.js";
import { runDriveSearch } from "./driveSearch.js";
import { runVectorSearch } from "./vectorSearch.js";

export interface ToolExecutorDeps {
  tokenStore: DriveTokenStore;
  vectorStore: VectorStore;
}

export async function executeToolCall(
  toolCall: ToolCall,
  deps: ToolExecutorDeps
): Promise<ToolResult> {
  const { id, name, input } = toolCall;

  switch (name) {
    case "web_search":
      //return runWebSearch(id, input as Parameters<typeof runWebSearch>[1]);
      return runWebSearch(id, input as unknown as Parameters<typeof runWebSearch>[1]);
    case "web_scrape":
      //return runWebScrape(id, input as Parameters<typeof runWebScrape>[1]);
      return runWebScrape(id, input as unknown as Parameters<typeof runWebScrape>[1]);
    case "drive_search":
      //return runDriveSearch(id, input as Parameters<typeof runDriveSearch>[1], deps.tokenStore);
      return runDriveSearch(id, input as unknown as Parameters<typeof runDriveSearch>[1], deps.tokenStore);
    case "vector_search":
      //return runVectorSearch(id, input as Parameters<typeof runVectorSearch>[1], deps.vectorStore);
      return runVectorSearch(id, input as unknown as Parameters<typeof runVectorSearch>[1], deps.vectorStore);
    default:
      return {
        tool_call_id: id,
        tool_name: name,
        success: false,
        output: null,
        error: `Unknown tool: ${name as string}`,
      };
  }
}

export async function executeToolCalls(
  toolCalls: ToolCall[],
  deps: ToolExecutorDeps
): Promise<ToolResult[]> {
  return Promise.all(toolCalls.map((tc) => executeToolCall(tc, deps)));
}