import React, { KeyboardEvent, SubmitEvent } from "react";
import { ChevronDown, SendIcon } from "lucide-react";
import { Model } from "@/types/chat";

interface ChatInputProps {
  readonly input: string;
  readonly setInput: (value: string) => void;
  readonly handleSubmit: (e: SubmitEvent<HTMLFormElement>) => void | Promise<void>;
  readonly loading: boolean;
  readonly models: Model[];
  readonly selectedModel: string;
  readonly onModelChange: (modelId: string) => void;
  readonly selectedEffort: string;
  readonly onEffortChange: (effort: string) => void;
}

export function ChatInput({
  input,
  setInput,
  handleSubmit,
  loading,
  models,
  selectedModel,
  onModelChange,
  selectedEffort,
  onEffortChange
}: ChatInputProps) {
  const currentModel = models.find((model) => model.id === selectedModel);
  const hasEfforts = Boolean(
    currentModel?.supportedReasoningEfforts && currentModel.supportedReasoningEfforts.length > 0
  );
  const effortOptions = [
    { reasoningEffort: currentModel?.defaultReasoningEffort || "medium", description: "Default" },
    ...(currentModel?.supportedReasoningEfforts || [])
  ].filter((value, index, list) => list.findIndex((item) => item.reasoningEffort === value.reasoningEffort) === index);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as SubmitEvent<HTMLFormElement>);
    }
  };

  return (
    <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#050505] via-[#050505] to-transparent pt-12 sm:pt-20 pb-4 sm:pb-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-3 flex items-center justify-end gap-2">
          {hasEfforts && (
            <div className="relative group">
              <select
                value={selectedEffort}
                onChange={(e) => onEffortChange(e.target.value)}
                className="appearance-none bg-zinc-900/70 hover:bg-zinc-800/90 border border-white/10 rounded-full px-4 py-1.5 pr-9 text-[10px] font-bold uppercase tracking-wider text-zinc-400 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all cursor-pointer shadow-lg backdrop-blur-sm"
                title="Reasoning Effort"
              >
                {effortOptions.map((effort) => (
                  <option key={effort.reasoningEffort} value={effort.reasoningEffort} className="bg-zinc-900 text-zinc-300">
                    {effort.reasoningEffort.toUpperCase()}
                  </option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none transition-transform group-hover:text-zinc-300" />
              <div className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </div>
            </div>
          )}

          {models.length > 0 && (
            <div className="relative group">
              <select
                value={selectedModel}
                onChange={(e) => onModelChange(e.target.value)}
                className="appearance-none bg-zinc-900/70 hover:bg-zinc-800/90 border border-white/10 rounded-full px-4 py-1.5 pr-9 text-xs font-medium text-zinc-300 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all cursor-pointer shadow-lg backdrop-blur-sm"
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id} className="bg-zinc-900 text-zinc-300">
                    {model.displayName || model.model}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none transition-transform group-hover:text-zinc-300" />
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="relative flex items-end gap-2 bg-zinc-900/80 backdrop-blur-xl shadow-2xl shadow-black/50 ring-1 ring-white/10 rounded-2xl p-2 transition-all focus-within:ring-white/20"
          suppressHydrationWarning
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your task..."
            className="w-full max-h-48 min-h-[44px] bg-transparent text-zinc-100 placeholder:text-zinc-500 resize-none outline-none py-3 px-4 text-sm font-medium disabled:opacity-50"
            disabled={loading}
            rows={1}
            suppressHydrationWarning
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex-shrink-0 flex items-center justify-center h-10 w-10 bg-zinc-100 text-zinc-900 hover:bg-white disabled:opacity-50 disabled:hover:bg-zinc-100 rounded-xl transition-all active:scale-95"
          >
            <SendIcon size={18} className={loading ? "animate-pulse" : ""} />
          </button>
        </form>
        <p className="text-center text-[10px] text-zinc-600 mt-4 font-bold uppercase tracking-widest">
          Codex Bridge v0.1.0 • Local Environment
        </p>
      </div>
    </div>
  );
}
