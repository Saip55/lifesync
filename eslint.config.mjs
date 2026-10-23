import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

// Server-only modules that must never be bundled into the browser.
const serverOnlyImports = {
  paths: [
    { name: "@google/genai", message: "Gemini runs server-side only. Call /api/* from the client instead." },
    { name: "server-only", message: "Client code cannot import server-only modules." },
  ],
  patterns: [{ group: ["@/lib/server/*", "**/lib/server/*"], message: "lib/server is server-only." }],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Accessibility: the plugin is registered by eslint-config-next; turn on its strict set.
  { rules: jsxA11y.flatConfigs.strict.rules },

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      // Correctness
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: { attributes: false } }],
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/no-unnecessary-condition": "warn",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      eqeqeq: ["error", "always"],
      "no-console": ["error", { allow: ["warn", "error"] }],
      "prefer-const": "error",

      // Security
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
      "react/no-danger": "error",
      "react/jsx-no-target-blank": ["error", { enforceDynamicLinks: "always" }],
      "react/jsx-no-script-url": "error",
    },
  },

  // Client code must not reach server secrets or SDKs.
  {
    files: ["components/**/*.{ts,tsx}", "lib/client/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", serverOnlyImports] },
  },

  // Tests and tooling can relax a few production rules.
  {
    files: ["**/*.test.{ts,tsx}", "e2e/**/*.ts", "test/**/*.{ts,tsx}", "*.config.{ts,mts,mjs}"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "no-console": "off",
    },
  },

  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "playwright-report/**", "test-results/**", "next-env.d.ts"]),
]);

export default eslintConfig;
