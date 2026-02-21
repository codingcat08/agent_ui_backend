import {
  LLMClient,
  buildInitialUserMessage,
  buildAssistantMessage,
  buildToolResultMessages,
} from "./llmClient.js";
import { buildSystemPrompt } from "./systemPrompt.js";
import { TOOL_DEFINITIONS } from "../tools/definitions.js";
import { executeToolCalls } from "../tools/executor.js";

import type {
  AgentRunOptions,
  AgentResult,
  AgentStep,
  Citation,
  Message,
  ToolResult,
} from "../types/index.js";
import type { DriveTokenStore } from "./driveTokenStore.js";
import type { VectorStore } from "../vector/vectorStore.js";

const DEFAULT_MAX_STEPS = 10;

export interface AgentLoopDeps {
  tokenStore: DriveTokenStore;
  vectorStore: VectorStore;
}

export type StepCallback = (step: AgentStep) => void;

export async function runAgent(
  options: AgentRunOptions,
  deps: AgentLoopDeps,
  onStep?: StepCallback
): Promise<AgentResult> {
  const { task, maxSteps = DEFAULT_MAX_STEPS, systemPromptExtra } = options;

  const llm = new LLMClient();
  const systemPrompt = buildSystemPrompt(systemPromptExtra);
  const messages: Message[] = [buildInitialUserMessage(task)];

  const allSteps: AgentStep[] = [];
  const allCitations: Citation[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let finishedNaturally = false;
  let finalAnswer = "";

  for (let stepNum = 1; stepNum <= maxSteps; stepNum++) {
    console.log(`\n[Agent] ── Step ${stepNum}/${maxSteps} ──`);

    let llmResponse;
    try {
      llmResponse = await llm.complete(systemPrompt, messages, TOOL_DEFINITIONS);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Agent] LLM call failed at step ${stepNum}:`, message);
      break;
    }

    totalInputTokens += llmResponse.usage.input_tokens;
    totalOutputTokens += llmResponse.usage.output_tokens;

    console.log(`[Agent] Stop: ${llmResponse.stopReason} | Tools: ${llmResponse.toolCalls.length}`);

    const finishCall = llmResponse.toolCalls.find((tc) => tc.name === "finish");
    const otherCalls = llmResponse.toolCalls.filter((tc) => tc.name !== "finish");

    if (finishCall) {
      console.log("[Agent] Finish tool called.");
      const finishInput = finishCall.input as {
        answer: string;
        sources_used?: Array<{
          title: string;
          url?: string;
          snippet?: string;
          source_type: "web" | "drive" | "vector";
        }>;
      };

      finalAnswer = finishInput.answer ?? "";
      allCitations.push(
        ...(finishInput.sources_used ?? []).map((s) => ({
          title: s.title,
          url: s.url,
          snippet: s.snippet,
          source_type: s.source_type,
        }))
      );

      const finalStep: AgentStep = {
        step_number: stepNum,
        thought: llmResponse.textContent || undefined,
        tool_calls: [finishCall],
        tool_results: [],
        raw_llm_response: llmResponse.textContent,
      };
      allSteps.push(finalStep);
      onStep?.(finalStep);
      finishedNaturally = true;
      break;
    }

    if (otherCalls.length === 0) {
      console.log("[Agent] No tool calls – using text as answer.");
      finalAnswer = llmResponse.textContent;
      const finalStep: AgentStep = {
        step_number: stepNum,
        thought: llmResponse.textContent,
        tool_calls: [],
        tool_results: [],
        raw_llm_response: llmResponse.textContent,
      };
      allSteps.push(finalStep);
      onStep?.(finalStep);
      finishedNaturally = true;
      break;
    }

    console.log(`[Agent] Executing: ${otherCalls.map((tc) => tc.name).join(", ")}`);
    const toolResults: ToolResult[] = await executeToolCalls(otherCalls, deps);

    for (const result of toolResults) {
      if (result.citation) allCitations.push(result.citation);
      if (!result.success) console.warn(`[Agent] ${result.tool_name} failed: ${result.error}`);
    }

    const step: AgentStep = {
      step_number: stepNum,
      thought: llmResponse.textContent || undefined,
      tool_calls: otherCalls,
      tool_results: toolResults,
      raw_llm_response: llmResponse.textContent,
    };
    allSteps.push(step);
    onStep?.(step);

    messages.push(buildAssistantMessage(llmResponse.rawAssistantMessage));
    messages.push(
      ...buildToolResultMessages(
        toolResults.map((r) => ({
          tool_call_id: r.tool_call_id,
          output: r.success ? r.output : { error: r.error },
          success: r.success,
        }))
      )
    );
  }

  const seen = new Set<string>();
  const uniqueCitations = allCitations.filter((c) => {
    const key = c.url ?? c.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    task,
    answer:
      finalAnswer ||
      "The agent reached the step limit without a final answer. Review the steps for partial results.",
    citations: uniqueCitations,
    steps: allSteps,
    total_steps: allSteps.length,
    finished_naturally: finishedNaturally,
    usage: {
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
    },
  };
}