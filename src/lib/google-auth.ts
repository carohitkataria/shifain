import "server-only";

/**
 * "Continue with Google" — the whole of it. The patient never sets a password
 * or waits for a code; signing in with their Google account is the account.
 *
 * Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, with the deployment's
 *   <origin>/api/auth/google/callback
 * added as an authorised redirect URI in the Google Cloud console. Without the
 * two variables the button is hidden rather than broken.
 */
export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** The redirect URI, built from the host the visitor actually reached us on. */
export function callbackUrl(origin: string): string {
  const base = (process.env.BASE_URL || origin).replace(/\/$/, "");
  return `${base}/api/auth/google/callback`;
}

export function authorizeUrl(state: string, origin: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: callbackUrl(origin),
    response_type: "code",
    scope: "openid email",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchanges the one-time code for the signed-in email. The id_token comes
 * straight from Google's token endpoint over TLS, so its payload is read
 * directly; we only accept a verified address.
 */
export async function emailFromCode(code: string, origin: string): Promise<string | null> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: callbackUrl(origin),
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) {
    console.error("[shifain] google token exchange failed", response.status);
    return null;
  }

  const data = (await response.json()) as { id_token?: string };
  if (!data.id_token) return null;

  const payload = data.id_token.split(".")[1];
  if (!payload) return null;
  let claims: { email?: string; email_verified?: boolean | string };
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  const verified = claims.email_verified === true || claims.email_verified === "true";
  return claims.email && verified ? claims.email.toLowerCase() : null;
}

/** Holds the sign-in nonce and page language between the redirect to Google and the way back. */
export const OAUTH_COOKIE = "shifain_g_oauth";
