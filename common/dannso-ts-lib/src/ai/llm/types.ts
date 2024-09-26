import { RJSFSchema } from "@rjsf/utils";

// -- common type is "a message" --

export interface ChatMessage {
  role: string; // system, user, assistant, tool...
  content: string;

  // tool_calls are sometimes emitted from an assistant message when the assistant wants to call a tool
  // instead of providing an answer directly
  // -> goal of the system is then to fulfill the tools call and add the results back as "tool" messages
  tool_calls?: {
    id: string;
    function: {
      name: string;
      arguments: any;
    };
  }[];
}

// -- Request to LLM service --

export interface ChatRequest {
  // Request to LLM service
  model: string;
  stream?: boolean;
  messages: ChatMessage[];
  tools?: ChatTool[];
}

export interface ChatTool {
  // Description of tools available to the assistant
  type: "function";
  function: {
    description?: string;
    name: string;
    parameters?: RJSFSchema;
  };
}

// -- response from LLM service --

export interface ChatFinishedResult {
  finishReason: "stop" | "tool_calls" | "error";
  error?: ChatError;
  messages: ChatMessage[];
  toolCalls?: ChatToolCallRequest[];
}

export interface ChatError {
  message: string;
}

export interface ChatToolCallRequest {
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

// -- abstraction for how to call an LLM service --

export type ChatFn = (request: ChatRequest, receiver: ChatReceiver) => void;

export interface ChatReceiver {
  onUpdateMessages?: (messages: ChatMessage[]) => void;
  onChunk?: (chunk: string, messages: ChatMessage[]) => void;
  onFinished?: (result: ChatFinishedResult) => void;
  onConfigureToolVisibility?: (toolVisibility: {
    [k: string]: boolean;
  }) => void;
}

export interface LLMChatService {
  listModels: () => Promise<ChatModel[]>;
  chat: ChatFn;
}

export interface ChatModel {
  name: string;
  id: string;
}
