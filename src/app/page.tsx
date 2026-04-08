"use client";

import React, { useEffect, useRef, useState } from "react";
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
    let lastThought = "";
    let lastSummary = "";

    (turn.items || []).forEach((item: any) => {
      if (item.type === "reasoning") {
        lastThought = normalizeText(item.content);
        lastSummary = normalizeText(item.summary);
      } else if (item.type === "userMessage" || item.type === "agentMessage") {
        const role: "user" | "agent" = item.type === "userMessage" ? "user" : "agent";
        const content = normalizeText(item.content || item.text);
        
        messages.push({
          id: item.id || `${role}_${Date.now()}_${Math.random()}`,
          turnId: turn.id,
          role,
          content,
          thought: role === "agent" ? lastThought : undefined,
          reasoningSummary: role === "agent" ? lastSummary : undefined
        });
        
        if (role === "agent") {
          lastThought = "";
          lastSummary = "";
        }
      }
    });
    return messages;
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

function handleFinalizeTask(prev: Message[], result: any): Message[] {
  const next = [...prev];
  result.turn.items.forEach((item: any) => {
    if (item.type === "agentMessage" || item.text) {
      const existing = next.findIndex(m => m.id === item.id);
      const text = normalizeText(item.text || item.content);
      if (existing >= 0) {
        next[existing] = { ...next[existing], content: text || next[existing].content, inProgress: false };
      } else {
        next.push({
          id: item.id || `res_${Date.now()}`,
          role: "agent",
          content: text,
          inProgress: false
        });
      }
    }
  });
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
    async function loadInitialData() {
      try {
        const res = await fetch("/api/session");
        const data = await res.json();
        if (data.models) {
          setModels(data.models);
          const defaultModel = data.models.find((m: Model) => m.isDefault)?.id || data.models[0]?.id;
          if (defaultModel) {
            setSelectedModel(defaultModel);
            const modelObj = data.models.find((m: Model) => m.id === defaultModel);
            if (modelObj?.defaultReasoningEffort) {
              setSelectedEffort(modelObj.defaultReasoningEffort);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load models:", err);
      }
    }
    loadInitialData();
    setMounted(true);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/stream");
    
    const handleSseMessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        const { method = "", params = {} } = payload;
        const { turnId, delta = "", item } = params;

        switch (method) {
          case "item/started":
            if (item?.type === "agentMessage" || item?.type === "reasoning") {
              setMessages((prev) => handleStartedUpdate(prev, params, turnId));
            }
            break;

          case "item/agentMessage/delta":
            setMessages((prev) => handleDeltaUpdate(prev, params, turnId, "content", delta, false));
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
            }
            break;

          case "turn/completed":
            setMessages((prev) =>
              prev.map((m) => (m.inProgress ? { ...m, inProgress: false } : m))
            );
            break;
        }
      } catch (err) {
        console.error("Stream parse error", err);
      }
    };

    es.onmessage = handleSseMessage;

    return () => {
      es.close();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
