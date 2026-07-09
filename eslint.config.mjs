// eslint.config.mjs
//
// ESLint 9 requires flat config. eslint-config-next still ships as a
// legacy shareable config, so FlatCompat bridges it into flat-config
// form — this is the standard Next.js 15 setup.
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: ["prisma/dev.db", ".next/**", "node_modules/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
