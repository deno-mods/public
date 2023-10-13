import * as jose from "https://deno.land/x/jose@v4.15.2/index.ts";
import { JWT, parseJwt, Provider } from "../mod.ts";

export const providers: Record<
  string,
  (options?: Partial<Provider>) => Provider
> = {
  facebook,
  google,
};

export function facebook(options: Partial<Provider> = {}) {
  return createProvider("FACEBOOK", options, {
    auth: "https://www.facebook.com/v18.0/dialog/oauth",
    token: "https://graph.facebook.com/v18.0/oauth/access_token",
    keys: "https://www.facebook.com/.well-known/oauth/openid/jwks/",
  });
}

export function google(options: Partial<Provider> = {}) {
  return createProvider("GOOGLE", options, {
    auth: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    keys: "https://www.googleapis.com/oauth2/v3/certs",
  });
}

function createProvider(prefix: string, options: Partial<Provider>, uris: {
  auth: string;
  token: string;
  keys?: string;
}): Provider {
  const provider = { ...options };
  provider.client_id ??= getFromEnv(prefix, "CLIENT_ID");
  provider.client_secret ??= getFromEnv(prefix, "CLIENT_SECRET");
  provider.authorizationUri ??= uris.auth;
  provider.tokenUri ??= uris.token;
  provider.verifyJWT ??= uris.keys ? verifyJWT(uris.keys) : noVerifyJWT;
  return provider as Provider;
}

function getFromEnv(prefix: string, suffix: string) {
  const key = `${prefix}_${suffix}`;
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing ${key} environment variable`);
  return value;
}

function verifyJWT(keysUri: string) {
  const keys = jose.createRemoteJWKSet(new URL(keysUri));
  return async (raw: string) => {
    const { payload, protectedHeader } = await jose.jwtVerify(raw, keys);
    return { payload, protectedHeader } as JWT;
  };
}

function noVerifyJWT(raw: string) {
  console.warn("No JWT verification configured, using unverifed JWT!");
  return parseJwt(raw);
}

export function readFromEnv() {
  const result: Record<string, Provider> = {};
  for (const [key, value] of Object.entries(providers)) {
    if (idAndSecretExist(key)) {
      result[key] = value();
    }
  }
  return result;
}

function idAndSecretExist(providerId: string) {
  const PREFIX = providerId.toUpperCase();
  const id = Deno.env.get(`${PREFIX}_CLIENT_ID`);
  const secret = Deno.env.get(`${PREFIX}_CLIENT_SECRET`);
  if (id) {
    if (!secret) {
      throw new Error(
        `${PREFIX}_CLIENT_ID exists in environment, but ${PREFIX}_CLIENT_SECRET is missing`,
      );
    }
    return true;
  }
  return false;
}
