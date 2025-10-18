/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular"],
      },
      colors: {
        bg: "#0B1221",
        surface: "#0F1724",
        primary: "#00B2A9",
        accent: "#C7FF7F",
        muted: "#94A3B8",
        text: "#E6EEF6",
        danger: "#FF6B6B",
      },
      boxShadow: {
        glow: "0 0 20px rgba(0,178,169,0.35)",
        glass: "0 8px 40px rgba(0,0,0,0.35)",
      },
      borderRadius: {
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};





