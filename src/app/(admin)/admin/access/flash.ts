import "server-only";
import { cookies } from "next/headers";

/**
 * A generated password is shown to the admin exactly once. It travels in a
 * short-lived httpOnly cookie rather than the URL, so it never reaches the
 * browser history, a referrer header or a server access log.
 *
 * Reading is safe during a render; clearing is not — Next.js only allows a
 * cookie to be written from a Server Action or Route Handler. So the page
 * reads it, and the admin clears it with the Done button (or it expires).
 */
export const FLASH_COOKIE = "shifain_partner_secret";
export const FLASH_PATH = "/admin";
export const FLASH_MAX_AGE_SECONDS = 300;

export type GeneratedPassword = { email: string; password: string };

export async function readGeneratedPassword(): Promise<GeneratedPassword | null> {
  const jar = await cookies();
  const raw = jar.get(FLASH_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    return typeof parsed?.email === "string" && typeof parsed?.password === "string" ? parsed : null;
  } catch {
    return null;
  }
}
