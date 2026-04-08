export interface JsonRpcRequest {
  method: string;
  id?: number | string;
  params?: any;
}

export interface JsonRpcResponse {
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    codexErrorInfo?: any;
    additionalDetails?: any;
  };
}

export interface JsonRpcNotification {
  method: string;
  params?: any;
}

export type JsonRpcMessage = JsonRpcRequest | JsonRpcResponse | JsonRpcNotification;

// Common App Server Protocol Results
export interface ThreadResult {
  thread: {
    id: string;
    preview?: string;
    ephemeral?: boolean;
    name?: string;
  };
}

export interface TurnResult {
  turn: {
    id: string;
    status: "inProgress" | "completed" | "interrupted" | "failed";
    items: any[];
    error?: any;
  };
}
