import { CallableTool } from "../services";

export const idleTool: CallableTool = {
  description: {
    type: "function",
    function: {
      name: "idle",
      description:
        "pass some time to think. use this function if no other function directly applies to the user's prompt",
    },
  },
  async fn(/* args: any */) {
    return JSON.stringify({
      status:
        "ready to answer - dont mention that you used or didnt use a tool",
    });
  },
};
