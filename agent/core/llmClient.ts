import OpenAI from "openai";
import type { ToolDefinition, ToolCall, Message } from "../types/index.js";

const MODEL = "gpt-4o-mini";

export interface LLMResponse {
  toolCalls: ToolCall[];
  textContent: string;
  stopReason: "tool_calls" | "stop" | "length" | string;
  usage: { input_tokens: number; output_tokens: number };
  rawAssistantMessage: OpenAI.ChatCompletionMessage;
}

export class LLMClient {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set in environment variables.");
    this.client = new OpenAI({ apiKey });
  }

  async complete(
    systemPrompt: string,
    messages: Message[],
    tools: ToolDefinition[]
  ): Promise<LLMResponse> {
    const oaiMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...messages.flatMap((m) => {
        const converted = messageToOpenAI(m);
        return Array.isArray(converted) ? converted : [converted];
      }),
    ];

    const oaiTools: OpenAI.ChatCompletionTool[] = tools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      },
    }));

    const response = await this.client.chat.completions.create({
      model: MODEL,
      messages: oaiMessages,
      tools: oaiTools,
      tool_choice: "auto",
    });

    const choice = response.choices[0];
    const msg = choice.message;

    const toolCalls: ToolCall[] = (msg.tool_calls ?? []).map((tc) => ({
      id: tc.id,
      name: tc.function.name as ToolCall["name"],
      input: JSON.parse(tc.function.arguments) as Record<string, unknown>,
    }));

    return {
      toolCalls,
      textContent: msg.content ?? "",
      stopReason: choice.finish_reason ?? "stop",
      usage: {
        input_tokens: response.usage?.prompt_tokens ?? 0,
        output_tokens: response.usage?.completion_tokens ?? 0,
      },
      rawAssistantMessage: msg,
    };
  }
}

function messageToOpenAI(
  m: Message
): OpenAI.ChatCompletionMessageParam | OpenAI.ChatCompletionMessageParam[] {
  const c = m.content as unknown;

  if (c && typeof c === "object" && "_oai" in (c as object)) {
    return (c as { raw: OpenAI.ChatCompletionMessage })
      .raw as unknown as OpenAI.ChatCompletionMessageParam;
  }

  if (c && typeof c === "object" && "_tool_result" in (c as object)) {
    const tr = c as { tool_call_id: string; content: string };
    return { role: "tool" as const, tool_call_id: tr.tool_call_id, content: tr.content };
  }

  if (typeof m.content === "string") {
    return { role: m.role as "user" | "assistant" | "system", content: m.content };
  }

  return { role: m.role as "user", content: "" };
}

export function buildInitialUserMessage(task: string): Message {
  return {
    role: "user",
    content: `Please complete the following task:\n\n${task}`,
  };
}

export function buildAssistantMessage(rawMsg: OpenAI.ChatCompletionMessage): Message {
  return {
    role: "assistant",
    content: { _oai: true, raw: rawMsg } as unknown as string,
  };
}

export function buildToolResultMessages(
  toolResults: Array<{ tool_call_id: string; output: unknown; success: boolean }>
): Message[] {
  return toolResults.map((r) => ({
    role: "user" as const,
    content: {
      _tool_result: true,
      tool_call_id: r.tool_call_id,
      content: r.success
        ? JSON.stringify(r.output, null, 2)
        : `ERROR: ${String(r.output)}`,
    } as unknown as string,
  }));
}