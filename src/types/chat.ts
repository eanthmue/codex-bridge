export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
  result?: string;
  status: "started" | "completed" | "failed";
}

export interface ApprovalRequest {
  id: string | number; // JSON-RPC request ID
  type: "commandExecution" | "fileChange";
  itemId: string;
  params: any;
  decision?: string; // Cache the decision made
}

export interface Message {
  id: string;
  turnId?: string;
  role: "user" | "agent";
  content: string;
  thought?: string;
  reasoningSummary?: string;
  isThinking?: boolean;
  inProgress?: boolean;
  toolCalls?: ToolCall[];
  approvals?: ApprovalRequest[];
}
export interface ReasoningEffort {
  reasoningEffort: "low" | "medium" | "high";
  description?: string;
}

export interface Model {
  id: string;
  model: string;
  displayName: string;
  hidden: boolean;
  isDefault?: boolean;
  defaultReasoningEffort?: "low" | "medium" | "high";
  supportedReasoningEfforts?: ReasoningEffort[];
}

