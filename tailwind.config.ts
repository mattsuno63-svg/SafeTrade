import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
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
        // Design System da Stitch
        primary: {
          DEFAULT: "#FF6B35",
          light: "#fa6c38",
          dark: "#e55a2b",
          50: "#fff5f2",
          100: "#ffe5dc",
          500: "#FF6B35",
          600: "#e55a2b",
          700: "#cc4d24",
        },
        "background-light": "#FDFDFE",
        "background-dark": "#0A0A0B",
        "glass-light": "rgba(255, 255, 255, 0.55)",
        "glass-dark": "rgba(20, 20, 22, 0.45)",
        "text-primary": "#1d110c",
        // Shadcn colors (mantenuti per compatibilità)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        DEFAULT: "12px",
        lg: "1rem",
        xl: "1.5rem",
        "2xl": "16px",
        "3xl": "24px",
        "4xl": "40px",
        full: "9999px",
        // Shadcn
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        display: ["Plus Jakarta Sans", "sans-serif"],
        sans: ["Inter", "sans-serif"],
      },
      boxShadow: {
        'liquid': '0 20px 50px rgba(255, 107, 53, 0.12)',
        'liquid-hover': '0 40px 80px rgba(255, 107, 53, 0.18)',
        'holo-cyan': '0 20px 40px rgba(34, 211, 238, 0.2)',
        'holo-purple': '0 20px 40px rgba(168, 85, 247, 0.2)',
        'holo-gold': '0 20px 40px rgba(251, 191, 36, 0.2)',
        'glow-orange': '0 0 60px rgba(255, 107, 53, 0.3)',
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
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config

