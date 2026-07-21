import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#12161C", panel: "#1A2028", line: "#262D37" },
        paper: { DEFAULT: "#EDE7DC", panel: "#E3DCCC", line: "#D2C9B5" },
        brass: { DEFAULT: "#C89B5C", dim: "#8F6E3F" },
        reading: { DEFAULT: "#6FC9B8", dim: "#3F7A70" },
        signal: "#C97B63",
        "ink-text": "#E7E2D6",
        "paper-text": "#1E2126",
        "muted-onink": "#8B9199",
        "muted-onpaper": "#7A7568",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ['"IBM Plex Sans"', "sans-serif"],
        mono: ['"IBM Plex Mono"', "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
