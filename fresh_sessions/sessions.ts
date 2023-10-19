import { MiddlewareHandlerContext } from "$fresh/server.ts";
import {
  Cookie,
  deleteCookie,
  getCookies,
  setCookie,
} from "https://deno.land/std@0.203.0/http/mod.ts";
import {
  MapStore,
  Store,
} from "https://deno.land/x/deno_stores@$VERSION/mod.ts";

const COOKIE_NAME = "session_id";
const CTX_KEY = "session_id";
const KEY_ROTATION = true;
const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  maxAge: 15 * 60, // max age in seconds = 15 mins
  sameSite: "Lax",
  path: "/",
  // TODO: uncomment for more security
  // secure: true,
  // domain: env.domain,
};

interface CookieOptions extends Partial<Cookie> {
  name?: never;
  value?: never;
}

interface Options<S> {
  store?: Store<string, SessionInfo<S>>;
  cookieOptions?: CookieOptions;
  cookieName?: string;
  ctxKey?: string;
  keyRotation?: boolean;
}

export interface SessionInfo<S> {
  id: string;
  data: Partial<S>;
  state?: "new" | "updated" | "deleted";
}

export class Sessions<S = unknown> {
  readonly #store: Store<string, SessionInfo<S>>;
  readonly #cookieOptions: CookieOptions;
  readonly #cookieName: string;
  readonly #ctxKey: string;
  readonly #keyRotation: boolean;
  /** Time-to-live in milliseconds */
  readonly #expireIn: number;

  constructor(options: Options<S> = {}) {
    this.#store = options.store || new MapStore<string, SessionInfo<S>>();
    this.#cookieOptions = {
      ...COOKIE_OPTIONS,
      ...options.cookieOptions,
    };
    this.#cookieName = options.cookieName || COOKIE_NAME;
    this.#ctxKey = options.ctxKey || CTX_KEY;
    this.#keyRotation = options.keyRotation || KEY_ROTATION;
    this.#expireIn = (this.#cookieOptions.maxAge! + 30) * 1000;
  }

  get handler() {
    return async (
      req: Request,
      ctx: MiddlewareHandlerContext,
    ) => {
      if (ctx.destination !== "route") return await ctx.next();

      const id = getCookies(req.headers)[this.#cookieName];
      if (id) {
        ctx.state[this.#ctxKey] = await this.#store.get(id);
      }

      const response = await ctx.next();

      const info = this.#getSessionInfo(ctx);
      if (info) {
        if (info.state === "deleted") {
          await this.#store.delete(info.id);
          deleteCookie(response.headers, this.#cookieName);
        } else {
          // Key rotation
          if (this.#keyRotation) {
            this.#store.delete(info.id);
            info.id = crypto.randomUUID();
            info.state = "new";
          }
          if (info.state === "new" || info.state === "updated") {
            info.state = undefined;
            await this.#store.set(info.id, info, this.#expireIn);
          }
          setCookie(response.headers, {
            ...this.#cookieOptions,
            name: this.#cookieName,
            value: info.id,
          });
        }
      }

      return response;
    };
  }

  get read() {
    return (ctx: SessionContext, create = false) => {
      let info = this.#getSessionInfo(ctx);
      if (!info && create) {
        info = {
          id: crypto.randomUUID(),
          state: "new",
          data: {},
        };
        (ctx.state ??= {})[this.#ctxKey] = info;
      }
      return info?.data;
    };
  }

  get update() {
    return (ctx: SessionContext, data: S) => {
      const info = this.#getSessionInfo(ctx);
      if (info) {
        info.data = data;
        info.state = "updated";
      }
    };
  }

  get delete() {
    return (ctx: SessionContext) => {
      const info = this.#getSessionInfo(ctx);
      if (info) {
        info.state = "deleted";
      }
    };
  }

  #getSessionInfo(ctx: SessionContext) {
    if (ctx?.state) {
      return ctx.state[this.#ctxKey] as SessionInfo<S> | undefined;
    }
    return undefined;
  }
}

export interface SessionContext {
  state: Record<string, unknown>;
}
