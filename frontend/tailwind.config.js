/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0A0A0A",
        surface: "#111111",
        border: "#1F1F1F",
        primary: "#FF6B00",
        textPrimary: "#EDEDED",
        muted: "#666666",
        success: "#22C55E",
        error: "#EF4444",
      },
      fontFamily: {
        mono: ['"Space Mono"', "monospace"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
      fontSize: {
        hero: ["56px", { lineHeight: "1.1", fontWeight: "700" }],
        section: ["32px", { lineHeight: "1.2", fontWeight: "700" }],
        card: ["20px", { lineHeight: "1.3", fontWeight: "600" }],
        body: ["15px", { lineHeight: "1.6", fontWeight: "400" }],
        caption: ["12px", { lineHeight: "1.4", fontWeight: "500", letterSpacing: "0.1em" }],
      },
      borderRadius: {
        DEFAULT: "6px",
      },
      spacing: {
        grid: "8px",
      },
      boxShadow: {
        glow: "0 0 20px rgba(255, 107, 0, 0.1)",
        "glow-lg": "0 0 40px rgba(255, 107, 0, 0.15)",
      },
      keyframes: {
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        blink: {
          "0%, 50%": { opacity: "1" },
          "51%, 100%": { opacity: "0" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        scanline: "scanline 8s linear infinite",
        blink: "blink 1s step-end infinite",
        "pulse-slow": "pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
