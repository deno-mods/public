import {
  assert,
  assertArrayIncludes,
  assertEquals,
  assertNotEquals,
  assertThrows,
} from "https://deno.land/std@0.203.0/assert/mod.ts";
import { parseJwt, Provider } from "../deno_openid/mod.ts";
import { fresh_openid, Info } from "./main.ts";
import { MapStore } from "https://deno.land/x/deno_stores@$VERSION/mod.ts";

const UNIT = "[fresh_plugin] ";

const mockProvider: Provider = {
  authorizationUri: "https://server.example.com/authorize",
  tokenUri: "https://server.example.com/token",
  client_id: "s6BhdRkqt3",
  client_secret: "topsecret",
  verifyJWT: parseJwt,
};

Deno.test(UNIT + "default paths", () => {
  const plugin = fresh_openid({ providers: { mock: mockProvider } });
  assertNotEquals(plugin.routes, undefined);
  assert(plugin.routes!.every((route) => route.handler !== undefined));
  assertArrayIncludes(
    plugin.routes!.map((route) => route.path),
    ["/openid/signin", "/openid/callback"],
  );
});

Deno.test(UNIT + "path configuration", () => {
  const plugin = fresh_openid({
    providers: { mock: mockProvider },
    paths: {
      prefix: "/prefix",
      callback: "/redirect",
    },
  });
  assertNotEquals(plugin.routes, undefined);
  assert(plugin.routes!.every((route) => route.handler !== undefined));
  assertArrayIncludes(
    plugin.routes!.map((route) => route.path),
    ["/prefix/signin", "/prefix/redirect"],
  );
});

Deno.test(UNIT + "rejects invalid path (missing leading slash)", () => {
  assertThrows(
    () =>
      fresh_openid({
        providers: { mock: mockProvider },
        paths: { signin: "redirect" },
      }),
    Error,
    "Invalid path 'signin' = 'redirect' is not a valid pathname",
  );
});

Deno.test(UNIT + "rejects invalid path (double slash)", () => {
  assertThrows(
    () =>
      fresh_openid({
        providers: { mock: mockProvider },
        paths: { signin: "/redi//rect" },
      }),
    Error,
    "Invalid path 'signin' = '/redi//rect' is not a valid pathname",
  );
});

Deno.test(UNIT + "signin", async () => {
  const map = new Map();
  const plugin = fresh_openid({
    providers: { mock: mockProvider },
    authSessions: new MapStore({ map }),
  });
  const signin = getHandler(plugin, "/openid/signin");
  const redirect = await signin(
    new Request(
      "https://example.com/openid/signin?redirect=/profile",
    ),
    { state: {} },
  );

  assertNotEquals(redirect, undefined);
  assertEquals(map.size, 1);
  const session = map.values().next().value;
  assertEquals(session.provider_id, "mock");
  assertEquals((session.info as Info).redirect_uri, "/profile");
});

Deno.test(UNIT + "callback", async () => {
  const map = new Map();
  let tokenRequest: RequestInfo | URL | undefined;
  const plugin = fresh_openid({
    providers: { mock: mockProvider },
    authSessions: new MapStore({ map }),
    // deno-lint-ignore require-await
    _fetch: async (req) => {
      tokenRequest = req;
      return new Response(
        JSON.stringify({
          access_token: "SlAV32hkKG",
          token_type: "Bearer",
          refresh_token: "8xLOxBtZp8",
          expires_in: 3600,
          id_token:
            "eyJhbGciOiJSUzI1NiIsImtpZCI6IjFlOWdkazcifQ.ewogImlzcyI6ICJodHRwOi8vc2VydmVyLmV4YW1wbGUuY29tIiwKICJzdWIiOiAiMjQ4Mjg5NzYxMDAxIiwKICJhdWQiOiAiczZCaGRSa3F0MyIsCiAibm9uY2UiOiAibi0wUzZfV3pBMk1qIiwKICJleHAiOiAxMzExMjgxOTcwLAogImlhdCI6IDEzMTEyODA5NzAKfQ.ggW8hZ1EuVLuxNuuIJKX_V8a_OMXzR0EHR9R6jgdqrOOF4daGU96Sr_P6qJp6IcmD3HP99Obi1PRs-cwh3LO-p146waJ8IhehcwL7F09JdijmBqkvPeB2T9CJNqeGpe-gccMg4vfKjkM8FcGvnzZUN4_KSP0aAp1tOJ1zZwgjxqGByKHiOtX7TpdQyHE5lcMiKPXfEIQILVq0pc_E2DzL7emopWoaoZTF_m0_N0YzFC6g6EJbOEoRoSK5hoDalrcvRYLSrQAZZKflyuVCyixEoV9GfNQC3_osjzw2PAithfubEEBLuVVk4XUVrWOLrLl0nx7RkKU8NXNHq-rvKMzqg",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
            "Pragma": "no-cache",
          },
        },
      );
    },
  });
  const signin = getHandler(plugin, "/openid/signin");
  await signin(
    new Request(
      "https://example.com/openid/signin?redirect=/profile",
    ),
    { state: {} },
  );
  const state = map.keys().next().value;
  const callback = getHandler(plugin, "/openid/callback");
  const redirect = await callback(
    new Request(
      `https://example.com/openid/callback?state=${state}&code=123`,
    ),
    { state: {} },
  );
  assertEquals(
    (tokenRequest as Request).url,
    mockProvider.tokenUri,
    "Token request sent",
  );
  assertEquals(
    redirect.headers.get("location"),
    "/profile",
    "Redirect to success_uri",
  );
});

function getHandler(
  plugin: ReturnType<typeof fresh_openid>,
  path: string,
): (
  req: Request,
  ctx: { state: Record<string, unknown> },
) => Promise<Response> {
  const handler = plugin.routes?.find((route) => route.path === path)?.handler;
  if (!handler) {
    throw new Error(`No handler found for path '${path}'`);
  }
  return handler as (req: Request) => Promise<Response>;
}
