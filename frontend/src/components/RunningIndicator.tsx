import { Loader2 } from "lucide-react";
import type { AgentStep } from "../types/index.js";

const TOOL_VERBS: Record<string, string> = {
  web_search: "Searching the web",
  web_scrape: "Reading page",
  drive_search: "Searching Drive",
  vector_search: "Semantic search",
  finish: "Composing answer",
};

export function RunningIndicator({ steps }: { steps: AgentStep[] }) {
  const lastStep = steps[steps.length - 1];
  const lastTool = lastStep?.tool_calls[lastStep.tool_calls.length - 1];
  const verb = lastTool ? (TOOL_VERBS[lastTool.name] ?? "Working") : "Planning";
  const detail = lastTool && typeof lastTool.input.query === "string"
    ? `"${(lastTool.input.query as string).slice(0, 60)}"`
    : null;

  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div className="shrink-0 mt-0.5 w-7 h-7 rounded-full bg-amber-500/15 flex items-center justify-center">
        <Loader2 size={13} className="text-amber-400 animate-spin" />
      </div>
      <div className="pt-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-body text-ink-200">{verb}</span>
          {steps.length > 0 && <span className="text-xs font-mono text-ink-600">step {steps.length}</span>}
        </div>
        {detail && <p className="text-xs text-ink-500 font-mono mt-0.5">{detail}</p>}
      </div>
    </div>
  );
}