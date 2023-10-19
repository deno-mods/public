/// <reference lib="deno.unstable" />
import { ArrayKey, SimpleKey, Store } from "./store.ts";

interface KVStoreOptions {
  kv: Deno.Kv;
  prefix?: string;
}

export class KVStore<K extends SimpleKey | ArrayKey = SimpleKey, V = unknown>
  implements Store<K, V> {
  #kv: Deno.Kv;
  #prefix: string;

  constructor(options: KVStoreOptions) {
    const {
      kv,
      prefix = "kv_store",
    } = options;
    this.#kv = kv;
    this.#prefix = prefix;
  }

  async get(key: K) {
    const arrayKey = Array.isArray(key) ? key : [key];
    return (await this.#kv.get([this.#prefix, ...arrayKey])).value as V ||
      undefined;
  }

  async set(key: K, value: V, expireIn?: number | undefined) {
    const arrayKey = Array.isArray(key) ? key : [key];
    await this.#kv.set([this.#prefix, ...arrayKey], value, { expireIn });
  }

  async delete(key: K) {
    const arrayKey = Array.isArray(key) ? key : [key];
    await this.#kv.delete([this.#prefix, ...arrayKey]);
  }

  async isEmpty() {
    const list = this.#kv.list({ prefix: [this.#prefix] }, { limit: 1 });
    for await (const _ of list) {
      return false;
    }
    return true;
  }
}
