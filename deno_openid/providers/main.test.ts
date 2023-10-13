import { assertEquals } from "https://deno.land/std@0.203.0/assert/mod.ts";
import { providers } from "./main.ts";

const UNIT = "[providers] ";

Deno.test(UNIT + "array", () => {
  const keys = Object.keys(providers);
  assertEquals(keys.length, 2);
  assertEquals(keys.join(" "), "facebook google");
});
