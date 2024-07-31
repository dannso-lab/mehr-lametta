import passport from "passport";
import passportLocal from "passport-local";
import { createUser, findUserByName } from "./data/userprofile";
import { secureRandomId } from "./dannso/crypto/random";

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

ensureInitialUser();

passport.use(
  new passportLocal.Strategy(function verify(username, passworrd, cb) {})
);
