import { useState, useRef, useEffect } from "react";
import { ArrowUp, Square, Sparkles } from "lucide-react";

const SUGGESTIONS = [
  "Summarize my Q3 reports and compare with public industry benchmarks",
  "Find all meeting notes about the product roadmap and extract key decisions",
  "Research the latest trends in large language models",
  "What does our company handbook say about vacation policy?",
  "Compare our internal sales data with recent market reports",
];

interface TaskInputProps {
  onSubmit: (task: string, maxSteps: number) => void;
  onCancel: () => void;
  isRunning: boolean;
}

export function TaskInput({ onSubmit, onCancel, isRunning }: TaskInputProps) {
  const [task, setTask] = useState("");
  const [maxSteps, setMaxSteps] = useState(10);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [task]);

  function handleSubmit() {
    const trimmed = task.trim();
    if (!trimmed || isRunning) return;
    onSubmit(trimmed, maxSteps);
    setShowSuggestions(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmit(); }
  }

  return (
    <div className="space-y-3">
      <div className={`relative rounded-2xl border transition-all duration-200 ${isRunning ? "border-amber-500/40 bg-amber-500/5" : "border-ink-700 bg-ink-900 hover:border-ink-600 focus-within:border-amber-500/50"}`}>
        <textarea
          ref={textareaRef}
          value={task}
          onChange={(e) => { setTask(e.target.value); setShowSuggestions(false); }}
          onFocus={() => !task && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={handleKeyDown}
          disabled={isRunning}
          placeholder="Ask anything — research the web, search your Drive, or both…"
          rows={1}
          className="w-full bg-transparent resize-none px-5 pt-4 pb-3 text-sm text-ink-100 placeholder-ink-600 font-body outline-none leading-relaxed disabled:opacity-60"
        />
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-600 font-body">Max steps</span>
            <div className="flex items-center gap-1">
              {[5, 10, 15, 20].map((n) => (
                <button key={n} onClick={() => setMaxSteps(n)} disabled={isRunning}
                  className={`w-7 h-6 rounded text-xs font-mono transition-colors ${maxSteps === n ? "bg-amber-500 text-ink-950 font-600" : "text-ink-500 hover:text-ink-300 hover:bg-ink-800"} disabled:opacity-40`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isRunning && <span className="text-xs text-ink-700 font-body hidden sm:block">⌘↵</span>}
            <button onClick={isRunning ? onCancel : handleSubmit} disabled={!isRunning && !task.trim()}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isRunning ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : task.trim() ? "bg-amber-500 text-ink-950 hover:bg-amber-400 hover:shadow-[0_0_16px_rgba(245,158,11,0.4)]" : "bg-ink-800 text-ink-600"} disabled:opacity-40 disabled:cursor-not-allowed`}>
              {isRunning ? <Square size={13} /> : <ArrowUp size={14} />}
            </button>
          </div>
        </div>
      </div>

      {showSuggestions && !isRunning && (
        <div className="space-y-1.5 animate-fade-in">
          <div className="flex items-center gap-2 px-1">
            <Sparkles size={11} className="text-ink-600" />
            <span className="text-xs text-ink-600 font-body">Try asking…</span>
          </div>
          {SUGGESTIONS.map((s) => (
            <button key={s} onMouseDown={() => { setTask(s); setShowSuggestions(false); textareaRef.current?.focus(); }}
              className="w-full text-left px-4 py-2.5 rounded-xl bg-ink-900 border border-ink-800 hover:border-ink-600 hover:bg-ink-800 text-xs text-ink-400 hover:text-ink-200 font-body transition-all duration-150 leading-relaxed">
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}