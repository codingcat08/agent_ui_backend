import { useState, useRef, useCallback } from "react";
import { runAgent } from "../lib/api.js";
import type { AgentResult, AgentStep } from "../types/index.js";

export type AgentStatus = "idle" | "running" | "done" | "error";

export function useAgent() {
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback((task: string, maxSteps = 10) => {
    abortRef.current?.abort();
    setStatus("running");
    setSteps([]);
    setResult(null);
    setError(null);

    const controller = runAgent(task, maxSteps, {
      onStep: (step) => {
        setSteps((prev) => {
          const idx = prev.findIndex((s) => s.step_number === step.step_number);
          if (idx !== -1) { const next = [...prev]; next[idx] = step; return next; }
          return [...prev, step];
        });
      },
      onResult: (r) => { setResult(r); setSteps(r.steps); setStatus("done"); },
      onError: (msg) => { setError(msg); setStatus("error"); },
    });

    abortRef.current = controller;
  }, []);

  const cancel = useCallback(() => { abortRef.current?.abort(); setStatus("idle"); }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle"); setSteps([]); setResult(null); setError(null);
  }, []);

  return { status, steps, result, error, run, cancel, reset };
}