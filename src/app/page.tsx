"use client";

import React, { useEffect, useRef, useState, SubmitEvent } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Message, Model } from "@/types/chat";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";

function normalizeText(val: any): string {
  if (typeof val === "string") return val;
  if (!val) return "";
  if (Array.isArray(val)) {
    return val.map((c: any) => (typeof c === "string" ? c : c.text || "")).join("");
  }
  if (typeof val === "object") {
    return val.text || val.content || "";
  }
  return String(val);
}

function mapTurnsToMessages(turns: any[]): Message[] {
  return turns.flatMap((turn: any) => {
    const messages: Message[] = [];
    const items = turn.items || [];
    
    items.filter((i: any) => i.type === "userMessage").forEach((item: any) => {
      messages.push({
        id: item.id || `user_${Date.now()}_${Math.random()}`,
        turnId: turn.id,
        role: "user",
        content: normalizeText(item.text || item.content),
      });
    });
    
    const allToolCalls = items.filter((i: any) => i.type === "call").map((item: any) => ({
      id: item.id,
      name: item.name,
      arguments: item.arguments || "",
      result: item.result,
      status: "completed" as const
    }));
    
    const reasoningItem = items.find((i: any) => i.type === "reasoning");
    const agentMessageItem = items.find((i: any) => i.type === "agentMessage");
    
    if (agentMessageItem || allToolCalls.length > 0 || reasoningItem) {
       messages.push({
          id: agentMessageItem?.id || `agent_${turn.id}_${Math.random()}`,
          turnId: turn.id,
          role: "agent",
          content: agentMessageItem ? normalizeText(agentMessageItem.text || agentMessageItem.content) : "",
          thought: reasoningItem ? normalizeText(reasoningItem.content) : undefined,
          reasoningSummary: reasoningItem ? normalizeText(reasoningItem.summary) : undefined,
          toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined
       });
    }
    
    return messages;
  });
}

function handleCallStarted(prev: Message[], params: any, turnId: string | undefined): Message[] {
  const item = params.item;
  const { id, name } = item;
  const existingIndex = turnId ? prev.findIndex(m => m.turnId === turnId && m.role === "agent") : -1;
  const toolCall = { id, name: name || "tool_call", arguments: "", status: "started" as const };
  
  if (existingIndex >= 0) {
    const updated = [...prev];
    const current = updated[existingIndex];
    const toolCalls = [...(current.toolCalls || []), toolCall];
    updated[existingIndex] = { ...current, toolCalls, inProgress: true };
    return updated;
  }
  
  return [...prev, {
    id: `agent_${id}`,
    turnId,
    role: "agent",
    content: "",
    toolCalls: [toolCall],
    inProgress: true
  }];
}

function handleCallDelta(prev: Message[], params: any, turnId: string | undefined, delta: string): Message[] {
  return prev.map(m => {
    const matches = turnId && m.turnId === turnId && m.role === "agent";
    if (matches && m.toolCalls) {
      const toolCalls = m.toolCalls.map(tc => tc.id === params.itemId ? { ...tc, arguments: tc.arguments + delta } : tc);
      return { ...m, toolCalls };
    }
    return m;
  });
}

function handleCallCompleted(prev: Message[], params: any, turnId: string | undefined): Message[] {
  const item = params.item;
  return prev.map(m => {
    const matches = turnId && m.turnId === turnId && m.role === "agent";
    if (matches && m.toolCalls) {
      const toolCalls = m.toolCalls.map(tc => tc.id === item.id ? { ...tc, result: item.result, status: "completed" as const } : tc);
      return { ...m, toolCalls };
    }
    return m;
  });
}

/**
 * Message State Update Helpers to reduce function nesting depth.
 */

