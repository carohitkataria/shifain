import "server-only";

/**
 * Sending email, or honestly reporting that we cannot.
 *
 * Resend is used when RESEND_API_KEY is set — one HTTPS call, no SMTP library
 * and no connection pool to babysit. With no key configured `send` returns
 * false rather than throwing, and the caller tells the patient to ask their
 * coordinator instead. Pretending a mail was sent is the one outcome worth
 * avoiding: someone would sit waiting for it.
 */
export function isMailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export async function send(to: string, subject: string, text: string): Promise<boolean> {
  if (!isMailConfigured()) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to, subject, text }),
    });
    if (!response.ok) {
      console.error("[shifain] mail rejected", response.status, await response.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (error) {
    console.error("[shifain] could not send mail", error);
    return false;
  }
}

/**
 * Tells the operations inbox that something arrived, and nothing more.
 *
 * Deliberately free of clinical detail: email is not a secure channel, and a
 * subject line naming somebody's condition leaks it to every relay and every
 * phone the inbox is open on. The notice carries a reference and a link; what
 * the patient actually said stays behind the console's login.
 *
 * Never throws and never blocks: an unreachable mail provider must not cost a
 * patient their case.
 */
export async function notifyOps(
  opsEmail: string | null,
  subject: string,
  lines: string[],
): Promise<void> {
  if (!opsEmail) return;
  await send(opsEmail, subject, lines.join("\n")).catch(() => false);
}
