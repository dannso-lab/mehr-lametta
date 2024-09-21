import { expect, test } from "vitest";
import { testServerInstance } from "./utils/test";

test("can start a responding test server", async () => {
  // GIVEN
  const server = await testServerInstance();

  // WHEN
  const result = await server.fetch(`/`);

  // THEN
  expect(result.status).toBe(200);
});
