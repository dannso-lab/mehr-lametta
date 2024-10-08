import { Server } from 'node:http';
import { Express } from "express";
import { LilDb } from "./dannso/lildb/common";
import { DbAuthSecret, DbPoolSpec, DbUserProfile } from "./data/types";

export interface ServerOptions {
  port: number; // tcp port for api
  dataRoot: string; // should be a folder where we can write our data in
  ephemeral: boolean; // when true: data is held in memory ... used by integration tests

  initialAdminPassword?: string; // if no admin is on the server, set it to this pssword ... used for the integration tests
}

export interface Context {
  serverOptions: ServerOptions;

  dbUserProfile: LilDb<DbUserProfile>;
  dbAuthSecrets: LilDb<DbAuthSecret>;
  dbPools: LilDb<DbPoolSpec>;

  httpServer: Server
  app: Express;
}
