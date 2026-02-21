import { Router } from "express";
import { z } from "zod";
import { runAgent } from "../../../agent/index.js";
import type { AgentStep } from "../../../agent/types/index.js";
import { tokenStore, vectorStore } from "../services/singletons.js";
import { initSSE, sendSSEEvent, closeSSE } from "../services/sse.js";

const router = Router();

const RunSchema = z.object({
  task: z.string().min(1).max(2000),
  maxSteps: z.number().int().min(1).max(20).optional().default(10),
});

router.post("/run", async (req, res) => {
  const parsed = RunSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", issues: parsed.error.issues });
    return;
  }

  const { task, maxSteps } = parsed.data;
  initSSE(res);

  const pingInterval = setInterval(() => {
    if (!res.writableEnded) sendSSEEvent(res, { type: "ping" });
  }, 15_000);

  req.on("close", () => clearInterval(pingInterval));

  try {
    const result = await runAgent(
      { task, maxSteps },
      { tokenStore, vectorStore },
      (step: AgentStep) => {
        if (!res.writableEnded) sendSSEEvent(res, { type: "step", data: step });
      }
    );
    if (!res.writableEnded) sendSSEEvent(res, { type: "result", data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Agent Route] Error:", message);
    if (!res.writableEnded) sendSSEEvent(res, { type: "error", data: { message } });
  } finally {
    clearInterval(pingInterval);
    if (!res.writableEnded) closeSSE(res);
  }
});

export default router;