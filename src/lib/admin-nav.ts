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
 * The console's sidebar. Grouped rather than one long list, because the panel
 * is where the business runs the site and more areas land here over time.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    heading: "Overview",
    items: [{ href: "/admin", label: "Homepage layout", icon: "layout" }],
  },
  {
    id: "content",
    heading: "Site content",
    items: GROUPS.map((group) => ({
      href: `/admin/${group.key}`,
      label: group.label,
      icon: GROUP_ICONS[group.key] ?? "text",
    })),
  },
  {
    id: "catalogue",
    heading: "Catalogue",
    items: [
      { href: "/admin/hospitals", label: "Hospitals", icon: "grid" },
      { href: "/admin/doctors", label: "Doctors", icon: "people" },
    ],
  },
  {
    id: "operations",
    heading: "Patients & partners",
    items: [
      { href: "/admin/cases", label: "Patient cases", icon: "folder" },
      { href: "/admin/access", label: "Partner logins", icon: "people" },
    ],
  },
];
