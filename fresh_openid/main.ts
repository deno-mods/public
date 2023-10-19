import { HandlerContext, type Plugin } from "$fresh/server.ts";
import {
  GlobalOptions,
  OpenID,
  OpenIDOptions,
  Provider,
  Tokens,
} from "https://deno.land/x/deno_openid@$VERSION/mod.ts";

export interface Options<I, P extends string = string> {
  providers: Record<P, Provider>;
  globalOptions?: GlobalOptions;
  paths?: Partial<Paths>;
  getProvider?: GetFromContext | string;
  getRedirect?: GetFromContext | string;
  ctxKey?: string;
  authSessions?: OpenIDOptions<I, P>["sessions"];
  _fetch?: typeof fetch;
}

export interface Paths {
  prefix: string;
  signin: string;
  callback: string;
  signout: string;
}

export type GetFromContext = (
  req: Request,
  ctx: HandlerContext,
) => string | Promise<string>;

export interface Info {
  redirect_uri?: string;
}

export type FreshTokens = Tokens<Info>;

export type OnAuthenticated = (
  req: Request,
  ctx: HandlerContext,
  tokens: FreshTokens,
) => void | undefined | string | Promise<void | undefined | string>;

export function fresh_openid({
  paths = {},
  providers,
  globalOptions,
  authSessions,
  getProvider = "provider",
  getRedirect = "redirect",
  _fetch,
}: Options<Info>): Plugin & {
  onAuthenticated: (listener: OnAuthenticated) => void;
} {
  validatePaths(paths);
  const pathPrefix = paths.prefix || "/openid";
  const signinPath = `${pathPrefix}${paths.signin || "/signin"}`;
  const callbackPath = `${pathPrefix}${paths.callback || "/callback"}`;

  const flow = new OpenID<Info>({
    providers,
    globalOptions,
    sessions: authSessions,
    _fetch,
  });

  const listeners: OnAuthenticated[] = [];

  return {
    name: "deno_openid",
    routes: [
      {
        path: signinPath,
        handler: (() => {
          return async function (req, ctx) {
            let provider: string | undefined;
            if (Object.keys(providers).length > 1) {
              provider = await _get(getProvider, req, ctx);
              if (!provider) {
                const msg = typeof getProvider === "string"
                  ? `No OpenID provider ID found for signin.
You must provide a searchParam or form field named '${getProvider}'. 
Alternatively, you can provide a custom getProvider function that returns a
provider ID for the request context.`
                  : "Your custom getProvider function returned no value for the provider ID.";
                throw new Error(msg);
              }
            } else {
              provider = Object.keys(providers)[0]!;
            }
            const callback_uri = `${new URL(req.url).origin}${callbackPath}`;
            const redirect_uri = await _get(getRedirect, req, ctx) ||
              req.headers.get("referer") || req.referrer || "/";
            return await flow.authenticate(
              provider,
              // redirect_uri transmitted to the OpenID provider for callback
              { redirect_uri: callback_uri },
              // redirect_uri from the request, stored for later use
              { redirect_uri },
            );
          };
        })(),
      },
      {
        path: callbackPath,
        handler: (() => {
          return async function (req, ctx) {
            const state = getSearchParam(req, "state");
            const code = getSearchParam(req, "code");
            const tokens = await flow.codeExchange(state, code);
            let location: void | string | undefined;
            for (const listener of listeners) {
              location = await listener(req, ctx, tokens);
            }
            location ??= tokens.info?.redirect_uri || "/";
            return new Response(null, {
              status: 302,
              headers: { location },
            });
          };
        })(),
      },
    ],
    onAuthenticated: (listener) => listeners.push(listener),
  };
}

/**
 * Regular expression for valid path segments:
 *
 * - ^: Asserts the start of the string.
 * - \/: Matches a single slash at the beginning of the string.
 * - (?!\/): Uses a negative lookahead to ensure that the next
 *   character is not another slash.
 * - [\w\d\-_/]*: Matches one or more alphanumeric characters,
 *   digits, hyphens, or underscores.
 * - [^\/]: Ensures that the string does not end with a slash.
 * - $: Asserts the end of the string.
 */
const VALID_SEGMENT = /[A-Za-z0-9\-_.~]+$/;

/**
 * Validate that the paths are valid.
 * @param paths
 * @throws Error if the paths are invalid
 */
function validatePaths(paths: Record<string, string>) {
  for (const key of Object.keys(paths)) {
    const value = paths[key];
    let first = true;
    for (const segment of value.split("/")) {
      if (
        (first && segment.length !== 0) ||
        (!first && segment.length === 0) ||
        (!first && !VALID_SEGMENT.test(segment))
      ) {
        throw new Error(
          `Invalid path '${key}' = '${value}' is not a valid pathname`,
        );
      }
      first = false;
    }
  }
}

async function _get(
  getter: GetFromContext | string,
  req: Request,
  ctx: HandlerContext,
) {
  if (typeof getter === "string") {
    return getSearchParam(req, getter) || await getFormData(req, getter);
  } else {
    return await getter(req, ctx);
  }
}

function getSearchParam(req: Request, name: string): string | undefined {
  return new URL(req.url).searchParams.get(name) || undefined;
}

async function getFormData(
  req: Request,
  name: string,
): Promise<string | undefined> {
  try {
    const formData = await req.formData();
    return formData.get(name)?.valueOf()?.toString();
  } catch (_e) {
    return undefined;
  }
}
