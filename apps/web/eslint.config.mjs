import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // These effects load remote data and update state after async boundaries.
      "react-hooks/set-state-in-effect": "off"
    }
  },
  globalIgnores([".next/**", "next-env.d.ts"])
]);
