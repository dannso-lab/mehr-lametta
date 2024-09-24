import { withTheme } from "@rjsf/core";
import { RJSFSchema } from "@rjsf/utils";
import validator from "@rjsf/validator-ajv8";
import { Theme as SemanticUITheme } from "@rjsf/semantic-ui";
import { unimpl } from "../dannso/utils/unimpl";
import {
  Input,
  Comment,
  CommentContent,
  CommentText,
  CommentAuthor,
  CommentGroup,
  Icon,
  MessageContent,
  Message,
  Accordion,
  AccordionTitle,
  AccordionContent,
} from "semantic-ui-react";
import { memo, useCallback, useState } from "react";
import Markdown from "react-markdown";

// See: https://nominatim.org/release-docs/develop/api/Output/
// there are more fields...
interface NominatimGeocodingResult {
  lat: string;
  lon: string;
  name: string;
  display_name: string;
}

export async function nominatimGeocode(q: string) {
  const res: NominatimGeocodingResult[] = await (
    await fetch(
      `https://nominatim.openstreetmap.org/search.php?q=${encodeURIComponent(
        q
      )}&format=jsonv2`
    )
  ).json();
  return res;
}

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
  tool_calls?: {
    id: string;
    function: {
      name: string;
      arguments: any;
    };
  }[];
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
  onUpdateMessages?: (messages: ChatMessage[]) => void;
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
    const weatherCodeToHumanReadable: { [k: string]: string } = {
      "0": "clear sky",
      "1": "mainly clear",
      "2": "partly cloudy",
      "3": "overcast",
      "45": "fog",
      "48": "depositing rime fog",
      "51": "light drizzle",
      "53": "moderate drizzle",
      "55": "dense intensity drizzle",
      "56": "freezing drizzle",
      "57": "freezing drizzle with dense intensity",
      "61": "slight rain",
      "63": "moderate rain",
      "65": "heavy rain",
      "66": "light freezing rain",
      "67": "heavy freezing rain",
      "71": "slight snow fall",
      "73": "heavy snow fall",
      "75": "heavy snow fall",
      "77": "snow grains",
      "80": "slight rain showers",
      "81": "moderate rain showers",
      "82": "violent rain showers",
      "85": "slight snow showers",
      "86": "heavy snow showers",
      "95": "thunderstorm",
      "96": "thunderstorm with slight hail",
      "99": "thunderstorm with heavy hail",
    };

    try {
      const geocodedPlace = (await nominatimGeocode(location))[0];
      const weather = await (
        await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(
            geocodedPlace.lat
          )}&longitude=${encodeURIComponent(
            geocodedPlace.lon
          )}&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&forecast_days=1`
        )
      ).json();
      //console.log(weather);
      const toolResult = {
        name: "get_weather",
        location,
        current: `${weather.current.temperature_2m}${
          weather.current_units.temperature_2m
        }, ${
          weatherCodeToHumanReadable[`${weather.current.weather_code}`] || ""
        }`,
        forecast: weather.hourly.temperature_2m.map(
          (t: number, i: any) =>
            `${weather.hourly.time[i]}: ${t}${
              weather.hourly_units.temperature_2m
            }, ${
              weatherCodeToHumanReadable[`${weather.hourly.weather_code[i]}`] ||
              ""
            }`
        ),
      };
      //console.log("toolresult:", toolResult);
      return JSON.stringify(toolResult);
    } catch (e) {
      return JSON.stringify({
        name: "get_weather",
        error: `unable to retrieve data for ${location}`,
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
    return JSON.stringify({
      status:
        "ready to answer - dont mention that you used or didnt use a tool",
    });
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

const aschat = chatWithTools(ol.chat, [weatherTool, idleTool]);

const toolNamesToIgnore = ["idle"];

const LLMTextDisplay = memo(function LLMTextDisplay({
  text,
}: {
  text: string;
}) {
  return (
    <>
      <Markdown>{text}</Markdown>
    </>
  );
});

function ToolInfo({ name, res, args }: { name: string; res: any; args: any }) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  if (res) {
    res = res.content;
    try {
      res = JSON.parse(res);
    } catch (e) {}
  }
  return (
    <Message icon>
      {!res && <Icon name="circle notched" loading />}
      <MessageContent>
        <Accordion>
          <AccordionTitle active={isOpen} onClick={() => setIsOpen(!isOpen)}>
            <Icon name="dropdown" />
            {name}
          </AccordionTitle>
          <AccordionContent active={isOpen}>
            parameters:
            <pre>{JSON.stringify(args, null, 2)}</pre>
            {!!res && (
              <>
                result:
                <pre>{JSON.stringify(res, null, 2)}</pre>
              </>
            )}
          </AccordionContent>
        </Accordion>
      </MessageContent>
    </Message>
  );
}

function ChatBox() {
  const [prompt, setPrompt] = useState<string>("");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const onSubmit = useCallback(() => {
    if (!isRunning) {
      const newMessages = [...messages];
      if (newMessages.length === 0) {
        newMessages.push({
          role: "system",
          content: `
          You are a helpful assistant.
          If you use tools, don't mention them to the user. Just ask based on their output.
          Today is: ${new Date()}
        `,
        });
      }
      newMessages.push({
        role: "user",
        content: prompt,
      });
      setPrompt("");
      setIsRunning(true);
      aschat(
        {
          model: "llama3.1",
          messages: newMessages,
        },
        {
          onFinished(result) {
            setMessages(result.messages);
            setIsRunning(false);
          },
          onUpdateMessages(messages) {
            setMessages(messages);
          },
        }
      );
    }
  }, [isRunning, messages, prompt]);

  return (
    <>
      <CommentGroup>
        {messages.map((m, index, array) => {
          if (m.role === "system") {
            return <div key={index}></div>;
          }
          if (m.role === "tool") {
            return <div key={index}></div>;
          }
          if (m.role === "assistant" && m.tool_calls) {
            return m.tool_calls.map((tc, tcIndex) => {
              if (toolNamesToIgnore.includes(tc.function.name)) {
                return <div key={tcIndex}></div>;
              }
              const toolResults = array[index + 1 + tcIndex];
              return (
                <ToolInfo
                  key={tcIndex}
                  name={tc.function.name}
                  res={toolResults}
                  args={tc.function.arguments}
                ></ToolInfo>
              );
            });
          }
          return (
            <Comment key={index}>
              <CommentContent>
                <CommentAuthor>{m.role}</CommentAuthor>
                <CommentText>
                  <LLMTextDisplay text={m.content}></LLMTextDisplay>
                </CommentText>
              </CommentContent>
            </Comment>
          );
        })}
      </CommentGroup>
      <Input
        disabled={isRunning}
        value={prompt}
        onChange={(ev) => setPrompt(ev.target.value)}
        onKeyDown={(ev: KeyboardEvent) => {
          if (ev.key === "Enter") {
            onSubmit();
          }
        }}
        action={{
          content: "send",
          onClick: () => {
            onSubmit();
          },
        }}
      ></Input>
    </>
  );
}

export function Sandbox() {
  return (
    <>
      <h1>hi this the sandbox</h1>
      {false && <Form schema={schema} validator={validator} />}
      <ChatBox />
    </>
  );
}