function handleStartedUpdate(prev: Message[], params: any, turnId: string | undefined): Message[] {
  const item = params.item;
  const { id, type } = item;
  const existingIndex = turnId ? prev.findIndex(m => m.turnId === turnId && m.role === "agent") : -1;
  
  if (existingIndex >= 0) {
    const updated = [...prev];
    const current = updated[existingIndex];
    let isThinking = current.isThinking;
    if (type === "reasoning") isThinking = true;
    else if (type === "agentMessage") isThinking = false;

    updated[existingIndex] = {
      ...current,
      id: type === "agentMessage" ? id : current.id,
      thought: type === "reasoning" ? normalizeText(item.content) : current.thought,
      content: type === "agentMessage" ? normalizeText(item.text || item.content) : current.content,
      isThinking,
      inProgress: true
    };
    return updated;
  }

  return [...prev, {
    id,
    turnId,
    role: "agent",
    content: type === "agentMessage" ? normalizeText(item.text || item.content) : "",
    thought: type === "reasoning" ? normalizeText(item.content) : undefined,
    isThinking: type === "reasoning",
    inProgress: true
  }];
}

function handleDeltaUpdate(prev: Message[], params: any, turnId: string | undefined, deltaKey: keyof Message, deltaValue: string, isThinking: boolean): Message[] {
  return prev.map((m) => {
    const matches = m.id === params.itemId || (turnId && m.turnId === turnId && m.role === "agent");
    if (matches) {
      const currentVal = (m[deltaKey] as string) || "";
      return { ...m, [deltaKey]: currentVal + deltaValue, isThinking, inProgress: true };
    }
    return m;
  });
}

function handleCompletedUpdate(prev: Message[], params: any, turnId: string | undefined): Message[] {
  const type = params.item.type;
  return prev.map((m) => {
    const matches = m.id === params.item.id || (turnId && m.turnId === turnId && m.role === "agent");
    if (matches) {
      return { 
        ...m, 
        content: type === "agentMessage" ? normalizeText(params.item.text || params.item.content || m.content) : m.content,
        thought: type === "reasoning" ? normalizeText(params.item.content || m.thought) : m.thought,
        isThinking: type === "reasoning" ? false : m.isThinking,
        inProgress: type === "agentMessage" ? false : m.inProgress 
      };
    }
    return m;
  });
}

function handleTurnCompletedUpdate(prev: Message[]): Message[] {
  return prev.map((m) => (m.inProgress ? { ...m, inProgress: false } : m));
}

function handleApprovalRequest(prev: Message[], payload: any): Message[] {
  const { method, id, params } = payload;
  const { turnId, itemId } = params;
  const type = (method === "item/commandExecution/requestApproval" ? "commandExecution" : "fileChange") as "commandExecution" | "fileChange";
  
  const existingIndex = turnId ? prev.findIndex(m => m.turnId === turnId && m.role === "agent") : -1;
  const approval: NonNullable<Message["approvals"]>[number] = { id, type, itemId, params };

  if (existingIndex >= 0) {
    const updated = [...prev];
    const current = updated[existingIndex];
    const approvals = current.approvals || [];
    if (approvals.some(a => a.id === id)) return prev;
    
    updated[existingIndex] = {
      ...current,
      approvals: [...approvals, approval]
    };
    return updated;
  }
  
  // Create message if none exists
  return [...prev, {
    id: `agent_${id}`,
    turnId,
    role: "agent",
    content: "",
    approvals: [approval],
    inProgress: true
  }];
}

function handleServerRequestResolved(prev: Message[], params: any): Message[] {
  const { requestId, turnId } = params;
  return prev.map(m => {
    if (m.turnId === turnId && m.role === "agent" && m.approvals) {
      return {
        ...m,
        approvals: m.approvals.filter(a => a.id !== requestId)
      };
    }
    return m;
  });
}

