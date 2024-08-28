import express, { Express } from "express";
import helmet from "helmet";
import bodyParser from "body-parser";
import { setupAuthMiddleware } from "./auth";

function setupHygenicHeaders(app: Express) {
  // Use Helmet!
  app.use(helmet());
  app.use(function (req, res, next) {
    res.setHeader("X-Robots-Tag", "noindex,nofollow");
    next();
  });
}

async function main() {
  const PORT = 3001;
  const app = express();
  app.use(bodyParser());

  setupHygenicHeaders(app);
  await setupAuthMiddleware(app);

  app.get("/api/v1/", (req, res) => {
    console.log("session:", req.user);
    res.send("Hello !");
  });
  app.listen(PORT, () => {
    console.log(`running on port: ${PORT}`);
  });
}

main();
