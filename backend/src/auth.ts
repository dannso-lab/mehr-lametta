import passport from "passport";
import passportLocal from "passport-local";
import crypto from "node:crypto";
import { createUser, findUserByName, hashUserPassword } from "./data/userprofile";
import { secureRandomId } from "./dannso/crypto/random";
import { Express } from "express";
import connectSqlite3 from "connect-sqlite3";
import expressSession from "express-session";
import { authSecrets } from "./data/dbprovider";
const SqliteStore = connectSqlite3(expressSession);

async function ensureInitialUser() {
  const adminUser = await findUserByName("admin");
  if (!adminUser) {
    const initialAdminPassword = secureRandomId();
    await createUser("admin", initialAdminPassword);
    console.log(`created initial admin user: admin // ${initialAdminPassword}`);
  } else {
    console.log("admin exists. no need to create it");
  }
}

const INCORRECT_LOGIN_MSG = "Incorrect user name or password";

// INIT PASSPORT GLOBALLY
passport.use(
  new passportLocal.Strategy(async function verify(username, password, cb) {
    const user = await findUserByName(username);
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
  })
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

export async function setupAuthMiddleware(app: Express) {
  // make sure we have an admin account
  await ensureInitialUser();

  // find secrets for the session middleware
  const secretsDb = await authSecrets();
  const secrets = (await secretsDb.query({ selector: {}, sort: ["createdAt"] })).values;
  if (secrets.length === 0) {
    console.log(`Creating auth secret`);
    await secretsDb.put(secureRandomId(), {
      createdAt: Date.now(),
      s: secureRandomId(),
    });
    return setupAuthMiddleware(app);
  }

  // apply session middleware
  app.use(
    expressSession({
      // TODO: secret is an array... first one is used to create new sessions...old ones can still be validated
      // going forward we should periodically rotate the secrets... figure out how to do it...for now just generate one
      secret: secrets.map((doc) => doc.value.s),
      resave: false,
      saveUninitialized: false,
      store: new SqliteStore({ db: "sessions.db", dir: "./data" }),
    })
  );

  // passport.js middleware to populate the req.user field
  app.use(passport.authenticate("session"));

  // setup passport.js route for logging in
  app.post(
    "/api/v1/login/password",
    passport.authenticate("local", {
      successRedirect: "/ok",
      failureRedirect: "/fail",
    })
  );
}
