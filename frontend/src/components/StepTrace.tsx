import { useState } from "react";
import { Globe, FileSearch, HardDrive, Brain, ChevronDown, CheckCircle2, XCircle, Search, LinkIcon } from "lucide-react";
import type { AgentStep, ToolCall, ToolResult } from "../types/index.js";

const TOOL_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  web_search: { icon: <Search size={12} />, label: "Web Search", color: "text-blue-400 bg-blue-500/10" },
  web_scrape: { icon: <Globe size={12} />, label: "Web Scrape", color: "text-cyan-400 bg-cyan-500/10" },
  drive_search: { icon: <HardDrive size={12} />, label: "Drive Search", color: "text-green-400 bg-green-500/10" },
  vector_search: { icon: <Brain size={12} />, label: "Semantic Search", color: "text-purple-400 bg-purple-500/10" },
  finish: { icon: <CheckCircle2 size={12} />, label: "Finished", color: "text-amber-400 bg-amber-500/10" },
};

function ToolBadge({ name }: { name: string }) {
  const meta = TOOL_META[name] ?? { icon: <FileSearch size={12} />, label: name, color: "text-ink-400 bg-ink-700" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono ${meta.color}`}>
      {meta.icon}{meta.label}
    </span>
  );
}

function ToolCallRow({ call, result }: { call: ToolCall; result?: ToolResult }) {
  const [open, setOpen] = useState(false);
  const inputStr = JSON.stringify(call.input, null, 2);
  const outputStr = result ? JSON.stringify(result.output, null, 2).slice(0, 800) + (JSON.stringify(result.output).length > 800 ? "\n…" : "") : null;

  return (
    <div className="border border-ink-700 rounded-xl overflow-hidden">
      <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-ink-800/60 transition-colors text-left" onClick={() => setOpen((v) => !v)}>
        <ToolBadge name={call.name} />
        <span className="flex-1 text-xs font-mono text-ink-400 truncate">{Object.values(call.input)[0] as string ?? ""}</span>
        {result && <span className={`shrink-0 ${result.success ? "text-emerald-400" : "text-red-400"}`}>{result.success ? <CheckCircle2 size={13} /> : <XCircle size={13} />}</span>}
        <ChevronDown size={13} className={`shrink-0 text-ink-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-ink-700 divide-y divide-ink-800">
          <div className="px-4 py-3">
            <p className="text-xs text-ink-500 mb-1.5 font-body">Input</p>
            <pre className="text-xs font-mono text-ink-300 whitespace-pre-wrap break-all leading-relaxed">{inputStr}</pre>
          </div>
          {outputStr && (
            <div className="px-4 py-3">
              <p className="text-xs text-ink-500 mb-1.5 font-body">Output</p>
              <pre className="text-xs font-mono text-ink-300 whitespace-pre-wrap break-all leading-relaxed max-h-48 overflow-y-auto">{outputStr}</pre>
            </div>
          )}
          {result?.error && <div className="px-4 py-3"><p className="text-xs text-red-500 font-mono">{result.error}</p></div>}
        </div>
      )}
    </div>
  );
}

function StepCard({ step, isLast, isLive }: { step: AgentStep; isLast: boolean; isLive: boolean }) {
  const [open, setOpen] = useState(isLast);
  return (
    <div className="animate-fade-up" style={{ animationDelay: `${step.step_number * 50}ms` }}>
      <button className="w-full flex items-center gap-3 group text-left" onClick={() => setOpen((v) => !v)}>
        <div className="relative shrink-0">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-700 ${isLive && isLast ? "bg-amber-500 text-ink-950 animate-pulse2" : "bg-ink-800 text-ink-300 group-hover:bg-ink-700"}`}>
            {step.step_number}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {step.tool_calls.map((tc) => <ToolBadge key={tc.id} name={tc.name} />)}
            {step.tool_calls.length === 0 && <span className="text-xs text-ink-500 font-body italic">Thinking…</span>}
          </div>
        </div>
        <ChevronDown size={14} className={`shrink-0 text-ink-600 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="ml-10 mt-3 space-y-2">
          {step.thought && (
            <div className="bg-ink-800/40 rounded-xl px-4 py-3 border border-ink-700/50">
              <p className="text-xs text-ink-500 mb-1 font-body">Reasoning</p>
              <p className="text-xs text-ink-300 font-body leading-relaxed line-clamp-4">{step.thought}</p>
            </div>
          )}
          {step.tool_calls.filter((tc) => tc.name !== "finish").map((tc) => (
            <ToolCallRow key={tc.id} call={tc} result={step.tool_results.find((r) => r.tool_call_id === tc.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

export function StepTrace({ steps, isRunning }: { steps: AgentStep[]; isRunning: boolean }) {
  if (steps.length === 0) return null;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-4">
        <LinkIcon size={13} className="text-ink-500" />
        <h3 className="text-xs font-display font-600 text-ink-400 uppercase tracking-widest">Execution Trace</h3>
      </div>
      <div className="space-y-4 relative">
        <div className="absolute left-3.5 top-7 bottom-0 w-px bg-ink-800" />
        {steps.map((step, i) => (
          <StepCard key={step.step_number} step={step} isLast={i === steps.length - 1} isLive={isRunning} />
        ))}
      </div>
    </div>
  );
}