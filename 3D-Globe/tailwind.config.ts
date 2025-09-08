import type { Config } from "tailwindcss";

export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./__tests__/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          500: "#5b8cff",
          600: "#3f6cf5",
          700: "#3458c9"
        }
      },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(0,0,0,.35)"
      }
    }
  },
  plugins: []
} satisfies Config;
