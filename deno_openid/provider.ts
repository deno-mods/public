import { JWT } from "./jwt.ts";
import { ProviderOptions } from "./options.ts";

export interface Provider {
  /** The URI of the authorization server's authorization endpoint. */
  authorizationUri: string;
  tokenUri: string;
  options?: ProviderOptions;

  verifyJWT: (raw: string) => JWT | Promise<JWT>;

  /**
   * OAuth 2.0 Client Identifier valid at the Authorization Server.
   *
   * REQUIRED
   */
  client_id: string;

  /**
   * OAuth 2.0 Client Secret valid at the Authorization Servers token endpoint.
   *
   * OPTIONAL (for public authorization servers)
   */
  client_secret?: string;
}
