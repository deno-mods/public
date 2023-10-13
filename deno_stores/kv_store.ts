/// <reference lib="deno.unstable" />
import { Store } from "./store.ts";

interface KVStoreOptions<S> {
  kv: Deno.Kv;
  prefix?: string;
}

export class KVStore<S> implements Store<S> {
  #kv: Deno.Kv;
  #prefix: string;

  constructor(options: KVStoreOptions<S>) {
    const {
      kv,
      prefix = "kv_store",
    } = options;
    this.#kv = kv;
    this.#prefix = prefix;
  }

  async get(id: string) {
    return (await this.#kv.get([this.#prefix, id])).value as S || undefined;
  }

  async set(id: string, session: S, expireIn?: number | undefined) {
    await this.#kv.set([this.#prefix, id], session, { expireIn });
  }

  async delete(id: string) {
    await this.#kv.delete([this.#prefix, id]);
  }
}
