import {
  MapStore,
  Store,
} from "https://deno.land/x/deno_stores@$VERSION/mod.ts";
import { JWT } from "./jwt.ts";
import {
  FullOptions,
  GlobalOptions,
  PerCallOptions,
  ProviderOptions,
} from "./options.ts";
import { Provider } from "./provider.ts";
import { createPKCEChallenge, createSearchParams, redirect } from "./utils.ts";

export interface OpenIDOptions<I, P extends string> {
  providers: Record<P, Provider>;
  sessions?: Store<string, FlowSession<I, P>>;
  globalOptions?: GlobalOptions;
  /**
   * Only meant for dependency injection while testing.
   */
  _fetch?: typeof fetch;
}
/**
 * Class implementing the client-side of the OpenID Authorization Code Flow
 * according to
 * https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth.
 *
 * The Authorization Code Flow is divided into two phase with the following
 * steps:
 *
 * 1. Authenticate
 *   - Client prepares an Authentication Request containing the desired request
 *     parameters.
 *   - Client sends the request to the Authorization Server.
 *   - Authorization Server Authenticates the End-User.
 *   - Authorization Server obtains End-User Consent/Authorization.
 *   - Authorization Server sends the End-User back to the Client with an
 *     Authorization Code.
 * 2. Code Exchange
 *   - Client requests a response using the Authorization Code at the Token
 *     Endpoint.
 *   - Client receives a response that contains an ID Token and Access Token in
 *     the response body.
 *   - Client validates the ID token and retrieves the End-User's Subject
 *     Identifier.
 *
 * This implementation provides a method for each phase.
 */
export class OpenID<I = unknown, P extends string = string> {
  #sessions: Store<string, FlowSession<I, P>>;
  #providers: Record<P, Provider>;
  #globalOptions?: GlobalOptions;
  #fetch: typeof fetch;

  constructor(options: OpenIDOptions<I, P>) {
    const {
      providers,
      globalOptions,
      sessions = new MapStore(),
      _fetch = fetch,
    } = options;
    this.#providers = providers;
    this.#globalOptions = globalOptions;
    this.#sessions = sessions;
    this.#fetch = _fetch;

    this.#validateConfiguration();
  }

  #validateConfiguration() {
    if (Object.keys(this.#providers).length === 0) {
      throw new Error("No OpenID providers configured");
    }
    for (const key of Object.keys(this.#providers)) {
      const provider = this.#providers[key as P];
      if (!provider.authorizationUri) {
        throw new Error(
          `OpenID provider ${key} is missing authorizationEndpointUri`,
        );
      }
    }
  }

  async authenticate(
    provider_id: P,
    perCallOptions: PerCallOptions = {},
    info?: I,
  ) {
    const provider = this.#providers[provider_id];
    if (!provider) {
      throw new Error(`No OpenID client configured for ID '${provider_id}'.
Known client IDs are ${Object.keys(this.#providers).join(", ")}.`);
    }
    const options = mergeOptions(
      this.#globalOptions,
      provider.options,
      perCallOptions,
    );

    const { code_verifier, code_challenge } = await createPKCEChallenge();
    /**
     * Opaque value used to maintain state between the request and the
     * callback.
     */
    const state = crypto.randomUUID();
    const params = createSearchParams(
      {
        ...options,
        client_id: provider.client_id,
        response_type: "code",
        code_challenge_method: "S256",
        code_challenge,
        state,
      },
    );
    const uri = new URL(`?${params}`, provider.authorizationUri);

    await this.#sessions.set(state, {
      provider_id,
      code_verifier,
      redirect_uri: options.redirect_uri,
      info,
    });
    return redirect(uri);
  }

  async codeExchange(
    state: string | undefined,
    code: string | undefined,
  ): Promise<Tokens<I>> {
    const session = state ? await this.#sessions.get(state) : undefined;
    if (!session) {
      throw new Error("No OpenID session found.");
    }
    if (!code) {
      throw new Error("No authorization code provided.");
    }
    await this.#sessions.delete(state!);
    const { provider_id, code_verifier, redirect_uri } = session;
    const provider = this.#providers[provider_id];
    const { client_id, client_secret, tokenUri } = provider;
    const url = new URL(tokenUri);
    const headers = new Headers({
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    });
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier,
      redirect_uri,
    });
    if (client_secret) {
      headers.set(
        "Authorization",
        `Basic ${btoa([client_id, client_secret].join(":"))}`,
      );
    } else {
      // Only for public servers that do not require client authentication
      body.set("client_id", client_id);
    }

    const request = new Request(url.toString(), {
      method: "POST",
      headers,
      body: body.toString(),
    });
    const { id_token, ...tokens } = await this.#fetchTokens(request);
    const verified = await provider.verifyJWT(id_token);
    // TODO: Validate header and other claims...
    return {
      ...tokens,
      id_token: verified,
      provider_id,
      info: session.info,
    };
  }

  async #fetchTokens(req: Request) {
    const response = await this.#fetch(req);
    if (!response.ok) {
      throw new Error(`Code exchange failed: ${response.statusText}`);
    }
    const body = await response.json();
    return body as TokenResponse;
  }
}

interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  id_token: string;
}

export interface Tokens<I> extends Omit<TokenResponse, "id_token"> {
  id_token: JWT;
  provider_id: string;
  info?: I;
}

interface FlowSession<I = unknown, P extends string = string> {
  provider_id: P;
  code_verifier: string;
  redirect_uri: string;
  info?: I;
}

function mergeOptions(
  global: GlobalOptions | undefined,
  provider: ProviderOptions | undefined,
  perCall: PerCallOptions | undefined,
) {
  const options: Partial<FullOptions> = {};
  global && Object.assign(options, global);
  provider && Object.assign(options, provider);
  perCall && Object.assign(options, perCall);

  // Make sure we have at least the "openid" scope
  options.scope = normalizeScope(options.scope);
  if (!options.redirect_uri) {
    throw new Error("Missing redirect_uri");
  }
  return options as FullOptions;
}

function normalizeScope(scope: string | string[] | undefined) {
  if (!scope) {
    return "openid";
  }

  let scopes = Array.isArray(scope) ? scope : scope.split(" ");
  scopes = scopes.map((s) => s.trim()).filter((s) => s);
  if (!scopes.includes("openid")) {
    scopes = ["openid", ...scopes];
  }
  return scopes.join(" ");
}
