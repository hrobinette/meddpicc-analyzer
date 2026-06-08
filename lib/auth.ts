// Shared auth helpers. Uses Web Crypto only, so this works in both the Edge
// middleware and Node route handlers.

export const AUTH_COOKIE = "mp_auth";

// Derive a stable, opaque session token from the password. Storing this (not the
// password itself) in the cookie means the raw password never leaves the server.
export async function authToken(secret: string): Promise<string> {
  const data = new TextEncoder().encode(`meddpicc:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
