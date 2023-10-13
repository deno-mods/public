/**
 * Store interface
 *
 * @remarks This interface is meant to be used as easy session storage.
 *
 * @typeParam D - Stored data type
 */
export interface Store<D = unknown> {
  /**
   * Get data from store
   *
   * @param id Item ID
   * @returns Stored data or undefined if not found
   */
  get(id: string): D | Promise<D | undefined> | undefined;

  /**
   * Store data
   *
   * @param id Item ID
   * @param data Data to store
   * @param expireIn [optional] Time in milliseconds after which the data will be deleted
   */
  set(id: string, data: D, expireIn?: number): void | Promise<void>;

  /**
   * Delete data from store
   *
   * @param id Item ID
   */
  delete(id: string): void | Promise<void>;
}
