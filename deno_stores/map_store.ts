import { ArrayKey, SimpleKey, Store } from "./store.ts";

/**
 * Options for map store, mainly menat for testing
 */
interface MapStoreOptions<
  K extends SimpleKey | ArrayKey = SimpleKey,
  V = unknown,
> {
  /**
   * Map to use as storage if you need direct access to it
   */
  map?: Map<string, V>;

  /**
   * Callback when a data is set
   */
  onSet?: (key: K, value: V) => void | Promise<void>;
  onDelete?: (key: K, value: V | undefined) => void | Promise<void>;
}

/**
 * Map store
 *
 * Simple store implementation using a Map as storage
 */
export class MapStore<K extends SimpleKey | ArrayKey = SimpleKey, V = unknown>
  implements Store<K, V> {
  #oldest: Timestamp<K> | undefined;
  #map: Map<string, V>;
  #onSet: undefined | ((key: K, value: V) => void | Promise<void>);
  #onDelete:
    | undefined
    | ((key: K, value: V | undefined) => void | Promise<void>);

  constructor(options: MapStoreOptions<K, V> = {}) {
    const {
      map = new Map<string, V>(),
      onSet,
      onDelete,
    } = options;
    this.#map = map;
    this.#onSet = onSet;
    this.#onDelete = onDelete;
  }

  #checkTimestamp() {
    const now = Date.now();
    while (this.#oldest && this.#oldest.time < now) {
      this.#map.delete(mapKey(this.#oldest.key));
      this.#oldest = this.#oldest.next;
    }
  }

  #addTimestamp(key: K, expireIn: number) {
    const now = Date.now();
    const time = now + expireIn;
    const timestamp: Timestamp<K> = { time, key };
    if (!this.#oldest || this.#oldest.time > time) {
      timestamp.next = this.#oldest;
      this.#oldest = timestamp;
    } else {
      let current = this.#oldest;
      while (current.next && current.next.time < time) {
        current = current.next;
      }
      timestamp.next = current.next;
      current.next = timestamp;
    }
  }

  get(key: K) {
    this.#checkTimestamp();
    return this.#map.get(mapKey(key));
  }

  async set(key: K, value: V, expireIn?: number) {
    this.#checkTimestamp();
    this.#map.set(mapKey(key), value);
    if (expireIn && expireIn > 0) {
      this.#addTimestamp(key, expireIn);
    }
    await this.#onSet?.(key, value);
  }

  async delete(key: K) {
    this.#checkTimestamp();
    const data = this.#map.get(mapKey(key));
    if (data) {
      this.#map.delete(mapKey(key));
    }
    await this.#onDelete?.(key, data);
  }

  isEmpty() {
    return this.#map.size === 0;
  }
}

function mapKey(key: unknown): string {
  return JSON.stringify(key);
}

/**
 * A timestamp linked list
 */
interface Timestamp<K> {
  time: number;
  key: K;
  next?: Timestamp<K>;
}
