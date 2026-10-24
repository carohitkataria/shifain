import { ConsoleShell } from "../console/ConsoleShell";

/**
 * Every console page sits in the console shell: the section rail, the quick
 * actions and inboxes, search, and the drawers. Pages written before the shell
 * keep calling this with their title and save button, and land in it as they are.
 */
export async function AdminShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  /** The page's primary save button, sat beside the title. */
  action?: React.ReactNode;
  /** Kept for the pages that still pass it; the console is always full width. */
  fullWidth?: boolean;
  children: React.ReactNode;
}) {
  return (
    <ConsoleShell title={title} sub={subtitle} right={action}>
      {children}
    </ConsoleShell>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="mb-6 rounded-lg bg-leaf-tint px-4 py-2.5 text-sm font-bold text-leaf">
      {children}
    </p>
  );
}

/**
 * The page's primary action — the pill beside the page title. It submits a
 * form it is not inside, via the `form` attribute, so the button can sit in
 * the header while the fields live further down the page.
 */
export function SaveButton({ form, children }: { form: string; children: React.ReactNode }) {
  return (
    <button type="submit" form={form} className="btn btn-primary !rounded-full !px-7 shadow-lg shadow-brand/25">
      {children}
    </button>
  );
}
