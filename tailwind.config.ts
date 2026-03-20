import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Pretendard", "system-ui", "sans-serif"],
      },
      colors: {
        toss: {
          blue:     "#3182F6",
          blueDark: "#1B64DA",
          bg:       "#F2F4F6",
          card:     "#FFFFFF",
          label:    "#6B7684",
          border:   "#E5E8EB",
          text:     "#191F28",
          sub:      "#8B95A1",
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
