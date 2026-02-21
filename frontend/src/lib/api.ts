import type { AgentResult, AgentStep, DriveStatus, SSEEvent } from "../types/index.js";

const BASE = "/api";

export async function getDriveStatus(): Promise<DriveStatus> {
  const res = await fetch(`${BASE}/drive/status`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function disconnectDrive(): Promise<void> {
  const res = await fetch(`/auth/drive`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}

export interface RunAgentCallbacks {
  onStep: (step: AgentStep) => void;
  onResult: (result: AgentResult) => void;
  onError: (message: string) => void;
}

export function runAgent(task: string, maxSteps: number, callbacks: RunAgentCallbacks): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${BASE}/agent/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, maxSteps }),
        signal: controller.signal,
      });

      if (!res.ok) { callbacks.onError(await res.text()); return; }

      const reader = res.body?.getReader();
      if (!reader) { callbacks.onError("No response body"); return; }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") return;
          try {
            const event = JSON.parse(raw) as SSEEvent;
            if (event.type === "step") callbacks.onStep(event.data);
            else if (event.type === "result") callbacks.onResult(event.data);
            else if (event.type === "error") callbacks.onError(event.data.message);
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        callbacks.onError(err instanceof Error ? err.message : String(err));
      }
    }
  })();

  return controller;
}

function streamIngestion(url: string, callbacks: { onProgress: (msg: string) => void; onDone: (msg: string) => void; onError: (msg: string) => void }): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(url, { method: "POST", signal: controller.signal });
      if (!res.ok) { callbacks.onError(await res.text()); return; }

      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") return;
          try {
            const event = JSON.parse(raw) as SSEEvent;
            if (event.type === "step" && "thought" in event.data) callbacks.onProgress(event.data.thought ?? "");
            else if (event.type === "result") callbacks.onDone(event.data.answer);
            else if (event.type === "error") callbacks.onError(event.data.message);
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") callbacks.onError(err instanceof Error ? err.message : String(err));
    }
  })();

  return controller;
}

export function triggerFullIngestion(callbacks: { onProgress: (msg: string) => void; onDone: (msg: string) => void; onError: (msg: string) => void }): AbortController {
  return streamIngestion(`${BASE}/drive/ingest/full`, callbacks);
}

export function triggerIncrementalIngestion(callbacks: { onProgress: (msg: string) => void; onDone: (msg: string) => void; onError: (msg: string) => void }): AbortController {
  return streamIngestion(`${BASE}/drive/ingest/incremental`, callbacks);
}