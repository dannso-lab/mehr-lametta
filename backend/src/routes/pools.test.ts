import { expect, test, suite, describe } from "vitest";
import { testServerInstance } from "../utils/test";

suite("pools", () => {
  describe("/api/v1/pools", () => {
    test("anonymous call is stopped", async () => {
      // GIVEN
      const server = await testServerInstance();

      // WHEN
      const result = await server.fetch(`/api/v1/pools`);

      // THEN
      expect(result.status).toBe(401);
    });
  });
});
