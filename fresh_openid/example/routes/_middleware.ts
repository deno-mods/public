import { MiddlewareHandler } from "$fresh/server.ts";
import { sessions } from "../lib/sessions.ts";

export const handler: MiddlewareHandler[] = [
  sessions.handler,
];
