export interface Citation {
  title: string;
  url?: string;
  snippet?: string;
  source_type: "web" | "drive" | "vector";
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  tool_call_id: string;
  tool_name: string;
  success: boolean;
  output: unknown;
  citation?: Citation;
  error?: string;
}

export interface AgentStep {
  step_number: number;
  thought?: string;
  tool_calls: ToolCall[];
  tool_results: ToolResult[];
  raw_llm_response?: string;
}

export interface AgentResult {
  task: string;
  answer: string;
  citations: Citation[];
  steps: AgentStep[];
  total_steps: number;
  finished_naturally: boolean;
  usage: { input_tokens: number; output_tokens: number };
}

export interface DriveStatus {
  connected: boolean;
  vectorStoreChunks: number;
  vectorStoreFiles: number;
  lastIngestion: string | null;
}

export type SSEEvent =
  | { type: "step"; data: AgentStep }
  | { type: "result"; data: AgentResult }
  | { type: "error"; data: { message: string } }
  | { type: "ping" };