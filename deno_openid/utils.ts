import { encodeBase64 } from "./deps.ts";

/**
 * Create a redirect response.
 *
 * @param url URL or URI string to redirect to.
 * @param permanent Whether to use a permanent redirect (301)
 *   or a temporary (302)
 * @returns Web API Response object.
 */
export function redirect(url: string | URL, permanent = false) {
  return new Response(null, {
    status: permanent ? 301 : 302,
    headers: {
      location: url.toString(),
    },
  });
}

export async function createPKCEChallenge() {
  const randomBytes = getRandomValues(32);
  const code_verifier = encodeUrlSafe(randomBytes);
  const hash = await sha256(code_verifier);
  const code_challenge = encodeUrlSafe(hash);
  return { code_verifier, code_challenge };
}

export function createSearchParams(
  input: Record<string, unknown | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value) {
      if (Array.isArray(value)) {
        params.set(key, value.map((item) => item.toString()).join(" "));
        for (const item of value) {
          params.append(key, item.toString());
        }
      } else {
        params.set(key, value.toString());
      }
    }
  }
  return params;
}

/**
 * Calculates the SHA256 hash of the given string
 */
export async function sha256(str: string): Promise<ArrayBuffer> {
  const bytes = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return hash;
}

/**
 * Encode the data as a URL-safe variant of Base64
 * in accordance with https://www.rfc-editor.org/rfc/rfc7636#appendix-A
 */
export function encodeUrlSafe(data: string | ArrayBuffer): string {
  return encodeBase64(data)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function getRandomValues(length: number) {
  const randomBytes = new Uint8Array(length);
  return crypto.getRandomValues(randomBytes);
}
