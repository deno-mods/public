export const db = await Deno.openKv(Deno.env.get("DB_PATH"));
