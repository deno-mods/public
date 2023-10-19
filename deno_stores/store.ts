/**
 * Store interface
 *
 * @remarks This interface is meant to be used as easy session storage.
 *
 * @typeParam V - Value type
 * @typeParam V - Value type
 */
export interface Store<
  K extends SimpleKey | ArrayKey = SimpleKey,
  V = unknown,
> {
  /**
   * Get data from store
   *
   * @param id Item ID
   * @returns Stored data or undefined if not found
   */
  get(id: K): V | Promise<V | undefined> | undefined;

  /**
   * Store data
   *
   * @param id Item ID
   * @param value Data to store
   * @param expireIn [optional] Time in milliseconds after which the data will be deleted
   */
  set(id: K, value: V, expireIn?: number): void | Promise<void>;

  /**
   * Delete data from store
   *
   * @param id Item ID
   */
  delete(id: K): void | Promise<void>;

  isEmpty(): boolean | Promise<boolean>;
}

export type SimpleKey = Uint8Array | string | number | bigint | boolean;
export type ArrayKey = Array<SimpleKey>;
