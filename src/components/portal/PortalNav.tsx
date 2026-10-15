"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PortalIcon } from "./PortalIcon";

export type PortalNavItem = { section: string; label: string };

/**
 * The portal's sections: a list down the side on wide screens, a row the
 * thumb can swipe on a phone. The chosen case travels with every link.
 */
export function PortalNav({ locale, items, label }: { locale: string; items: PortalNavItem[]; label: string }) {
  const pathname = usePathname();
  const caseParam = useSearchParams().get("case");
  const base = `/${locale}/portal/patient`;

  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-2 lg:flex-col lg:gap-1">
        {items.map((item) => {
          const href = item.section === "overview" ? base : `${base}/${item.section}`;
          const active = item.section === "overview" ? pathname === base : pathname.startsWith(href);
          return (
            <li key={item.section} className="shrink-0">
              <Link
                href={caseParam ? `${href}?case=${encodeURIComponent(caseParam)}` : href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-full px-4 text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:rounded-xl ${
                  active ? "bg-violet text-white" : "bg-white/70 text-navy hover:bg-white lg:bg-transparent lg:hover:bg-white/80"
                }`}
              >
                <PortalIcon name={item.section} className="h-5 w-5 flex-none" />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
