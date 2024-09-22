import { withTheme } from "@rjsf/core";
import { RJSFSchema } from "@rjsf/utils";
import validator from "@rjsf/validator-ajv8";
import { Theme as SemanticUITheme } from "@rjsf/semantic-ui";
import { unimpl } from "../dannso/utils/unimpl";

// Make modifications to the theme with your own fields and widgets

const Form = withTheme(SemanticUITheme);

const schema: RJSFSchema = {
  title: "Test form",
  type: "object",
  properties: {
    name: {
      type: "string",
    },
    age: {
      type: "number",
    },
  },
};

export interface ChatMessage {
  role: string; // system, user, assistant, tool...
  content: string;
}

export interface ChatTool {
  type: "function";
  function: {
    description?: string;
    name: string;
    parameters?: RJSFSchema;
  };
}

export interface ChatRequest {
  model: string;
  stream?: boolean;
  messages: ChatMessage[];
  tools?: ChatTool[];
}

export interface ChatModel {
  name: string;
  id: string;
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

export interface ChatFinishedResult {
  finishReason: "stop" | "tool_calls" | "error";
  error?: ChatError;
  messages: ChatMessage[];
  toolCalls?: ChatToolCallRequest[];
}

export interface ChatReceiver {
  onChunk?: (chunk: string, messages: ChatMessage[]) => void;
  onFinished?: (result: ChatFinishedResult) => void;
}

export type ChatFn = (request: ChatRequest, receiver: ChatReceiver) => void;

export interface LLMChatService {
  listModels: () => Promise<ChatModel[]>;
  chat: ChatFn;
}

export function openAiCompatibleChat(opts: { url: string }) {
  return async function chat(request: ChatRequest, receiver: ChatReceiver) {
    if (!!request.stream) {
      throw unimpl();
    } else {
      try {
        const res = await fetch(opts.url, {
          method: "POST",
          body: JSON.stringify(request),
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (res.status === 200) {
          const json = await res.json();
          console.log(`Response json: ${JSON.stringify(json, null, 2)}`);
          const finish_reason = json.choices[0].finish_reason;
          if (finish_reason === "stop") {
            receiver.onFinished &&
              receiver.onFinished({
                finishReason: finish_reason,
                messages: [
                  ...request.messages,
                  {
                    role: json.choices[0].message.role,
                    content: json.choices[0].message.content,
                  },
                ],
              });
          } else if (finish_reason === "tool_calls") {
            const tool_calls = json.choices[0].message.tool_calls;
            receiver.onFinished &&
              receiver.onFinished({
                finishReason: finish_reason,
                toolCalls: tool_calls,
                messages: request.messages,
              });
          } else {
            throw unimpl();
          }
        } else {
          throw new Error(`chat server responded with code: ${res.status}`);
        }
      } catch (e) {
        receiver.onFinished &&
          receiver.onFinished({
            finishReason: "error",
            error: {
              message: `${e}`,
            },
            messages: request.messages,
          });
      }
    }
  };
}

export function ollamaChatService(url: string): LLMChatService {
  const chat = openAiCompatibleChat({
    url: `${url}/v1/chat/completions`,
  });

  return {
    chat,
    async listModels() {
      throw unimpl();
    },
  };
}

const ol = ollamaChatService(`http://localhost:11434`);

/*
function fnDescInJSONSchema(
  name: string,
  description: string,
  params: { name: string; description: string }[]
) {}
  */

export interface CallableTool {
  description: ChatTool;
  fn: (args: any) => Promise<string>;
}

const weatherTool: CallableTool = {
  description: {
    type: "function",
    function: {
      name: "get_weather",
      description: "finds the current weather at the named location",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description:
              "the location of the weather (district, city, country etc.)",
          },
        },
        required: ["location"],
        additionalProperties: false,
      },
    },
  },
  async fn(arg: { location: string }) {
    const location = String(arg.location);
    if (location === "Berlin") {
      return JSON.stringify({
        name: "get_weather",
        location,
        celsius: 24,
      });
    } else {
      return JSON.stringify({
        name: "get_weather",
        error: `no data for ${location}`,
      });
    }
  },
};

const idleTool: CallableTool = {
  description: {
    type: "function",
    function: {
      name: "idle",
      description:
        "pass some time to think. use this function if no other function directly applies to the user's prompt",
    },
  },
  async fn(args: any) {
    return JSON.stringify({ name: "idle" });
  },
};

export function chatWithTools(chatFnOriginal: ChatFn, tools: CallableTool[]) {
  return function chat(request: ChatRequest, receiver: ChatReceiver) {
    const modifiedRequest = { ...request };
    modifiedRequest.tools = [
      ...(modifiedRequest.tools || []),
      ...tools.map((t) => t.description),
    ];
    console.log(modifiedRequest);
    chatFnOriginal(modifiedRequest, {
      onChunk(chunk: string, messages: ChatMessage[]) {
        receiver.onChunk && receiver.onChunk(chunk, messages);
      },
      async onFinished(result: ChatFinishedResult) {
        if (result.finishReason === "tool_calls") {
          const messagesAfterTools = [...result.messages];
          //console.log("DETECTED TOOLS CALL!", JSON.stringify(result, null, 2));
          for (let toolCallRequest of result.toolCalls!) {
            const tool = tools.find(
              (tool) =>
                tool.description.function.name === toolCallRequest.function.name
            );
            if (tool) {
              try {
                const res = await tool.fn(
                  JSON.parse(toolCallRequest.function.arguments)
                );
                console.log("TOOL RES", res);
                messagesAfterTools.push({
                  role: "tool",
                  content: res,
                });
              } catch (e) {
                messagesAfterTools.push({
                  role: "tool",
                  content: `error running tool: ${e}`,
                });
              }
            } else {
              messagesAfterTools.push({
                role: "tool",
                content: JSON.stringify({
                  error: "no such tool",
                  name: toolCallRequest.function.name,
                }),
              });
            }
          }
          chat({ ...request, messages: messagesAfterTools }, receiver);
        } else {
          receiver.onFinished && receiver.onFinished(result);
        }
      },
    });
  };
}

const aschat = chatWithTools(ol.chat, [weatherTool, idleTool]);

aschat(
  {
    //model: "smollm:360m",
    //model: "smollm:135m",
    model: "llama3.1",

    messages: [
      {
        role: "system",
        content: `
          You are a helpful assistant.
          Today is: ${new Date()}
        `,
      },
      {
        role: "user",
        //content: "Whats the weather in Berlin like?",
        content: "What are oblique strategies in one sentence?",
      },
    ],
  },
  {
    onFinished(res) {
      console.log(`Final Res: \n${JSON.stringify(res, null, 2)}`);
    },
  }
);

export function Sandbox() {
  return (
    <>
      <h1>hi this the sandbox</h1>
      {false && <Form schema={schema} validator={validator} />}
    </>
  );
}
