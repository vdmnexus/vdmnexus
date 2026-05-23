import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#080810",
        surface: "#0e0e18",
        border: "#1e1e2e",
        text: {
          DEFAULT: "#f1f5f9",
          muted: "#94a3b8",
        },
        accent: {
          indigo: "#6366f1",
          blue: "#3b82f6",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "grid-pulse": {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.55" },
        },
        "soft-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
      },
      animation: {
        "fade-up": "fade-up 600ms ease-out both",
        "grid-pulse": "grid-pulse 8s ease-in-out infinite",
        "soft-pulse": "soft-pulse 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
