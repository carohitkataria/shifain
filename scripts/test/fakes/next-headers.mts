/**
 * next/headers outside a request, for the assistant scenarios: one cookie
 * jar per scenario, so signing in, codes and "fresh" checks behave as they
 * do in the browser. Loaded by scripts/test/scenario-hooks.mjs.
 */
type Cookie = { name: string; value: string };

const jar = new Map<string, string>();

export function resetFakeCookies(initial: Record<string, string> = {}): void {
  jar.clear();
  for (const [name, value] of Object.entries(initial)) jar.set(name, value);
}

export function fakeCookieJar(): Map<string, string> {
  return jar;
}

const store = {
  get: (name: string): Cookie | undefined => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
  getAll: (): Cookie[] => [...jar.entries()].map(([name, value]) => ({ name, value })),
  has: (name: string) => jar.has(name),
  set: (nameOrCookie: string | { name: string; value: string }, value?: string) => {
    if (typeof nameOrCookie === "string") jar.set(nameOrCookie, value ?? "");
    else jar.set(nameOrCookie.name, nameOrCookie.value);
    return store;
  },
  delete: (name: string | { name: string }) => {
    jar.delete(typeof name === "string" ? name : name.name);
    return store;
  },
};

export async function cookies() {
  return store;
}

export async function headers() {
  return new Headers({ "user-agent": "assistant-scenarios", "x-forwarded-for": "127.0.0.1" });
}

export async function draftMode() {
  return { isEnabled: false, enable() {}, disable() {} };
}
