export { runAgent } from "./core/agentLoop.js";
export type { AgentLoopDeps, StepCallback } from "./core/agentLoop.js";

export { DriveTokenStore } from "./core/driveTokenStore.js";
export type { OAuthTokens } from "./core/driveTokenStore.js";

export { VectorStore } from "./vector/vectorStore.js";
export { ingestAllDriveFiles, ingestIncrementalDriveFiles } from "./vector/ingestion.js";
export type { IngestionProgress } from "./vector/ingestion.js";

export type {
  AgentRunOptions,
  AgentResult,
  AgentStep,
  ToolResult,
  Citation,
} from "./types/index.js";