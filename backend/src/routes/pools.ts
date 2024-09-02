import { Express } from "express";
import { listPools } from "../data/pools";

export function setupPoolsRoutes(app: Express) {
  app.get("/api/v1/pools", async (req, res) => {
    if (req.user) {
      const pools = await listPools();
      res.json({
        pools: pools.map((poolDoc) => ({
          id: poolDoc.id,
          label: poolDoc.value.label,
        })),
      });
    } else {
      res.sendStatus(401);
    }
  });
}
