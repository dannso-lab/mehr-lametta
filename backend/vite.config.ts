import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // this enables to create one server and share it with all the tests easily
    // TODO: in the future we could also use some kind of process start scheme... but this is easiest for now
    isolate: false,
    fileParallelism: false,
  },
});
