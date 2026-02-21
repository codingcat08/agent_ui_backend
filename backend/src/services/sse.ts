import type { Response } from "express";
import type { AgentStep, AgentResult } from "../../../agent/types/index.js";

export type SSEEvent =
  | { type: "step"; data: AgentStep }
  | { type: "result"; data: AgentResult }
  | { type: "error"; data: { message: string } }
  | { type: "ping" };

export function initSSE(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
}

export function sendSSEEvent(res: Response, event: SSEEvent): void {
  const payload = JSON.stringify(event);
  res.write(`data: ${payload}\n\n`);
  if (typeof (res as unknown as { flush?: () => void }).flush === "function") {
    (res as unknown as { flush: () => void }).flush();
  }
}

export function closeSSE(res: Response): void {
  res.write("data: [DONE]\n\n");
  res.end();
}