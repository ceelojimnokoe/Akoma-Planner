// Tailwind CSS configuration.
// content: tells Tailwind which files to scan for class names so it can
// generate only the CSS actually used (keeps the shipped CSS tiny).
// theme.extend: our brand palette lives here so components reference
// semantic names (e.g. `bg-akoma-gold`) instead of raw hex codes.
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        akoma: {
          // Kente-inspired accents used across the UI: warm gold + deep green,
          // grounded by a near-black ink color for text.
          gold: "#D4A017",
          green: "#0B6E4F",
          terracotta: "#C1502E",
          ink: "#1F1B16",
          cream: "#FBF6EC",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
