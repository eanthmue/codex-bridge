import { TerminalIcon } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full pt-32 opacity-50 select-none">
      <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-white/10 shadow-2xl">
        <TerminalIcon size={32} className="text-zinc-400" />
      </div>
      <h2 className="text-xl font-medium tracking-tight text-zinc-200">How can I help you code today?</h2>
      <p className="text-sm text-zinc-500 mt-2 text-center max-w-sm">
        Send a task to your local Codex environment. Your files and context are ready.
      </p>
    </div>
  );
}
