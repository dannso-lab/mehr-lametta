import { secureRandomId } from "../dannso/crypto/random";
import { createServer, defaultServerOptions } from "../server";
import { sleepMs } from "../dannso/utils/sleep";

export interface TestServerInstance {
  readonly url: string;
  readonly adminPassword: string;
}

let _globalTestServerInstance: TestServerInstance;
let _globalTestServerStatus: "fresh" | "in-creation" | "up-and-running" = "fresh";

function isUpAndRunning() {
  return _globalTestServerStatus === "up-and-running";
}

export async function testServerInstance(): Promise<TestServerInstance> {
  if (isUpAndRunning()) {
    return _globalTestServerInstance;
  }

  if (_globalTestServerStatus === "fresh") {
    _globalTestServerStatus = "in-creation";

    const options = defaultServerOptions();
    options.ephemeral = true;
    options.port = 11321;
    options.initialAdminPassword = secureRandomId();

    await createServer(options);

    _globalTestServerInstance = {
      url: `http://127.0.0.1:${options.port}`,
      adminPassword: options.initialAdminPassword,
    };

    _globalTestServerStatus = "up-and-running";

    return _globalTestServerInstance;
  } else {
    while (!isUpAndRunning()) {
      console.log("wait");
      await sleepMs(50);
    }
    return _globalTestServerInstance;
  }
}
