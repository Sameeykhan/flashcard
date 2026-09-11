/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        theme: {
          bg: "var(--bg-primary)",
          "bg-secondary": "var(--bg-secondary)",
          card: "var(--bg-card)",
          "card-hover": "var(--bg-card-hover)",
          text: "var(--text-primary)",
          muted: "var(--text-muted)",
          dim: "var(--text-dim)",
          border: "var(--border-color)",
          accent: "var(--accent)",
          "accent-hover": "var(--accent-hover)",
          correct: "var(--color-correct)",
          wrong: "var(--color-wrong)",
          warning: "var(--color-warning)",
        }
      },
      boxShadow: {
        "3d": "0 20px 35px -10px rgba(0, 0, 0, 0.25), 0 10px 15px -5px rgba(0, 0, 0, 0.15)",
        "3d-hover": "0 30px 45px -12px rgba(0, 0, 0, 0.35), 0 15px 20px -8px rgba(0, 0, 0, 0.2)",
        "glow": "0 0 25px var(--accent-glow)",
        "glow-sm": "0 0 12px var(--accent-glow)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 4s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        }
      }
    },
  },
  plugins: [],
}
