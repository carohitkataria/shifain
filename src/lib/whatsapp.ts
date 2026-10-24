import "server-only";

/**
 * Sending sign-in codes on WhatsApp, through Meta's WhatsApp Cloud API.
 *
 * It needs a WhatsApp Business account with an approved template in the
 * "Authentication" category (Meta fixes its wording: "<code> is your
 * verification code", with a copy-code button). Set:
 *   WHATSAPP_ACCESS_TOKEN     — a permanent system-user token
 *   WHATSAPP_PHONE_NUMBER_ID  — the sending number's id, from the WhatsApp manager
 *   WHATSAPP_OTP_TEMPLATE     — the template's name (default shifain_login_code)
 *   WHATSAPP_OTP_LANGUAGE     — the language it was approved in (default en)
 */
const GRAPH = "https://graph.facebook.com/v21.0";

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/** Sends the code to an international number (digits only). True once WhatsApp accepted it. */
export async function sendWhatsAppCode(digits: string, code: string): Promise<boolean> {
  if (!isWhatsAppConfigured()) return false;
  const response = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: digits,
      type: "template",
      template: {
        name: process.env.WHATSAPP_OTP_TEMPLATE || "shifain_login_code",
        language: { code: process.env.WHATSAPP_OTP_LANGUAGE || "en" },
        components: [
          { type: "body", parameters: [{ type: "text", text: code }] },
          // Authentication templates carry a copy-code button that needs the code too.
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
        ],
      },
    }),
    signal: AbortSignal.timeout(15_000),
  }).catch((error) => {
    console.error("[shifain] whatsapp send failed", error);
    return null;
  });
  if (!response?.ok) {
    if (response) console.error("[shifain] whatsapp send refused", response.status, (await response.text().catch(() => "")).slice(0, 300));
    return false;
  }
  return true;
}
