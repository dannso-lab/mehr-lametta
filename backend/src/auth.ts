import passport from "passport";
import passportLocal from "passport-local";
import crypto from "node:crypto";
import { createUser, findUserByName, hashUserPassword } from "./data/userprofile";
import { secureRandomId } from "./dannso/crypto/random";
import connectSqlite3 from "connect-sqlite3";
import expressSession from "express-session";
import { Context } from "./context";

async function ensureInitialUser(context: Context) {
  const adminUser = await findUserByName(context, "admin");
  if (!adminUser) {
    const initialAdminPassword = context.serverOptions.initialAdminPassword || secureRandomId();
    await createUser(context, "admin", initialAdminPassword);
    //console.log(`created initial admin user: admin // ${initialAdminPassword}`);
  } else {
    //console.log("admin exists no need to create it");
  }
}

const INCORRECT_LOGIN_MSG = "Incorrect user name or password";

export async function setupAuthMiddleware(context: Context) {
  const { app, dbAuthSecrets } = context;

  // find secrets for the session middleware
  const secrets = (await dbAuthSecrets.query({ selector: {}, sort: ["createdAt"] })).values;
  if (secrets.length === 0) {
    //console.log(`Creating auth secret`);
    await dbAuthSecrets.put(secureRandomId(), {
      createdAt: Date.now(),
      s: secureRandomId(),
    });
    // TODO: avoid this function calling itself... its just confusing when code changes
    return setupAuthMiddleware(context);
  }

  // INIT PASSPORT GLOBALLY
  // TODO: we should investigate a way to not use a global passport instance, for now ok
  // -- danger start --
  passport.use(
    new passportLocal.Strategy(async function verify(username, password, cb) {
      const user = await findUserByName(context, username);
      if (!user) {
        return cb(null, false, { message: INCORRECT_LOGIN_MSG });
      }

      const hashedpasswordReference = Buffer.from(user.hashedpassword, "hex");
      const hashedpasswordAttempt = await hashUserPassword(password, user.salt);
      if (!crypto.timingSafeEqual(hashedpasswordReference, hashedpasswordAttempt)) {
        return cb(null, false, { message: INCORRECT_LOGIN_MSG });
      }

      const returnedUser = { ...user };
      delete returnedUser["hashedpassword"];
      delete returnedUser["salt"];
      cb(null, returnedUser);
    }),
  );
  passport.serializeUser(function (user: any, cb) {
    process.nextTick(function () {
      cb(null, { name: user.name });
    });
  });

  passport.deserializeUser(function (user: any, cb) {
    process.nextTick(function () {
      return cb(null, user);
    });
  });
  // -- DANGER END --

  // make sure we have an admin account
  await ensureInitialUser(context);

  // apply session middleware
  const SqliteStore = connectSqlite3(expressSession);
  app.use(
    expressSession({
      // TODO: secret is an array... first one is used to create new sessions...old ones can still be validated
      // going forward we should periodically rotate the secrets... figure out how to do it...for now just generate one
      secret: secrets.map((doc) => doc.value.s),
      resave: false,
      saveUninitialized: false,
      ...(context.serverOptions.ephemeral
        ? {}
        : {
            store: new SqliteStore({ db: "sessions.db", dir: context.serverOptions.dataRoot }),
          }),
    }),
  );

  // passport.js middleware to populate the req.user field
  app.use(passport.authenticate("session"));

  // setup passport.js route for logging in
  app.post(
    "/api/v1/login/password",
    passport.authenticate("local", {
      successRedirect: "/ok",
      failureRedirect: "/fail",
    }),
  );

  app.post("/api/v1/login/whoami", (req, res) => {
    if (req.user) {
      const user = req.user;
      res.json({
        name: user.name,
      });
    } else {
      res.sendStatus(404);
    }
  });
}
