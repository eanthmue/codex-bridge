export interface Message {
  id: string;
  turnId?: string;
  role: "user" | "agent";
  content: string;
  thought?: string;
  reasoningSummary?: string;
  isThinking?: boolean;
  inProgress?: boolean;
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

