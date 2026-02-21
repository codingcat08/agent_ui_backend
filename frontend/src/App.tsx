import { useEffect } from "react";
import { Orbit, RotateCcw } from "lucide-react";
import { useAgent } from "./hooks/useAgent.js";
import { TaskInput } from "./components/TaskInput";
import { DrivePanel } from "./components/DrivePanel";
import { StepTrace } from "./components/StepTrace";
import { ResultPanel } from "./components/ResultPanel";
import { RunningIndicator } from "./components/RunningIndicator";
import { useDriveStatus } from "./hooks/useDriveStatus.ts";

export default function App() {
  const { status: agentStatus, steps, result, error, run, cancel, reset } = useAgent();
  const { refresh: refreshDrive } = useDriveStatus();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    if (auth === "success") { refreshDrive(); window.history.replaceState({}, "", "/"); }
  }, [refreshDrive]);

  const isRunning = agentStatus === "running";
  const isDone = agentStatus === "done";
  const isError = agentStatus === "error";
  const isIdle = agentStatus === "idle";

  return (
    <div className="min-h-screen bg-ink-950 text-ink-100" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
      />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 py-8 flex gap-8 min-h-screen">
        <aside className="w-72 shrink-0 space-y-6 sticky top-8 self-start">
          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center shadow-[0_0_24px_rgba(245,158,11,0.4)]">
              <Orbit size={18} className="text-ink-950" />
            </div>
            <div>
              <h1 className="text-lg font-display font-800 text-ink-50 leading-none tracking-tight">Libra</h1>
              <p className="text-xs text-ink-500 font-body mt-0.5">AI Research Agent</p>
            </div>
          </div>

          <DrivePanel />

          <div className="bg-ink-900/60 rounded-2xl border border-ink-800 p-5 space-y-3">
            <h3 className="text-xs font-display font-600 text-ink-400 uppercase tracking-widest">How it works</h3>
            <ul className="space-y-2.5">
              {[
                { n: "1", t: "Enter a research task or question" },
                { n: "2", t: "Agent plans and searches web + Drive" },
                { n: "3", t: "Results fed back iteratively" },
                { n: "4", t: "Structured answer with citations" },
              ].map((item) => (
                <li key={item.n} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-ink-800 flex items-center justify-center text-xs font-mono text-ink-400 shrink-0">{item.n}</span>
                  <span className="text-xs text-ink-400 font-body leading-relaxed">{item.t}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-display font-800 text-ink-50 tracking-tight">Research Agent</h2>
              <p className="text-sm text-ink-500 font-body mt-0.5">Autonomous planning · Tool use · Cited results</p>
            </div>
            {(isDone || isError) && (
              <button onClick={reset} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ink-800 hover:bg-ink-700 text-sm text-ink-300 font-body transition-colors">
                <RotateCcw size={13} />
                New task
              </button>
            )}
          </div>

          {(isIdle || isRunning) && <TaskInput onSubmit={run} onCancel={cancel} isRunning={isRunning} />}
          {isRunning && <RunningIndicator steps={steps} />}

          {isError && error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4 animate-fade-in">
              <p className="text-sm text-red-400 font-body">{error}</p>
              <button onClick={reset} className="mt-3 text-xs text-red-400/70 hover:text-red-400 font-body transition-colors">Try again →</button>
            </div>
          )}

          {steps.length > 0 && (
            <div className="bg-ink-900/80 rounded-2xl border border-ink-800 p-6">
              <StepTrace steps={steps} isRunning={isRunning} />
            </div>
          )}

          {isDone && result && (
            <div className="bg-ink-900 rounded-2xl border border-ink-700 p-7">
              <ResultPanel result={result} />
            </div>
          )}

          {isIdle && steps.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-ink-900 border border-ink-800 flex items-center justify-center mb-5">
                <Orbit size={28} className="text-ink-600" />
              </div>
              <h3 className="text-lg font-display font-700 text-ink-300 mb-2">Ready to research</h3>
              <p className="text-sm text-ink-600 font-body max-w-sm leading-relaxed">
                Ask anything. The agent will autonomously search the web and your Google Drive, then return a structured answer with sources.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}