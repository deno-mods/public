import { assertEquals } from "https://deno.land/std@0.203.0/assert/mod.ts";
import { MapStore } from "./map_store.ts";

// Tests for MapStore class.
const UNIT = "[stores/map_store] ";

Deno.test(UNIT + "set", async () => {
  const store = new MapStore<string>();
  await store.set("test", "value");
  assertEquals(store.get("test"), "value");
});

Deno.test(UNIT + "delete", async () => {
  const store = new MapStore<string>();
  await store.set("test", "value");
  await store.delete("test");
  assertEquals(store.get("test"), undefined);
});

Deno.test(UNIT + "expire", async () => {
  const store = new MapStore<string>();
  await store.set("test", "value", 1);
  assertEquals(store.get("test"), "value");
  await new Promise((resolve) => setTimeout(resolve, 10));
  assertEquals(store.get("test"), undefined);
});
