import { AppShell } from "@/components/patient-app/AppShell";
import { TranslatorApp } from "@/components/patient-app/TranslatorApp";
import { APP } from "@/lib/patient-app-copy";
import { loadApp, type AppProps } from "@/lib/patient-app";
import { PORTAL_LANGUAGES } from "@/lib/patient-portal";
import { t } from "@/lib/localize";
import type { L } from "@/lib/content-types";

export const dynamic = "force-dynamic";

const CARE_ICONS: Record<string, string> = { pain: "alert", water: "food", washroom: "pin", nurse: "bell", medicine: "pill", allergy: "shield", cold: "moon", hungry: "food", family: "phone" };
const DRIVER_ICONS: Record<string, string> = { hospital: "hospital", hotel: "bed", wait: "clock", slow: "car", stop: "x", time: "clock" };
const SHOP_ICONS: Record<string, string> = { price: "wallet", halal: "food", card: "cash", medicine: "pill", water: "food", receipt: "file" };

/** The centre button: both people talk, each hears their own language. */
export default async function TranslatorPage(props: AppProps) {
  const app = await loadApp(props);
  const { locale } = app;
  const account = app.portal.account;
  const mine = account?.locale && PORTAL_LANGUAGES.some((item) => item.code === account.locale) ? account.locale : locale === "en" ? "ru" : locale;
  // Phrases go to the browser in every language they exist in: the patient
  // reads them in the language they speak, whatever the app is set to.
  const care = Object.keys(APP.phrases).map((key) => ({
    key,
    icon: CARE_ICONS[key] ?? "chat",
    short: APP.phraseShort[key as keyof typeof APP.phraseShort] as L,
    text: APP.phrases[key as keyof typeof APP.phrases] as L,
  }));
  const pairs = (source: Record<string, readonly [L, L]>, icons: Record<string, string>) => Object.entries(source).map(([key, [short, text]]) => ({ key, icon: icons[key] ?? "chat", short, text }));

  return (
    <AppShell app={app} section="translate" fill>
      <TranslatorApp
        languages={PORTAL_LANGUAGES}
        defaultMine={mine}
        defaultTheirs={mine === "en" ? "hi" : "en"}
        patientGender={account?.gender ?? null}
        modes={[
          { key: "doctor", label: t(APP.modes.doctor, locale), phrases: care },
          { key: "nurse", label: t(APP.modes.nurse, locale), phrases: care },
          { key: "driver", label: t(APP.modes.driver, locale), phrases: pairs(APP.driverPhrases, DRIVER_ICONS) },
          { key: "shop", label: t(APP.modes.shop, locale), phrases: pairs(APP.shopPhrases, SHOP_ICONS) },
        ]}
        labels={{
          iSpeak: t(APP.iSpeak, locale),
          theySpeak: t(APP.theySpeak, locale),
          swap: "⇄",
          tap: t(APP.tapToSpeak, locale),
          listening: t(APP.listening, locale),
          type: t(APP.typeToTranslate, locale),
          translating: t(APP.translating, locale),
          failed: t(APP.failed, locale),
          quick: t(APP.quickPhrases, locale),
          me: t(APP.me, locale),
          them: t(APP.them, locale),
          clear: t(APP.clear, locale),
          send: t(APP.send, locale),
          readAloud: t(APP.readAloud, locale),
          iAm: t(APP.iAm, locale),
          male: t(APP.male, locale),
          female: t(APP.female, locale),
          ...(Object.fromEntries(Object.entries(APP.tr).map(([key, value]) => [key, t(value, locale)])) as Record<keyof typeof APP.tr, string>),
        }}
      />
    </AppShell>
  );
}
