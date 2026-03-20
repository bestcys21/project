import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Pretendard", "system-ui", "sans-serif"],
      },
      colors: {
        toss: {
          blue:     "var(--toss-blue)",
          blueDark: "var(--toss-blue-dark)",
          bg:       "var(--toss-bg)",
          card:     "var(--toss-card)",
          label:    "var(--toss-label)",
          border:   "var(--toss-border)",
          text:     "var(--toss-text)",
          sub:      "var(--toss-sub)",
        },
      },
      boxShadow: {
        card:       "0 2px 12px 0 rgba(0,0,0,0.06)",
        "card-hover": "0 4px 20px 0 rgba(0,0,0,0.10)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
