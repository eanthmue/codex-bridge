"use client";

import { useEffect, useState } from "react";
import { PlusIcon, MessageSquareIcon, TerminalIcon, Settings2Icon, XIcon } from "lucide-react";

interface Thread {
  thread: {
    id: string;
    preview?: string;
    name?: string;
  };
}

interface SidebarProps {
  readonly currentThreadId: string | null;
  readonly onSelectThread: (threadId: string) => void;
  readonly onNewSession: () => void;
  readonly isOpen: boolean;
  readonly onToggle: (open: boolean) => void;
}

export function Sidebar({ currentThreadId, onSelectThread, onNewSession, isOpen, onToggle }: SidebarProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchThreads = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/session");
      const data = await res.json();
      if (data.threads) {
        setThreads(data.threads);
      }
    } catch (err) {
      console.error("Failed to fetch threads:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreads();
    const interval = setInterval(fetchThreads, 10000);
    return () => clearInterval(interval);
  }, []);

  const renderContent = () => {
    if (loading && threads.length === 0) {
      return (
        <div className="px-3 py-10 flex flex-col items-center justify-center gap-2 opacity-50">
          <div className="w-4 h-4 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
          <p className="text-xs text-zinc-500">Retrieving sessions...</p>
        </div>
      );
    }

    if (threads.length === 0) {
      return (
        <div className="px-3 py-10 text-center">
          <p className="text-xs text-zinc-500 italic">No sessions started.</p>
        </div>
      );
    }

    return threads.slice().map((t) => (
      <button
        key={t.thread.id}
        onClick={() => onSelectThread(t.thread.id)}
        className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left ${currentThreadId === t.thread.id
            ? "bg-white/10 ring-1 ring-white/10 shadow-sm shadow-black/20"
            : "hover:bg-white/5 active:scale-[0.99]"
          }`}
      >
        <div className={`w-4 h-4 shrink-0 transition-colors ${currentThreadId === t.thread.id ? "text-zinc-100" : "text-zinc-500 group-hover:text-zinc-300"
          }`}>
          <MessageSquareIcon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-medium truncate transition-colors ${currentThreadId === t.thread.id ? "text-zinc-100" : "text-zinc-400 group-hover:text-zinc-200"
            }`}>
            {t.thread.preview || t.thread.name || `Session ${t.thread.id.slice(0, 8)}`}
          </p>
        </div>
      </button>
    ));
  };

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-zinc-950 border-r border-white/5 flex flex-col h-full overflow-hidden transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
      {/* Brand Header */}
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center ring-1 ring-white/10 shadow-sm">
              <TerminalIcon size={18} className="text-zinc-200" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">Codex Bridge</h2>
              <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">Local Engine</p>
            </div>
          </div>
          <button
            onClick={() => onToggle(false)}
            className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 transition-colors md:hidden"
          >
            <XIcon size={18} />
          </button>
        </div>
      </div>

      {/* New Session Button */}
      <div className="px-4 mb-6">
        <button
          onClick={onNewSession}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl font-medium text-sm transition-all shadow-lg active:scale-[0.98]"
        >
          <span>New Session</span>
          <PlusIcon size={16} />
        </button>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1">
        <div className="px-2 mb-2">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Recents</p>
        </div>
        {renderContent()}
      </div>

      {/* Footer Settings/Profiles */}
      <div className="p-4 border-t border-white/5 bg-zinc-950/50">
        <button className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-white/5 rounded-xl transition-all text-zinc-400 hover:text-zinc-200">
          <Settings2Icon size={16} />
          <span className="text-xs font-medium">Model Settings</span>
        </button>
      </div>
    </aside>
  );
}
