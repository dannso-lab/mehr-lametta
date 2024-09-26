import {
  ChatRequest,
  ChatReceiver,
  ChatTool,
  ChatFn,
  ChatMessage,
  ChatFinishedResult,
  LLMChatService,
} from "./types";

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
                messages: [...request.messages, json.choices[0].message],
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

export interface CallableTool {
  description: ChatTool;
  fn: (args: any) => Promise<string>;
}

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
          receiver.onUpdateMessages &&
            receiver.onUpdateMessages(messagesAfterTools);
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
            receiver.onUpdateMessages &&
              receiver.onUpdateMessages(messagesAfterTools);
          }
          chat({ ...request, messages: messagesAfterTools }, receiver);
        } else {
          receiver.onFinished && receiver.onFinished(result);
        }
      },
    });
  };
}
function unimpl() {
  throw new Error("Function not implemented.");
}
