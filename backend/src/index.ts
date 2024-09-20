import { createServer, defaultServerOptions } from "./server";
import { envBool, envInt, envStr } from "./utils/env";

const options = defaultServerOptions();

const envPrefix = "MEHR_LAMETTA_";
options.port = envInt(`${envPrefix}PORT`, options.port);
options.dataRoot = envStr(`${envPrefix}DATA_ROOT`, options.dataRoot);
options.ephemeral = envBool(`${envPrefix}EPHEMERAL`, options.ephemeral);
options.initialAdminPassword = envStr(`${envPrefix}FORCE_INITIAL_ADMIN_PASSWORD`, undefined);

createServer(options);
