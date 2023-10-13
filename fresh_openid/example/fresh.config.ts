import twind_plugin from "$fresh/plugins/twindv1.ts";
import { defineConfig } from "$fresh/server.ts";
import twindConfig from "./twind.config.ts";
import {
  fresh_openid,
  OpenIDProviders,
} from "https://deno.land/x/fresh_openid@$VERSION/mod.ts";

const providers = OpenIDProviders.readFromEnv();
export const openid_plugin = fresh_openid({ providers });

export default defineConfig({
  plugins: [
    twind_plugin(twindConfig),
    openid_plugin,
  ],
});
