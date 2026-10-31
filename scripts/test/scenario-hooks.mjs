/**
 * Module hooks for the assistant scenarios: site modules import as the app
 * does (bare "./x" → "./x.ts"), and the database and request cookies are
 * replaced by in-memory fakes (scripts/test/fakes/), so a scenario never
 * touches real data.
 *
 *   node --conditions=react-server --import ./scripts/test/scenario-hooks.mjs --experimental-strip-types …
 */
import { register } from "node:module";

const fakes = new URL("./fakes/", import.meta.url).href;

register(
  "data:text/javascript," +
    encodeURIComponent(`
      const FAKE_DB = ${JSON.stringify(fakes + "db.mts")};
      const FAKE_HEADERS = ${JSON.stringify(fakes + "next-headers.mts")};
      export async function resolve(specifier, context, next) {
        if (specifier === "next/headers") return { url: FAKE_HEADERS, shortCircuit: true };
        let result;
        try {
          result = await next(specifier, context);
        } catch (error) {
          if (/^\\.{1,2}\\//.test(specifier) && !/\\.[cm]?[jt]sx?$/.test(specifier)) result = await next(specifier + ".ts", context);
          else if (/^next\\/[a-z-]+$/.test(specifier)) result = await next(specifier + ".js", context);
          else throw error;
        }
        if (/\\/src\\/lib\\/db\\.ts$/.test(result.url)) return { url: FAKE_DB, shortCircuit: true };
        return result;
      }
    `),
  import.meta.url,
);
