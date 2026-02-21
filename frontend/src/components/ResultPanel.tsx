import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Globe, HardDrive, Brain, ExternalLink, Cpu, CheckCircle2, AlertTriangle } from "lucide-react";
import type { AgentResult, Citation } from "../types/index.js";

function CitationBadge({ citation, index }: { citation: Citation; index: number }) {
  const icons = { web: <Globe size={11} />, drive: <HardDrive size={11} />, vector: <Brain size={11} /> };
  const colors = {
    web: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    drive: "text-green-400 bg-green-500/10 border-green-500/20",
    vector: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  };
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${colors[citation.source_type]} text-xs`}>
      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
        <span className="font-mono opacity-60">[{index + 1}]</span>
        {icons[citation.source_type]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-body font-500 text-current leading-snug truncate">{citation.title}</p>
          {citation.url && (
            <a href={citation.url} target="_blank" rel="noopener noreferrer" className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
              <ExternalLink size={11} />
            </a>
          )}
        </div>
        {citation.snippet && <p className="mt-1 text-current opacity-60 font-body leading-relaxed line-clamp-2">{citation.snippet}</p>}
      </div>
    </div>
  );
}

export function ResultPanel({ result }: { result: AgentResult }) {
  return (
    <div className="space-y-6 animate-fade-up">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-body ${result.finished_naturally ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-300" : "bg-amber-500/8 border-amber-500/20 text-amber-300"}`}>
        {result.finished_naturally ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
        <span>{result.finished_naturally ? `Completed in ${result.total_steps} step${result.total_steps !== 1 ? "s" : ""}` : `Stopped after ${result.total_steps} steps (limit reached)`}</span>
        <span className="ml-auto flex items-center gap-1.5 text-xs opacity-60">
          <Cpu size={11} />
          {(result.usage.input_tokens + result.usage.output_tokens).toLocaleString()} tokens
        </span>
      </div>

      <div className="prose prose-sm max-w-none prose-invert prose-headings:font-display prose-headings:text-ink-100 prose-p:text-ink-200 prose-p:font-body prose-p:leading-relaxed prose-a:text-amber-400 prose-a:no-underline hover:prose-a:underline prose-strong:text-ink-100 prose-code:text-amber-300 prose-code:bg-ink-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-ink-900 prose-pre:border prose-pre:border-ink-700 prose-li:text-ink-200 prose-li:font-body prose-blockquote:border-amber-500/40 prose-blockquote:text-ink-300 prose-hr:border-ink-700">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.answer}</ReactMarkdown>
      </div>

      {result.citations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-ink-800" />
            <h4 className="text-xs font-display font-600 text-ink-500 uppercase tracking-widest px-3">Sources</h4>
            <div className="h-px flex-1 bg-ink-800" />
          </div>
          <div className="space-y-2">
            {result.citations.map((c, i) => <CitationBadge key={i} citation={c} index={i} />)}
          </div>
        </div>
      )}
    </div>
  );
}