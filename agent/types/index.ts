export type ToolName =
  | "web_search"
  | "web_scrape"
  | "drive_search"
  | "vector_search"
  | "finish";

export interface ToolDefinition {
  name: ToolName;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

export interface ToolCall {
  id: string;
  name: ToolName;
  input: Record<string, unknown>;
}

export interface ToolResult {
  tool_call_id: string;
  tool_name: ToolName;
  success: boolean;
  output: unknown;
  citation?: Citation;
  error?: string;
}

export interface Citation {
  title: string;
  url?: string;
  snippet?: string;
  source_type: "web" | "drive" | "vector";
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
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface AgentRunOptions {
  task: string;
  maxSteps?: number;
  systemPromptExtra?: string;
}

export type MessageRole = "user" | "assistant";

export interface ContentBlockText {
  type: "text";
  text: string;
}

export interface ContentBlockToolUse {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ContentBlockToolResult {
  type: "tool_result";
  tool_use_id: string;
  content: string;
}

export type ContentBlock =
  | ContentBlockText
  | ContentBlockToolUse
  | ContentBlockToolResult;

export interface Message {
  role: MessageRole;
  content: string | ContentBlock[];
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  content: string;
  modifiedTime: string;
}

export interface VectorChunk {
  id: string;
  file_id: string;
  file_name: string;
  chunk_index: number;
  text: string;
  embedding: number[];
  url?: string;
}