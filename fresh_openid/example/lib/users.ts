import {
  KVStore,
  Store,
} from "https://deno.land/x/deno_stores@$VERSION/mod.ts";
import { db } from "./db.ts";

export interface User {
  name: string;
  iss: string;
  sub: string;
}

class Users {
  readonly #store: Store<[string, string], User>;

  constructor(kv: Deno.Kv) {
    this.#store = new KVStore<[string, string], User>({ prefix: "users", kv });
  }

  // deno-lint-ignore require-await
  async get(iss: string, sub: string) {
    return this.#store.get([iss, sub]);
  }

  // deno-lint-ignore require-await
  async set(user: User) {
    const { iss, sub } = user;
    return this.#store.set([iss, sub], user);
  }
}

export const users = new Users(db);
