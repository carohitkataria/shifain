import { GROUPS } from "./admin-groups";

export type NavItem = { href: string; label: string; icon: string };
export type NavGroup = { id: string; heading: string; items: NavItem[] };

/** An icon per homepage group, so the sidebar reads at a glance. */
const GROUP_ICONS: Record<string, string> = {
  brand: "star",
  contact: "chat",
  nav: "text",
  hero: "layout",
  stats: "grid",
  usps: "star",
  journey: "route",
  specialties: "grid",
  aiPlanner: "layout",
  upload: "folder",
  tracker: "route",
  guarantee: "star",
  costs: "grid",
  hospitals: "grid",
  doctors: "people",
  comparison: "grid",
  services: "star",
  whyIndia: "star",
  partners: "people",
  stories: "chat",
  faq: "help",
  closing: "layout",
  footer: "text",
};

/**
 * The console's sidebar, grouped the way the business is actually run:
 * the partner relationship, the day's operations, the catalogue behind a
 * plan, the site's own words, and the machinery under all of it.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "partners",
    heading: "Partners & referrals",
    items: [
      { href: "/admin/partners/applications", label: "Partner applications", icon: "people" },
      { href: "/admin/partners", label: "Approved partners", icon: "people" },
      { href: "/admin/offers", label: "Referral offers", icon: "star" },
      { href: "/admin/payouts", label: "Commissions & payouts", icon: "grid" },
      { href: "/admin/broadcasts", label: "Broadcasts", icon: "chat" },
    ],
  },
  {
    id: "operations",
    heading: "Operations",
    items: [
      { href: "/admin/leads", label: "Leads", icon: "folder" },
      { href: "/admin/referrals", label: "Referrals", icon: "route" },
      { href: "/admin/cases", label: "Inquiries", icon: "folder" },
    ],
  },
  {
    id: "catalogue",
    heading: "Care catalogue",
    items: [
      { href: "/admin/hospitals", label: "Hospitals", icon: "grid" },
      { href: "/admin/doctors", label: "Doctors", icon: "people" },
      { href: "/admin/import", label: "Import a sheet", icon: "folder" },
    ],
  },
  {
    id: "content",
    heading: "Site content",
    items: [
      { href: "/admin", label: "Homepage layout", icon: "layout" },
      ...GROUPS.map((group) => ({
        href: `/admin/${group.key}`,
        label: group.label,
        icon: GROUP_ICONS[group.key] ?? "text",
      })),
    ],
  },
  {
    id: "system",
    heading: "System",
    items: [
      { href: "/admin/access", label: "Partner logins", icon: "people" },
      { href: "/admin/system/database", label: "Database", icon: "grid" },
      { href: "/admin/system/settings", label: "Site settings", icon: "sliders" },
    ],
  },
];
