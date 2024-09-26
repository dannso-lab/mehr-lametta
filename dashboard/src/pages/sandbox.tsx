import { withTheme } from "@rjsf/core";
import { RJSFSchema } from "@rjsf/utils";
import validator from "@rjsf/validator-ajv8";
import { Theme as SemanticUITheme } from "@rjsf/semantic-ui";

import { ollamaChatService, chatWithTools } from "../dannso/ai/llm/services";
import { ChatBox } from "../dannso/ui/ai/chatbox";

import { weatherTool } from "../dannso/ai/llm/tools/weather-tool";
import { idleTool } from "../dannso/ai/llm/tools/idle-tool";

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

const ol = ollamaChatService(`http://localhost:11434`);

const aschat = chatWithTools(ol.chat, [weatherTool, idleTool]);

export function Sandbox() {
  return (
    <>
      <h1>hi this the sandbox</h1>
      {false && <Form schema={schema} validator={validator} />}
      <ChatBox
        chatFn={aschat}
        systemPrompt={`
          You are a helpful assistant.
          If you use tools, don't mention them to the user. Just ask based on their output.
          Today is: ${new Date()}
        `}
        model={"llama3.1"}
      />
    </>
  );
}
