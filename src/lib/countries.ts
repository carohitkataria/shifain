import type { Locale } from "./i18n";

export type Country = {
  /** ISO 3166-1 alpha-2, which is also what the geo header gives us. */
  code: string;
  name: string;
  /** International dialling prefix, without the plus. */
  dial: string;
  /** The site language this country reads best in. */
  locale?: Locale;
};

/**
 * Countries patients travel from. The list is generic — no country is
 * preselected — but each carries its dialling code so the phone field can
 * fill itself in once a country is chosen, and the language the site should
 * open in for a visitor browsing from there.
 */
export const COUNTRIES: Country[] = [
  { code: "AF", name: "Afghanistan", dial: "93" },
  { code: "DZ", name: "Algeria", dial: "213" },
  { code: "AO", name: "Angola", dial: "244" },
  { code: "AM", name: "Armenia", dial: "374", locale: "ru" },
  { code: "AZ", name: "Azerbaijan", dial: "994", locale: "ru" },
  { code: "BH", name: "Bahrain", dial: "973" },
  { code: "BD", name: "Bangladesh", dial: "880" },
  { code: "BY", name: "Belarus", dial: "375", locale: "ru" },
  { code: "BJ", name: "Benin", dial: "229" },
  { code: "BT", name: "Bhutan", dial: "975" },
  { code: "BW", name: "Botswana", dial: "267" },
  { code: "BF", name: "Burkina Faso", dial: "226" },
  { code: "BI", name: "Burundi", dial: "257" },
  { code: "CM", name: "Cameroon", dial: "237" },
  { code: "TD", name: "Chad", dial: "235" },
  { code: "KM", name: "Comoros", dial: "269" },
  { code: "CD", name: "Congo (DRC)", dial: "243" },
  { code: "CI", name: "Côte d'Ivoire", dial: "225" },
  { code: "DJ", name: "Djibouti", dial: "253" },
  { code: "EG", name: "Egypt", dial: "20" },
  { code: "ER", name: "Eritrea", dial: "291" },
  { code: "SZ", name: "Eswatini", dial: "268" },
  { code: "ET", name: "Ethiopia", dial: "251" },
  { code: "FJ", name: "Fiji", dial: "679" },
  { code: "GA", name: "Gabon", dial: "241" },
  { code: "GM", name: "Gambia", dial: "220" },
  { code: "GE", name: "Georgia", dial: "995", locale: "ru" },
  { code: "GH", name: "Ghana", dial: "233" },
  { code: "GN", name: "Guinea", dial: "224" },
  { code: "GY", name: "Guyana", dial: "592" },
  { code: "ID", name: "Indonesia", dial: "62" },
  { code: "IQ", name: "Iraq", dial: "964" },
  { code: "JO", name: "Jordan", dial: "962" },
  { code: "KZ", name: "Kazakhstan", dial: "7", locale: "ru" },
  { code: "KE", name: "Kenya", dial: "254" },
  { code: "KW", name: "Kuwait", dial: "965" },
  { code: "KG", name: "Kyrgyzstan", dial: "996", locale: "ru" },
  { code: "LB", name: "Lebanon", dial: "961" },
  { code: "LS", name: "Lesotho", dial: "266" },
  { code: "LR", name: "Liberia", dial: "231" },
  { code: "LY", name: "Libya", dial: "218" },
  { code: "MG", name: "Madagascar", dial: "261" },
  { code: "MW", name: "Malawi", dial: "265" },
  { code: "MY", name: "Malaysia", dial: "60" },
  { code: "MV", name: "Maldives", dial: "960" },
  { code: "ML", name: "Mali", dial: "223" },
  { code: "MR", name: "Mauritania", dial: "222" },
  { code: "MU", name: "Mauritius", dial: "230" },
  { code: "MD", name: "Moldova", dial: "373", locale: "ru" },
  { code: "MN", name: "Mongolia", dial: "976" },
  { code: "MA", name: "Morocco", dial: "212" },
  { code: "MZ", name: "Mozambique", dial: "258" },
  { code: "MM", name: "Myanmar", dial: "95" },
  { code: "NA", name: "Namibia", dial: "264" },
  { code: "NP", name: "Nepal", dial: "977" },
  { code: "NE", name: "Niger", dial: "227" },
  { code: "NG", name: "Nigeria", dial: "234" },
  { code: "OM", name: "Oman", dial: "968" },
  { code: "PK", name: "Pakistan", dial: "92" },
  { code: "PG", name: "Papua New Guinea", dial: "675" },
  { code: "PH", name: "Philippines", dial: "63" },
  { code: "QA", name: "Qatar", dial: "974" },
  { code: "RU", name: "Russia", dial: "7", locale: "ru" },
  { code: "RW", name: "Rwanda", dial: "250" },
  { code: "SA", name: "Saudi Arabia", dial: "966" },
  { code: "SN", name: "Senegal", dial: "221" },
  { code: "SC", name: "Seychelles", dial: "248" },
  { code: "SL", name: "Sierra Leone", dial: "232" },
  { code: "SO", name: "Somalia", dial: "252" },
  { code: "ZA", name: "South Africa", dial: "27" },
  { code: "SS", name: "South Sudan", dial: "211" },
  { code: "LK", name: "Sri Lanka", dial: "94" },
  { code: "SD", name: "Sudan", dial: "249" },
  { code: "SY", name: "Syria", dial: "963" },
  { code: "TJ", name: "Tajikistan", dial: "992", locale: "ru" },
  { code: "TZ", name: "Tanzania", dial: "255" },
  { code: "TH", name: "Thailand", dial: "66" },
  { code: "TG", name: "Togo", dial: "228" },
  { code: "TN", name: "Tunisia", dial: "216" },
  { code: "TM", name: "Turkmenistan", dial: "993", locale: "ru" },
  { code: "UG", name: "Uganda", dial: "256" },
  { code: "UA", name: "Ukraine", dial: "380", locale: "ru" },
  { code: "AE", name: "United Arab Emirates", dial: "971" },
  { code: "UZ", name: "Uzbekistan", dial: "998", locale: "uz" },
  { code: "VN", name: "Vietnam", dial: "84" },
  { code: "YE", name: "Yemen", dial: "967" },
  { code: "ZM", name: "Zambia", dial: "260" },
  { code: "ZW", name: "Zimbabwe", dial: "263" },
];

export const COUNTRY_BY_CODE = new Map(COUNTRIES.map((country) => [country.code, country]));

export const COUNTRY_BY_NAME = new Map(COUNTRIES.map((country) => [country.name, country]));

/** The dialling code to pre-fill once a country is chosen. */
export const DIAL_BY_NAME: Record<string, string> = Object.fromEntries(
  COUNTRIES.map((country) => [country.name, `+${country.dial}`]),
);