function processSseMessage(
  event: MessageEvent,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
) {
  try {
    const payload = JSON.parse(event.data);
    const { method = "", params = "", id } = payload;
    const { turnId, delta = "", item } = params;

    // Handle server-initiated requests (approvals)
    if (id !== undefined && method.includes("requestApproval")) {
      setMessages(prev => handleApprovalRequest(prev, payload));
      return;
    }

    switch (method) {
      case "serverRequest/resolved":
        setMessages(prev => handleServerRequestResolved(prev, params));
        break;
      case "item/started":
        if (item?.type === "agentMessage" || item?.type === "reasoning") {
          setMessages((prev) => handleStartedUpdate(prev, params, turnId));
        } else if (item?.type === "call") {
          setMessages((prev) => handleCallStarted(prev, params, turnId));
        }
        break;

      case "item/agentMessage/delta":
        setMessages((prev) => handleDeltaUpdate(prev, params, turnId, "content", delta, false));
        break;

      case "item/call/argsDelta":
        setMessages((prev) => handleCallDelta(prev, params, turnId, delta));
        break;

      case "item/reasoning/textDelta":
        setMessages((prev) => handleDeltaUpdate(prev, params, turnId, "thought", delta, true));
        break;

      case "item/reasoning/summaryTextDelta":
        setMessages((prev) => handleDeltaUpdate(prev, params, turnId, "reasoningSummary", delta, true));
        break;

      case "item/completed":
        if (item?.type === "agentMessage" || item?.type === "reasoning") {
          setMessages((prev) => handleCompletedUpdate(prev, params, turnId));
        } else if (item?.type === "call") {
          setMessages((prev) => handleCallCompleted(prev, params, turnId));
        }
        break;

      case "turn/completed":
        setMessages(handleTurnCompletedUpdate);
        break;
    }
  } catch (err) {
    console.error("Stream parse error", err);
  }
}

async function loadInitialModels(
  setModels: React.Dispatch<React.SetStateAction<Model[]>>,
  setSelectedModel: React.Dispatch<React.SetStateAction<string>>,
  setSelectedEffort: React.Dispatch<React.SetStateAction<string>>
) {
  try {
    const res = await fetch("/api/models");
    const data = await res.json();
    if (data.models) {
      setModels(data.models);
      const modelsList = data.models as Model[];
      const defaultModel = modelsList.find((m: Model) => m.isDefault)?.id || modelsList[0]?.id;
      if (defaultModel) {
        setSelectedModel(defaultModel);
        const modelObj = modelsList.find((m: Model) => m.id === defaultModel);
        if (modelObj?.defaultReasoningEffort) {
          setSelectedEffort(modelObj.defaultReasoningEffort);
        }
      }
    }
  } catch (err) {
    console.error("Failed to load models:", err);
  }
}

function handleFinalizeTask(prev: Message[], result: any): Message[] {
  const next = [...prev];
  const turn = result.turn;
  const items = turn.items || [];
  
  const allToolCalls = items.filter((i: any) => i.type === "call").map((item: any) => ({
    id: item.id,
    name: item.name,
    arguments: item.arguments || "",
    result: item.result,
    status: "completed" as const
  }));
  
  const reasoningItem = items.find((i: any) => i.type === "reasoning");
  const agentMessageItem = items.find((i: any) => i.type === "agentMessage" || i.text);
  
  if (agentMessageItem) {
    const existing = next.findIndex(m => m.id === agentMessageItem.id || (m.turnId === turn.id && m.role === "agent"));
    const text = normalizeText(agentMessageItem.text || agentMessageItem.content);
    const thought = reasoningItem ? normalizeText(reasoningItem.content) : "";
    const summary = reasoningItem ? normalizeText(reasoningItem.summary) : "";
    
    if (existing >= 0) {
      next[existing] = {
        ...next[existing],
        id: agentMessageItem.id,
        content: text || next[existing].content,
        thought: thought || next[existing].thought,
        reasoningSummary: summary || next[existing].reasoningSummary,
        toolCalls: allToolCalls.length > 0 ? allToolCalls : next[existing].toolCalls,
        inProgress: false
      };
    } else {
      next.push({
        id: agentMessageItem.id || `res_${Date.now()}`,
        turnId: turn.id,
        role: "agent",
        content: text,
        thought: thought,
        reasoningSummary: summary,
        toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
        inProgress: false
      });
    }
  } else if (allToolCalls.length > 0 || reasoningItem) {
     const existing = next.findIndex(m => m.turnId === turn.id && m.role === "agent");
     const thought = reasoningItem ? normalizeText(reasoningItem.content) : "";
     const summary = reasoningItem ? normalizeText(reasoningItem.summary) : "";
     
     if (existing >= 0) {
        next[existing] = {
          ...next[existing],
          thought: thought || next[existing].thought,
          reasoningSummary: summary || next[existing].reasoningSummary,
          toolCalls: allToolCalls.length > 0 ? allToolCalls : next[existing].toolCalls,
          inProgress: false
        };
     } else {
        next.push({
          id: `res_${Date.now()}`,
          turnId: turn.id,
          role: "agent",
          content: "",
          thought: thought,
          reasoningSummary: summary,
          toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
          inProgress: false
        });
     }
  }
  
  return next;
}

