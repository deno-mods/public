import { Store } from "./store.ts";

/**
 * Options for map store, mainly menat for testing
 */
interface MapStoreOptions<D> {
  /**
   * Map to use as storage if you need direct access to it
   */
  map?: Map<string, D>;

  /**
   * Callback when a data is set
   */
  onSet?: (id: string, data: D) => void | Promise<void>;
  onDelete?: (id: string, data: D | undefined) => void | Promise<void>;
}

/**
 * Map store
 *
 * Simple store implementation using a Map as storage
 */
export class MapStore<D = unknown> implements Store<D> {
  #oldest: Timestamp | undefined;
  #map: Map<string, D>;
  #onSet: undefined | ((id: string, data: D) => void | Promise<void>);
  #onDelete:
    | undefined
    | ((id: string, data: D | undefined) => void | Promise<void>);

  constructor(options: MapStoreOptions<D> = {}) {
    const {
      map = new Map<string, D>(),
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
      this.#map.delete(this.#oldest.id);
      this.#oldest = this.#oldest.next;
    }
  }

  #addTimestamp(id: string, expireIn: number) {
    const now = Date.now();
    const time = now + expireIn;
    const timestamp: Timestamp = {
      time,
      id,
    };
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

  get(id: string) {
    this.#checkTimestamp();
    return this.#map.get(id);
  }

  async set(id: string, data: D, expireIn?: number) {
    this.#checkTimestamp();
    this.#map.set(id, data);
    if (expireIn && expireIn > 0) {
      this.#addTimestamp(id, expireIn);
    }
    await this.#onSet?.(id, data);
  }

  async delete(id: string) {
    this.#checkTimestamp();
    const data = this.#map.get(id);
    if (data) {
      this.#map.delete(id);
    }
    await this.#onDelete?.(id, data);
  }
}

/**
 * A timestamp linked list
 */
interface Timestamp {
  time: number;
  id: string;
  next?: Timestamp;
}
