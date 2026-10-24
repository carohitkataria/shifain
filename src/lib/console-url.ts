/** The request header the middleware fills with the console page's path and query. */
export const ADMIN_URL_HEADER = "x-shifain-admin-url";

/** Query keys that open a drawer; dropped when the drawer closes. */
export const DRAWER_KEYS = ["d", "ref", "tab", "ch", "c", "done"] as const;

/** The same console page with no drawer open. */
export function withoutDrawer(url: string): string {
  const [path, query = ""] = url.split("?");
  const params = new URLSearchParams(query);
  for (const key of DRAWER_KEYS) params.delete(key);
  const rest = params.toString();
  return rest ? `${path}?${rest}` : path;
}

/** The same console page with a drawer opened on top. */
export function withDrawer(url: string, drawer: Record<string, string | null | undefined>): string {
  const [path, query = ""] = withoutDrawer(url).split("?");
  const params = new URLSearchParams(query);
  for (const [key, value] of Object.entries(drawer)) if (value) params.set(key, value);
  const rest = params.toString();
  return rest ? `${path}?${rest}` : path;
}
