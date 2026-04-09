"use client";

import { TerminalIcon, Brain } from "lucide-react";
import { Message } from "@/types/chat";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface MessageItemProps {
  readonly msg: Message;
  readonly onApproval?: (msgId: string, approvalId: string | number, decision: string) => void;
}

/**
 * Extracts thinking process and final content from a message.
 * Supports both explicit `thought` field and legacy `<think>` tags.
 */
function parseMessageState(msg: Message) {
  const content = String(msg.content || "");
  const thinkingMatch = content.match(/<think>([\s\S]*?)(?:<\/think>|$)/);

  const rawThought = msg.thought;
  const thoughtStr = typeof rawThought === "string" ? rawThought : "";

  const hasThinking = !!thoughtStr || !!thinkingMatch;
  const thinkingContent = (thoughtStr || (thinkingMatch ? thinkingMatch[1] : "")).trim();
  const isThinkingClosed = thoughtStr ? !msg.inProgress : content.includes("</think>");

  let finalContent = content.trim();
  if (!thoughtStr && thinkingMatch) {
    if (isThinkingClosed) {
      finalContent = content.split("</think>")[1]?.trim() || "";
    } else {
      finalContent = "";
    }
  }

  return { hasThinking, thinkingContent, isThinkingClosed, finalContent };
}

export function MessageItem({ msg, onApproval }: MessageItemProps) {
  const { hasThinking, thinkingContent, isThinkingClosed, finalContent } = parseMessageState(msg);

  const isUser = msg.role === "user";

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative max-w-[85%] sm:max-w-[75%] px-5 py-3.5 text-[15px] leading-relaxed shadow-sm transition-all duration-300 ${isUser
          ? "bg-zinc-800 text-zinc-100 rounded-2xl rounded-tr-sm ring-1 ring-white/5"
          : "bg-transparent text-zinc-300 border-l border-white/10 ml-8 sm:ml-4"
          }`}
      >
        {msg.role === "agent" && (
          <div className="absolute -left-8 sm:-left-10 top-1 w-6 h-6 sm:w-7 sm:h-7 bg-white/5 rounded-full flex items-center justify-center ring-1 ring-white/10 group">
            <TerminalIcon size={10} className="text-zinc-400 group-hover:text-zinc-200 transition-colors" />
          </div>
        )}

        {(hasThinking || (msg.toolCalls && msg.toolCalls.length > 0)) && (
          <Accordion
            type="multiple"
            className="w-full mb-3 space-y-2"
          >
            {hasThinking && (
              <AccordionItem value="thinking" className="border-none">
                <AccordionTrigger className="flex items-center gap-2 py-1 text-[11px] font-bold uppercase tracking-widest text-zinc-500 hover:no-underline hover:text-zinc-300 transition-all duration-200 cursor-pointer group/btn">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center p-1 rounded bg-zinc-900/50 group-hover/btn:bg-zinc-800 ring-1 ring-white/5">
                      <Brain
                        size={12}
                        className={`${msg.inProgress && !isThinkingClosed ? "animate-pulse text-purple-400" : "text-zinc-500"}`}
                      />
                    </span>
                    <span>Thinking Process</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-1">
                  <div className="pl-4 border-l-2 border-zinc-800/50 text-zinc-500/80 text-[13.5px] italic leading-relaxed font-light whitespace-pre-wrap break-words">
                    {thinkingContent}
                    {msg.inProgress && !isThinkingClosed && (
                      <span className="inline-block w-1.5 h-3 ml-1 bg-zinc-600/50 animate-pulse align-middle rounded-sm" />
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {msg.toolCalls?.map((tc) => (
              <AccordionItem key={tc.id} value={tc.id} className="border-none">
                <AccordionTrigger className="flex items-center gap-2 py-1 text-[11px] font-bold uppercase tracking-widest text-zinc-500 hover:no-underline hover:text-zinc-300 transition-all duration-200 cursor-pointer group/btn">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center p-1 rounded bg-zinc-900/50 group-hover/btn:bg-zinc-800 ring-1 ring-white/5">
                      <TerminalIcon
                        size={12}
                        className={`${tc.status === "started" ? "animate-pulse text-blue-400" : "text-zinc-500"}`}
                      />
                    </span>
                    <span>Tool: {tc.name}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-1">
                  <div className="space-y-3 pl-4 border-l-2 border-zinc-800/50">
                    <div className="space-y-1">
                      <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-tighter">Arguments</div>
                      <div className="bg-zinc-900/50 p-2 rounded border border-white/5 text-[12px] font-mono whitespace-pre-wrap break-all text-zinc-400">
                        {tc.arguments}
                      </div>
                    </div>
                    {tc.result && (
                      <div className="space-y-1">
                        <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-tighter">Result</div>
                        <div className="bg-zinc-900/80 p-2 rounded border border-white/5 text-[12px] font-mono whitespace-pre-wrap break-all text-zinc-300">
                          {tc.result}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {finalContent && (
          <div className="w-full whitespace-pre-wrap break-words">
            {finalContent}
          </div>
        )}

        {msg.approvals && msg.approvals.length > 0 && (
          <div className="mt-4 space-y-3">
             {msg.approvals.map((req) => (
                <div key={String(req.id)} className="bg-zinc-900/40 rounded-xl border border-white/10 p-4 space-y-3 animate-in slide-in-from-bottom-2 duration-300">
                   <div className="flex items-center gap-2 text-[12px] font-bold text-zinc-400 uppercase tracking-widest">
                      <TerminalIcon size={14} className="text-amber-400" />
                      <span>{req.type === "commandExecution" ? "Command Approval" : "File Change Approval"}</span>
                   </div>
                   
                    <div className="bg-black/40 rounded-lg p-3 border border-white/5 font-mono text-[13px] text-zinc-300 break-all whitespace-pre-wrap">
                      {(() => {
                        if (req.type === "commandExecution") {
                          if (Array.isArray(req.params.command)) return req.params.command.join(" ");
                          if (typeof req.params.command === "string") return req.params.command;
                          return req.params.reason || "System command";
                        }
                        return req.params.path || req.params.reason || "Update file";
                      })()}
                    </div>

                   {req.decision ? (
                      <div className="text-[12px] text-zinc-500 italic flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                         Decision: <span className="text-zinc-400 font-medium capitalize">{req.decision}</span>
                      </div>
                   ) : (
                      <div className="flex flex-wrap gap-2 pt-1">
                         <button 
                            type="button"
                            onClick={() => onApproval?.(msg.id, req.id, "accept")}
                            className="bg-zinc-100 hover:bg-white text-zinc-950 px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                         >
                            Accept
                         </button>
                         <button 
                            type="button"
                            onClick={() => onApproval?.(msg.id, req.id, "decline")}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all border border-white/5"
                         >
                            Decline
                         </button>
                         {req.type === "commandExecution" && (
                            <button 
                               type="button"
                               onClick={() => onApproval?.(msg.id, req.id, "acceptForSession")}
                               className="bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all border border-white/5"
                            >
                               Accept for Session
                            </button>
                         )}
                      </div>
                   )}
                </div>
             ))}
          </div>
        )}

        {msg.inProgress && (!hasThinking || isThinkingClosed) && (!msg.toolCalls || msg.toolCalls.every(tc => tc.status !== "started")) && !finalContent && (
          <span className="inline-block w-2 h-4 ml-1 bg-zinc-500 animate-pulse align-middle rounded-sm" />
        )}
      </div>
    </div>
  );
}



