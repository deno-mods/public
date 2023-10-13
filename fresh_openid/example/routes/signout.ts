import { Handlers } from "$fresh/server.ts";
import { sessions } from "../lib/sessions.ts";

export const handler: Handlers = {
  GET(_req, ctx) {
    sessions.delete(ctx);
    return new Response(null, {
      status: 303, // See Other
      headers: {
        location: "/",
      },
    });
  },
};
