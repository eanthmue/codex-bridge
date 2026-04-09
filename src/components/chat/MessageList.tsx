import { RefObject } from "react";
import { Message } from "@/types/chat";
import { MessageItem } from "./MessageItem";
import { EmptyState } from "./EmptyState";

interface MessageListProps {
  readonly messages: Message[];
  readonly scrollRef: RefObject<HTMLDivElement | null>;
  readonly onApproval?: (msgId: string, approvalId: string | number, decision: string) => void;
}

export function MessageList({ messages, scrollRef, onApproval }: MessageListProps) {
  return (
    <main
      ref={scrollRef as any}
      className="flex-1 overflow-y-auto px-4 py-8 md:px-0 scroll-smooth"
    >
      <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-48">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          messages.map((msg) => (
            <MessageItem key={msg.id} msg={msg} onApproval={onApproval} />
          ))
        )}
      </div>
    </main>
  );
}
