import { FreshTokens } from "https://deno.land/x/fresh_openid@$VERSION/mod.ts";
import { Sessions } from "https://deno.land/x/fresh_sessions@$VERSION/mod.ts";
import { SessionContext } from "../../../fresh_sessions/sessions.ts";
import { openid_plugin } from "../fresh.config.ts";
import { User, users } from "./users.ts";

interface Session {
  user?: {
    name: string;
    iss: string;
    sub: string;
  };
  tokens?: FreshTokens;
}

// const kv = await Deno.openKv("sessions.db");
export const sessions = new Sessions<Session>();
export function getUser(ctx: SessionContext): User | undefined {
  return sessions.read(ctx)?.user;
}

openid_plugin.onAuthenticated(async (_req, ctx, tokens) => {
  const session = sessions.read(ctx) || sessions.create(ctx);
  const { iss, sub } = tokens.id_token.payload;
  const user = await users.get(iss!, sub!);
  if (user) {
    session.user = user;
    (tokens.info ??= {}).redirect_uri = "/";
  } else {
    session.tokens = tokens;
    (tokens.info ??= {}).redirect_uri = "/signup";
  }
  sessions.update(ctx, session);
});
