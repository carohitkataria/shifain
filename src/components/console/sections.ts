import { GROUPS } from "@/lib/admin-groups";

/**
 * The console's nine sections and the pages each one holds. Every page the
 * console had before still lives somewhere here — as a section, or a tab in
 * one — so nothing it could do was lost when the menu got shorter.
 */
export type SectionId = "home" | "cases" | "care" | "catalogue" | "partners" | "providers" | "website" | "reports" | "settings";

export type Section = {
  id: SectionId;
  label: string;
  icon: string;
  href: string;
  match: (path: string) => boolean;
  tabs?: { label: string; href: string; match?: (path: string) => boolean }[];
};

const starts = (...prefixes: string[]) => (path: string) => prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
const groupPaths = GROUPS.map((group) => `/admin/${group.key}`);

export const SECTIONS: Section[] = [
  { id: "home", label: "Home", icon: "home", href: "/admin", match: (path) => path === "/admin" },
  {
    id: "cases",
    label: "Cases",
    icon: "case",
    href: "/admin/cases",
    match: starts("/admin/cases", "/admin/leads", "/admin/messages"),
    tabs: [
      { label: "Cases", href: "/admin/cases", match: starts("/admin/cases") },
      { label: "Leads", href: "/admin/leads" },
      { label: "Messages", href: "/admin/messages" },
    ],
  },
  { id: "care", label: "Care desk", icon: "calendar", href: "/admin/care", match: starts("/admin/care") },
  {
    id: "catalogue",
    label: "Catalogue",
    icon: "hospital",
    href: "/admin/hospitals",
    match: starts("/admin/hospitals", "/admin/doctors", "/admin/import"),
    tabs: [
      { label: "Hospitals", href: "/admin/hospitals", match: starts("/admin/hospitals") },
      { label: "Doctors", href: "/admin/doctors", match: starts("/admin/doctors") },
      { label: "Import a sheet", href: "/admin/import" },
    ],
  },
  {
    id: "partners",
    label: "Partners",
    icon: "users",
    href: "/admin/partners/applications",
    match: starts("/admin/partners", "/admin/offers", "/admin/payouts", "/admin/broadcasts", "/admin/referrals"),
    tabs: [
      { label: "Applications", href: "/admin/partners/applications" },
      { label: "Partners", href: "/admin/partners", match: (path) => path === "/admin/partners" || (/^\/admin\/partners\/[^/]+$/.test(path) && path !== "/admin/partners/applications") },
      { label: "Referrals", href: "/admin/referrals" },
      { label: "Referral offers", href: "/admin/offers" },
      { label: "Payouts", href: "/admin/payouts" },
      { label: "Broadcasts", href: "/admin/broadcasts" },
    ],
  },
  { id: "providers", label: "Providers", icon: "car", href: "/admin/providers", match: starts("/admin/providers") },
  {
    id: "website",
    label: "Website",
    icon: "layout",
    href: "/admin/website",
    match: (path) => starts("/admin/website", "/admin/faqs")(path) || groupPaths.includes(path),
    tabs: [
      { label: "Homepage", href: "/admin/website", match: (path) => starts("/admin/website")(path) || groupPaths.includes(path) },
      { label: "FAQs", href: "/admin/faqs" },
    ],
  },
  { id: "reports", label: "Reports", icon: "chart", href: "/admin/reports", match: starts("/admin/reports") },
  {
    id: "settings",
    label: "Settings",
    icon: "gear",
    href: "/admin/settings",
    match: starts("/admin/settings", "/admin/system", "/admin/access", "/admin/telegram", "/admin/assistant"),
    tabs: [
      { label: "Overview", href: "/admin/settings" },
      { label: "Team & logins", href: "/admin/access" },
      { label: "Site settings", href: "/admin/system/settings" },
      { label: "Telegram", href: "/admin/telegram" },
      { label: "AI assistant", href: "/admin/assistant" },
      { label: "Database", href: "/admin/system/database" },
    ],
  },
];

export const sectionOf = (path: string): Section => SECTIONS.find((section) => section.match(path)) ?? SECTIONS[0];

export const tabOn = (tab: NonNullable<Section["tabs"]>[number], path: string) => (tab.match ? tab.match(path) : path === tab.href);
