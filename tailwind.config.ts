
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        game: {
          background: "#0B0C10",
          card: "#142836",
          green: "#25d366",
          blue: "#0088cc",
          yellow: "#ffd700",
          red: "#ff3b30",
          cyan: "#0088cc"
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "slide-in": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" }
        },
        "card-distribute": {
          "0%": { transform: "translateY(-100px) rotate(5deg)", opacity: "0" },
          "100%": { transform: "translateY(0) rotate(0deg)", opacity: "1" }
        },
        "card-play": {
          "0%": { transform: "translateY(0) scale(1)" },
          "50%": { transform: "translateY(-20px) scale(1.1)" },
          "100%": { transform: "translateY(0) translateX(0) scale(1)" }
        },
        "shuffle": {
          "0%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(5deg)" },
          "50%": { transform: "rotate(0deg)" },
          "75%": { transform: "rotate(-5deg)" },
          "100%": { transform: "rotate(0deg)" }
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" }
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        "card-distribute": "card-distribute 0.5s ease-out forwards",
        "card-play": "card-play 0.3s ease-out",
        "shuffle": "shuffle 0.5s ease-in-out",
        "float": "float 3s ease-in-out infinite",
      },
      backgroundImage: {
        'gradient-game': 'linear-gradient(180deg, #1a2e3b, #142836)',
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
