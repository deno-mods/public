import { assertEquals } from "https://deno.land/std@0.203.0/assert/mod.ts";
import { MapStore } from "https://deno.land/x/deno_stores@$VERSION/mod.ts";
import { parseJwt } from "./jwt.ts";
import { OpenID } from "./main.ts";
import { Provider } from "./provider.ts";

const UNIT = "[AuthorizationCodeFlow] ";
const providers: Record<string, Provider> = {
  mock: {
    authorizationUri: "https://openid.dooiy.org/authorize",
    tokenUri: "https://openid.dooiy.org/token",
    client_id: "abc123",
    client_secret: "secret",
    verifyJWT: parseJwt,
    options: {
      redirect_uri: "https://openid.dooiy.org/callback",
    },
  },
};

Deno.test(UNIT + "authenticate", async () => {
  const flow = new OpenID({
    providers,
  });
  const response = await flow.authenticate("mock");
  const url = new URL(response.headers.get("location")!);
  assertEquals(url.hostname, "openid.dooiy.org");
  assertEquals(url.pathname, "/authorize");
  const params = url.searchParams;
  const keys = [...params.keys()];
  keys.sort();
  assertEquals(
    keys.join(),
    "client_id,code_challenge,code_challenge_method,redirect_uri,response_type,scope,state",
    "searchParams keys",
  );
  assertSearchParam(url, "client_id", "abc123");
  assertSearchParam(url, "redirect_uri", "https://openid.dooiy.org/callback");
  assertSearchParam(url, "response_type", "code");
  assertSearchParam(url, "scope", "openid");
});

function assertSearchParam(url: URL, key: string, expected: string) {
  const params = url.searchParams;
  assertEquals(params.get(key), expected, `searchParam 'key'`);
}

Deno.test(UNIT + "codeExchange", async () => {
  let state = "";
  const onSet = (s: string) => {
    state = s;
  };
  const flow = new OpenID<{ key: string }>({
    providers,
    sessions: new MapStore({ onSet }),
    // deno-lint-ignore require-await
    _fetch: async (_req) => {
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
  await flow.authenticate("mock", undefined, { key: "value" });
  const { info } = await flow.codeExchange(state, "theCode");
  // TODO: Check tokens
  assertEquals(info?.key, "value");
});
