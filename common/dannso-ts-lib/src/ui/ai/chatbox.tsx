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
import { ChatFn, ChatMessage } from "../../ai/llm/types";

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

export function ChatBox({
  chatFn,
  model,
  systemPrompt,
}: {
  chatFn: ChatFn;
  model: string;
  systemPrompt?: string;
}) {
  const [prompt, setPrompt] = useState<string>("");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  systemPrompt = systemPrompt || "You are a helpful assistant.";

  const onSubmit = useCallback(() => {
    if (!isRunning) {
      const newMessages = [...messages];
      if (newMessages.length === 0) {
        newMessages.push({
          role: "system",
          content: systemPrompt,
        });
      }
      newMessages.push({
        role: "user",
        content: prompt,
      });
      setPrompt("");
      setIsRunning(true);
      chatFn(
        {
          model,
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