export default function Home() {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("gpt-5.4");
  const [selectedEffort, setSelectedEffort] = useState<string>("medium");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInitialModels(setModels, setSelectedModel, setSelectedEffort);
    setMounted(true);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/stream");
    const handleMessage = (e: MessageEvent) => processSseMessage(e, setMessages);
    es.onmessage = handleMessage;
    return () => {
      es.close();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");
    setLoading(true);

    const tempId = `temp_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: "user", content: userText },
    ]);

    try {
      let activeThread = threadId;
      if (!activeThread) {
        const initRes = await fetch("/api/session", { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: selectedModel })
        });
        const initData = await initRes.json();
        if (initData?.thread?.id) {
          activeThread = initData.thread.id;
          setThreadId(activeThread);
        } else {
          throw new Error("Failed to start thread");
        }
      }

      const response = await fetch("/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          threadId: activeThread, 
          text: userText,
          model: selectedModel,
          effort: selectedEffort
        }),
      });

      const result = await response.json();
      console.log("Task result:", result);

      if (result?.turn?.items?.length > 0) {
        setMessages((prev) => handleFinalizeTask(prev, result));
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { id: `err_${Date.now()}`, role: "agent", content: "Error communicating with Codex App Server." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setThreadId(null);
    setMessages([]);
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    const modelObj = models.find((model) => model.id === modelId);
    if (modelObj?.defaultReasoningEffort) {
      setSelectedEffort(modelObj.defaultReasoningEffort);
    }
  };

  const loadThreadMessages = async (id: string) => {
    try {
      setLoading(true);
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
      const res = await fetch(`/api/threads/${id}`);
      const data = await res.json();
      
      if (data.thread?.turns) {
        setMessages(mapTurnsToMessages(data.thread.turns));
        if (data.thread.model) {
          setSelectedModel(data.thread.model);
        }
      }
    } catch (err) {
      console.error("Failed to load thread messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = async (msgId: string, approvalId: string | number, decision: string) => {
    try {
      const res = await fetch("/api/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: approvalId, result: decision })
      });
      if (!res.ok) throw new Error("Approval failed");
      
      setMessages(prev => prev.map(m => {
        // Robust matching using either message id or turnId
        const matchesRequest = m.id === msgId || (m.approvals?.some(a => a.id === approvalId));
        if (matchesRequest && m.approvals) {
          return {
            ...m,
            approvals: m.approvals.map(a => a.id === approvalId ? { ...a, decision } : a)
          };
        }
        return m;
      }));
    } catch (err) {
      console.error("Failed to send approval:", err);
    }
  };

  if (!mounted) return <div className="h-[100dvh] bg-[#050505]" />;

  return (
    <div className="flex h-[100dvh] bg-[#050505] text-zinc-100 font-sans selection:bg-zinc-700 overflow-hidden relative">
      <Sidebar 
        currentThreadId={threadId} 
        onSelectThread={(id) => {
          setThreadId(id);
          setMessages([]); 
          loadThreadMessages(id);
        }}
        onNewSession={() => {
          handleReset();
          if (window.innerWidth < 768) setSidebarOpen(false);
        }}
        isOpen={sidebarOpen}
        onToggle={setSidebarOpen}
      />

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <button 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 w-full h-full cursor-default"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <ChatHeader 
          threadId={threadId} 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen}
        />
        
        <MessageList 
          messages={messages} 
          scrollRef={scrollRef} 
          onApproval={handleApprovalAction}
        />

        <ChatInput 
          input={input} 
          setInput={setInput} 
          handleSubmit={handleSubmit} 
          loading={loading}
          models={models}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
          selectedEffort={selectedEffort}
          onEffortChange={setSelectedEffort}
        />
      </div>
    </div>
  );
}
