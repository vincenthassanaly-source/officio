import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Deno runtime (Supabase Edge Functions), pas du Next.js/Node.
    "supabase/functions/**",
    // Skills installés au niveau projet (scripts tiers, dont des fichiers minifiés) :
    // pas du code applicatif, on ne les lint pas.
    ".claude/**",
  ]),
]);

export default eslintConfig;
