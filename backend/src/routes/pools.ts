import { listPools } from "../data/pools";
import { Context } from "../context";

export function setupPoolsRoutes(context: Context) {
  const { app } = context;

  app.get("/api/v1/pools", async (req, res) => {
    if (req.user) {
      const pools = await listPools(context);
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
