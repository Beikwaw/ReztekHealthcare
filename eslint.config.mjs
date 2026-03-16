import path from "path"
import { fileURLToPath } from "url"
import { FlatCompat } from "@eslint/eslintrc"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const config = [
  {
    ignores: [".next/**", "node_modules/**", "playwright-report/**", "Dr-Mkhonza-WC-main/**"],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      // This repo contains many literal apostrophes/quotes in JSX text.
      // Keep lint useful without blocking builds on copy text.
      "react/no-unescaped-entities": "off",
    },
  },
]

export default config

