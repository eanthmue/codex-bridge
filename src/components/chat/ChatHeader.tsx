import { MenuIcon, TerminalIcon } from "lucide-react";

interface ChatHeaderProps {
  readonly threadId: string | null;
  readonly sidebarOpen: boolean;
  readonly setSidebarOpen: (open: boolean) => void;
}

export function ChatHeader({ 
  threadId, 
  sidebarOpen, 
  setSidebarOpen
}: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-white/10 bg-black/50 backdrop-blur-md z-10 sticky top-0">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors md:hidden"
        >
          <MenuIcon size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-800 rounded-lg shadow-inner shadow-white/5 ring-1 ring-white/10">
            <TerminalIcon size={16} className="text-zinc-200" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-medium tracking-tight truncate max-w-[120px] sm:max-w-none">
              {threadId ? `Thread: ${threadId.slice(0, 8)}...` : "New Session"}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 md:gap-4">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 shadow-inner">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Live</span>
        </div>
      </div>
    </header>
  );
}
