import "server-only";
import { TELEGRAM_FIRST } from "./journey-rules";

/**
 * Region-based communication channel selection.
 *
 * Telegram is dominant in CIS/Central Asia, WhatsApp in South Asia/Africa/
 * Middle East, and SMS is the fallback where neither is popular. A patient's
 * country (from their phone prefix or the country they chose) decides which
 * channel to try first. The coordinator can always override.
 */

export type Channel = "telegram" | "whatsapp" | "sms";

const TELEGRAM_COUNTRIES = TELEGRAM_FIRST;

const SMS_COUNTRIES = new Set([
  "US", "CA", "AU", "JP", "KR", "CN",
]);

export function preferredChannel(countryCode: string): Channel {
  const code = countryCode.toUpperCase();
  if (TELEGRAM_COUNTRIES.has(code)) return "telegram";
  if (SMS_COUNTRIES.has(code)) return "sms";
  return "whatsapp";
}

export function channelLabel(channel: Channel): string {
  switch (channel) {
    case "telegram": return "Telegram";
    case "whatsapp": return "WhatsApp";
    case "sms": return "SMS";
  }
}

export const ALL_CHANNELS: Channel[] = ["telegram", "whatsapp", "sms"];
