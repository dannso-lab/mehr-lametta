import { CallableTool } from "../services";

export const randomTool: CallableTool = {
  description: {
    type: "function",
    function: {
      name: "random_number",
      description: "rolls a random number",
      parameters: {
        type: "object",
        properties: {
          from: {
            type: "number",
            description: "the minimum that that the random number will be",
          },
          to: {
            type: "number",
            description: "the minimum that that the random number will be",
          },
          isInteger: {
            type: "boolean",
            description:
              "should the random number be an integer or a floating point number",
          },
        },
        required: ["location"],
        additionalProperties: false,
      },
    },
  },
  async fn({
    from,
    to,
    isInteger,
  }: {
    from: number;
    to: number;
    isInteger: boolean;
  }) {
    let res: number;
    if (isInteger) {
      from = parseInt(String(from));
      to = parseInt(String(to));
      res = Math.floor(Math.random() * (to - from + 1)) + from;
    } else {
      from = parseFloat(String(from));
      to = parseFloat(String(to));
      res = Math.floor(Math.random() * (to - from + 1)) + from;
    }
    return JSON.stringify({ type: "random number", from, to, result: res });
  },
};
