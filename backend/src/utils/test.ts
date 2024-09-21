import { secureRandomId } from "../dannso/crypto/random";
import { createServer, defaultServerOptions } from "../server";
import { sleepMs } from "../dannso/utils/sleep";
import { expect } from "vitest";

type FetchFn = (input: string | URL | globalThis.Request, init?: RequestInit) => Promise<Response>

function expectCommonHeaders(fetchFn: FetchFn): FetchFn {
  return async function headerCheckingFetch(input, init?): Promise<Response> {
    const res = await fetchFn(input, init)

    const openRequiredHeaders = {
      'content-security-policy': "default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests",
      'cross-origin-opener-policy': 'same-origin',
      'cross-origin-resource-policy': 'same-origin',
      'origin-agent-cluster': '?1',
      'referrer-policy': 'no-referrer',
      'strict-transport-security': 'max-age=15552000; includeSubDomains',
      'x-content-type-options': 'nosniff',
      'x-dns-prefetch-control': 'off',
      'x-download-options': 'noopen',
      'x-frame-options': 'SAMEORIGIN',
      'x-permitted-cross-domain-policies': 'none',
      'x-xss-protection': '0',
      'x-robots-tag': 'noindex,nofollow',
      'connection': 'keep-alive',
      'keep-alive': 'timeout=5'
    }

    const uncheckedToleratedHeader = new Set(['date', 'content-type', 'content-length', 'etag'])

    res.headers.forEach((v, k) => {
      if (openRequiredHeaders[k]) {
        expect(v, `expected server response header '${k}' to be: ${openRequiredHeaders[k]}`).toBe(openRequiredHeaders[k])
        delete openRequiredHeaders[k]
      } else {
        if (!uncheckedToleratedHeader.has(k)) {
          throw new Error(`unknown header in headerCheckingFetch: ${k}`)
        }
      }
    })

    Object.keys(openRequiredHeaders).forEach(k => {
      throw new Error(`expected header to be present but it wasn't in server response: ${k}`)
    })
    return res;
  }
}

function prependURL(fetchFn: FetchFn, prepend: string) {
  return function fetchWithPrependURL(input, init?) {
    return fetchFn(`${prepend}${input}`, init)
  }

}

export interface TestServerInstance {
  readonly url: string;
  readonly adminPassword: string;

  readonly fetch: FetchFn
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

    const url = `http://127.0.0.1:${options.port}`
    _globalTestServerInstance = {
      url,
      adminPassword: options.initialAdminPassword,
      fetch: prependURL(expectCommonHeaders(fetch), url)
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
