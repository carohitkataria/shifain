import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  // .claude/ holds third-party design skills used by AI coding sessions, not app code.
  { ignores: [".next/**", "node_modules/**", "content/**", ".data/**", "next-env.d.ts", ".claude/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default config;
