import { Router } from "express";
import { tokenStore, vectorStore, lastIngestionTime, setLastIngestionTime } from "../services/singletons.js";
import { ingestAllDriveFiles, ingestIncrementalDriveFiles } from "../../../agent/index.js";
import { initSSE, sendSSEEvent, closeSSE } from "../services/sse.js";

const router = Router();

router.get("/status", (_req, res) => {
  res.json({
    connected: tokenStore.isConnected(),
    vectorStoreChunks: vectorStore.size,
    vectorStoreFiles: vectorStore.fileIds.length,
    lastIngestion: lastIngestionTime,
  });
});

router.post("/ingest/full", async (_req, res) => {
  if (!tokenStore.isConnected()) { res.status(401).json({ error: "Drive not connected" }); return; }
  initSSE(res);
  try {
    const progress = await ingestAllDriveFiles(tokenStore, vectorStore, (p) => {
      sendSSEEvent(res, {
        type: "step",
        data: { step_number: p.processed, tool_calls: [], tool_results: [], thought: `Processing: ${p.currentFile ?? "..."} (${p.processed}/${p.total})` } as never,
      });
    });
    setLastIngestionTime(new Date().toISOString());
    sendSSEEvent(res, {
      type: "result",
      data: { task: "ingestion", answer: `Ingested ${progress.processed} files (${progress.errors} errors, ${progress.skipped} skipped)`, citations: [], steps: [], total_steps: progress.processed, finished_naturally: true, usage: { input_tokens: 0, output_tokens: 0 } },
    });
  } catch (err) {
    sendSSEEvent(res, { type: "error", data: { message: err instanceof Error ? err.message : String(err) } });
  } finally {
    closeSSE(res);
  }
});

router.post("/ingest/incremental", async (_req, res) => {
  if (!tokenStore.isConnected()) { res.status(401).json({ error: "Drive not connected" }); return; }
  if (!lastIngestionTime) { res.status(400).json({ error: "No previous ingestion found. Run a full ingestion first." }); return; }
  initSSE(res);
  try {
    const progress = await ingestIncrementalDriveFiles(tokenStore, vectorStore, lastIngestionTime, (p) => {
      sendSSEEvent(res, {
        type: "step",
        data: { step_number: p.processed, tool_calls: [], tool_results: [], thought: `Syncing: ${p.currentFile ?? "..."} (${p.processed}/${p.total})` } as never,
      });
    });
    setLastIngestionTime(new Date().toISOString());
    sendSSEEvent(res, {
      type: "result",
      data: { task: "incremental-ingestion", answer: `Synced ${progress.processed} changed files`, citations: [], steps: [], total_steps: progress.processed, finished_naturally: true, usage: { input_tokens: 0, output_tokens: 0 } },
    });
  } catch (err) {
    sendSSEEvent(res, { type: "error", data: { message: err instanceof Error ? err.message : String(err) } });
  } finally {
    closeSSE(res);
  }
});

export default router;