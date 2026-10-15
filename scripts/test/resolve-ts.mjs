/**
 * Lets the tests import site modules as the app does — "../countries", not
 * "../countries.ts" — by trying the .ts file when a bare path is not found.
 *
 *   node --import ./scripts/test/resolve-ts.mjs --experimental-strip-types …
 */
import { register } from "node:module";

register(
  "data:text/javascript," +
    encodeURIComponent(`
      export async function resolve(specifier, context, next) {
        try {
          return await next(specifier, context);
        } catch (error) {
          if (/^\\.{1,2}\\//.test(specifier) && !/\\.[cm]?[jt]sx?$/.test(specifier)) {
            return next(specifier + ".ts", context);
          }
          throw error;
        }
      }
    `),
  import.meta.url,
);
