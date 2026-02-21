import { useState, useRef } from "react";
import { HardDrive, RefreshCw, Zap, CheckCircle2, AlertCircle, ExternalLink, Loader2, Database, Clock } from "lucide-react";
import { useDriveStatus } from "../hooks/useDriveStatus.js";
import { triggerFullIngestion, triggerIncrementalIngestion } from "../lib/api.js";

export function DrivePanel() {
  const { status, loading, refresh, disconnect } = useDriveStatus();
  const [ingesting, setIngesting] = useState(false);
  const [ingestMsg, setIngestMsg] = useState("");
  const [ingestStatus, setIngestStatus] = useState<"idle" | "ok" | "err">("idle");
  const abortRef = useRef<{ abort: () => void } | null>(null);

  function formatTime(iso: string | null) {
    if (!iso) return "Never";
    return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function startIngestion(full: boolean) {
    abortRef.current?.abort();
    setIngesting(true);
    setIngestMsg(full ? "Starting full ingestion…" : "Checking for changes…");
    setIngestStatus("idle");
    const fn = full ? triggerFullIngestion : triggerIncrementalIngestion;
    const ctrl = fn({
      onProgress: (msg) => setIngestMsg(msg),
      onDone: (msg) => { setIngestMsg(msg); setIngestStatus("ok"); setIngesting(false); refresh(); },
      onError: (msg) => { setIngestMsg(msg); setIngestStatus("err"); setIngesting(false); },
    });
    abortRef.current = ctrl;
  }

  if (loading) {
    return (
      <div className="bg-ink-900 border border-ink-700 rounded-2xl p-6">
        <div className="flex items-center gap-3 text-ink-400">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm font-body">Connecting to server…</span>
        </div>
      </div>
    );
  }

  const connected = status?.connected ?? false;

  return (
    <div className="bg-ink-900 border border-ink-700 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-ink-800">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${connected ? "bg-emerald-500/15 text-emerald-400" : "bg-ink-700 text-ink-400"}`}>
            <HardDrive size={15} />
          </div>
          <div>
            <h3 className="text-sm font-display font-600 text-ink-100">Google Drive</h3>
            <p className={`text-xs mt-0.5 ${connected ? "text-emerald-400" : "text-ink-500"}`}>{connected ? "Connected" : "Not connected"}</p>
          </div>
        </div>
        {connected && <button onClick={disconnect} className="text-xs text-ink-500 hover:text-red-400 transition-colors font-body">Disconnect</button>}
      </div>

      <div className="p-6 space-y-5">
        {!connected ? (
          <div className="space-y-4">
            <p className="text-sm text-ink-400 font-body leading-relaxed">Connect your Google Drive to enable semantic search over your documents.</p>
            <a href="/auth/drive" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-ink-950 text-sm font-display font-600 transition-all duration-200">
              <ExternalLink size={14} />
              Connect Drive
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-ink-800 rounded-xl p-3">
                <div className="flex items-center gap-2 text-ink-400 mb-1"><Database size={12} /><span className="text-xs font-body">Files indexed</span></div>
                <p className="text-xl font-display font-700 text-ink-100">{status?.vectorStoreFiles ?? 0}</p>
              </div>
              <div className="bg-ink-800 rounded-xl p-3">
                <div className="flex items-center gap-2 text-ink-400 mb-1"><Database size={12} /><span className="text-xs font-body">Chunks</span></div>
                <p className="text-xl font-display font-700 text-ink-100">{(status?.vectorStoreChunks ?? 0).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-ink-500">
              <Clock size={12} />
              <span className="text-xs font-body">Last sync: {formatTime(status?.lastIngestion ?? null)}</span>
            </div>
            {(ingesting || ingestStatus !== "idle") && (
              <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs font-mono ${ingestStatus === "err" ? "bg-red-500/10 text-red-400" : ingestStatus === "ok" ? "bg-emerald-500/10 text-emerald-400" : "bg-ink-800 text-ink-400"}`}>
                {ingesting && <Loader2 size={12} className="animate-spin shrink-0 mt-0.5" />}
                {ingestStatus === "ok" && <CheckCircle2 size={12} className="shrink-0 mt-0.5" />}
                {ingestStatus === "err" && <AlertCircle size={12} className="shrink-0 mt-0.5" />}
                <span className="break-all leading-relaxed">{ingestMsg}</span>
              </div>
            )}
            <div className="flex gap-2">
              <button disabled={ingesting} onClick={() => startIngestion(false)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-ink-800 hover:bg-ink-700 text-ink-200 text-xs font-body transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <Zap size={12} />Sync changes
              </button>
              <button disabled={ingesting} onClick={() => startIngestion(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-ink-800 hover:bg-ink-700 text-ink-200 text-xs font-body transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <RefreshCw size={12} className={ingesting ? "animate-spin" : ""} />Re-index all
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}