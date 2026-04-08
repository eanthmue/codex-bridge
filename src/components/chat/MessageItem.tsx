"use client";

import { useState, useEffect } from "react";
import { TerminalIcon, Brain, ChevronDown, ChevronUp } from "lucide-react";
import { Message } from "@/types/chat";

interface MessageItemProps {
  readonly msg: Message;
}

export function MessageItem({ msg }: MessageItemProps) {
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);
  const [autoClosed, setAutoClosed] = useState(false);

  // Support both explicit thought field (alignment with doc) and legacy <think> tags
  const content = String(msg.content || "");
  const thinkingMatch = content.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
  
  const rawThought = msg.thought;
  const thoughtStr = typeof rawThought === "string" ? rawThought : "";
  
  const hasThinking = !!thoughtStr || !!thinkingMatch;
  const thinkingContent = (thoughtStr || (thinkingMatch ? thinkingMatch[1] : "")).trim();
  const isThinkingClosed = thoughtStr ? !msg.inProgress : content.includes("</think>");
  
  let finalContent = "";
  if (thoughtStr) {
    finalContent = content.trim();
  } else if (thinkingMatch) {
    if (isThinkingClosed) {
      finalContent = content.split("</think>")[1]?.trim() || "";
    } else {
      finalContent = "";
    }
  } else {
    finalContent = content.trim();
  }

  // Auto-close behavior (triggers once when thinking is done)
  useEffect(() => {
    if (hasThinking && !autoClosed) {
      if (isThinkingClosed || !msg.inProgress) {
        // Delay slightly for better UX when it finishes
        const timer = setTimeout(() => {
          setIsThinkingExpanded(false);
          setAutoClosed(true);
        }, 500);
        return () => clearTimeout(timer);
      } else {
        setIsThinkingExpanded(true);
      }
    }
  }, [isThinkingClosed, msg.inProgress, hasThinking, autoClosed]);

  return (
    <div
      className={`flex w-full ${
        msg.role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`relative max-w-[85%] sm:max-w-[75%] px-5 py-3.5 text-[15px] leading-relaxed shadow-sm transition-all duration-300 ${
          msg.role === "user"
            ? "bg-zinc-800 text-zinc-100 rounded-2xl rounded-tr-sm ring-1 ring-white/5"
            : "bg-transparent text-zinc-300 border-l border-white/10 ml-8 sm:ml-4"
        }`}
      >
        {msg.role === "agent" && (
          <div className="absolute -left-8 sm:-left-10 top-1 w-6 h-6 sm:w-7 sm:h-7 bg-white/5 rounded-full flex items-center justify-center ring-1 ring-white/10 group">
            <TerminalIcon size={10} className="text-zinc-400 group-hover:text-zinc-200 transition-colors" />
          </div>
        )}

        {hasThinking && (
          <div className="mb-3 overflow-hidden">
            <button
              onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
              className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-all duration-200 cursor-pointer group/btn"
            >
              <span className="flex items-center justify-center p-1 rounded bg-zinc-900/50 group-hover/btn:bg-zinc-800 ring-1 ring-white/5">
                <Brain size={12} className={`${msg.inProgress && !isThinkingClosed ? "animate-pulse text-purple-400" : "text-zinc-500"}`} />
              </span>
              <span>Thinking Process</span>
              <div className={`transition-transform duration-300 ${isThinkingExpanded ? "rotate-0" : "-rotate-90"}`}>
                <ChevronDown size={12} />
              </div>
            </button>
            
            <div 
              className={`grid transition-all duration-500 ease-in-out ${
                isThinkingExpanded ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <div className="pl-4 py-1 border-l-2 border-zinc-800/50 text-zinc-500/80 text-[13.5px] italic leading-relaxed font-light">
                  <div className="whitespace-pre-wrap break-words">{thinkingContent}</div>
                  {msg.inProgress && !isThinkingClosed && (
                    <span className="inline-block w-1.5 h-3 ml-1 bg-zinc-600/50 animate-pulse align-middle rounded-sm" />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {finalContent && (
          <div className="animate-in fade-in duration-700 whitespace-pre-wrap break-words">
            {finalContent}
          </div>
        )}
        
        {msg.inProgress && (!hasThinking || isThinkingClosed) && (
          <span className="inline-block w-2 h-4 ml-1 bg-zinc-500 animate-pulse align-middle rounded-sm" />
        )}
      </div>
    </div>
  );
}
