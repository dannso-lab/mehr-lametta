import express, { Express } from "express";
import helmet from "helmet";
import bodyParser from "body-parser";
import { setupAuthMiddleware } from "./auth";
import { setupPoolsRoutes } from "./routes/pools";
import { Context, ServerOptions } from "./context";
import { LilDbStorageManagerSqliteDirectory, LilDbStorageManagerSqliteInMemory } from "./dannso/lildb/sqlite";
import { createServer } from "node:http";
import { setupRelayService } from "./routes/relay";

async function setupHygenicHeaders(app: Express) {
  // Use Helmet!
  app.use(helmet());
  app.use(function (req, res, next) {
    res.setHeader("X-Robots-Tag", "noindex,nofollow");
    next();
  });
}

export function defaultServerOptions(): ServerOptions {
  return {
    port: 3001,
    dataRoot: "data",
    ephemeral: false,
  };
}

async function openDatabases(context: Context) {
  const dbProvider = context.serverOptions.ephemeral
    ? new LilDbStorageManagerSqliteInMemory()
    : new LilDbStorageManagerSqliteDirectory(context.serverOptions.dataRoot);

  context.dbUserProfile = await dbProvider.open("users");
  context.dbAuthSecrets = await dbProvider.open("authsecrets");
  context.dbPools = await dbProvider.open("pools");
}

export async function createApplicationServer(options: ServerOptions) {
  const context: Context = {} as any as Context; // services will fill up the context structure as they start up

  context.serverOptions = options;
  await openDatabases(context);

  context.app = express();
  const server = createServer(context.app);
  context.httpServer = server;

  context.app.use(bodyParser());

  await setupHygenicHeaders(context.app);
  await setupAuthMiddleware(context);
  await setupRelayService(context);
  await setupPoolsRoutes(context);

  context.app.get("/", (rq, res) => {
    res.sendStatus(200);
  });

  return new Promise<void>((onServerStarted) => {
    server.listen(options.port, () => {
      console.log(`server running on port: ${options.port}`);
      onServerStarted();
    });
  });
}
