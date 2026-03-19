import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        ring: "var(--ring)",
        primary: {
          DEFAULT: "#1c1917",
          50: "#faf9f7",
          100: "#f5f3f0",
          200: "#e8e4df",
          300: "#d6d3d1",
          400: "#a8a29e",
          500: "#78716c",
          600: "#57534e",
          700: "#44403c",
          800: "#292524",
          900: "#1c1917",
        },
        accent: {
          DEFAULT: "#5b7f7b",
          50: "#f0f5f4",
          100: "#d9e6e4",
          200: "#b3ccc9",
          300: "#8db3ae",
          400: "#6b9994",
          500: "#5b7f7b",
          600: "#4a6663",
          700: "#3a4f4d",
          800: "#2a3937",
          900: "#1a2322",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
