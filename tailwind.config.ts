import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // AppOmni-inspired brand palette (navy + bright blue).
        brand: {
          navy: "#0A1E46",
          blue: "#1C6BEB",
          sky: "#4FA0FF",
          dark: "#07142E",
        },
      },
    },
  },
  plugins: [],
};

export default config;
