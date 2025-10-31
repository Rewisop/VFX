import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        curio: {
          orange: "#ff7a00",
          peach: "#ffb86b",
        },
      },
      fontFamily: {
        sans: ["'Space Grotesk'", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "orange-nebula": "radial-gradient(circle at 20% 20%, rgba(255,122,0,0.35), transparent 55%), radial-gradient(circle at 80% 80%, rgba(255,184,107,0.25), transparent 50%)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2.4s linear infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      boxShadow: {
        neon: "0 0 45px rgba(0, 187, 255, 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
