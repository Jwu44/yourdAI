[ ] With the new home page UI, it's missing some css styling. Update our current css to use the following:
App.css
"#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.react:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);
}

@keyframes logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: no-preference) {
  a:nth-of-type(2) .logo {
    animation: logo-spin infinite 20s linear;
  }
}

.card {
  padding: 2em;
}

.read-the-docs {
  color: #888;
}"

home.css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 240 33% 98%;
    --foreground: 240 10% 15%;

    --card: 0 0% 100%;
    --card-foreground: 240 10% 15%;

    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 15%;

    --primary: 250 80% 75%;
    --primary-foreground: 0 0% 100%;

    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;

    --muted: 240 5% 96%;
    --muted-foreground: 240 5% 40%;

    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;

    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    --border: 240 6% 90%;
    --input: 214.3 31.8% 91.4%;
    --ring: 250 80% 75%;

    --radius: 0.5rem;

    --sidebar-background: 0 0% 98%;
    --sidebar-foreground: 240 5.3% 26.1%;
    --sidebar-primary: 240 5.9% 10%;
    --sidebar-primary-foreground: 0 0% 98%;
    --sidebar-accent: 240 4.8% 95.9%;
    --sidebar-accent-foreground: 240 5.9% 10%;
    --sidebar-border: 220 13% 91%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }

  .dark {
    --background: 240 10% 12%;
    --foreground: 240 5% 98%;

    --card: 240 10% 15%;
    --card-foreground: 0 0% 98%;

    --popover: 240 10% 15%;
    --popover-foreground: 0 0% 98%;

    --primary: 250 80% 75%;
    --primary-foreground: 240 10% 4%;

    --secondary: 240 7% 20%;
    --secondary-foreground: 0 0% 98%;

    --muted: 240 7% 20%;
    --muted-foreground: 240 5% 70%;

    --accent: 240 7% 20%;
    --accent-foreground: 0 0% 98%;

    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;

    --border: 240 7% 25%;
    --input: 240 7% 25%;
    --ring: 250 80% 75%;

    --sidebar-background: 240 10% 15%;
    --sidebar-foreground: 240 4.8% 95.9%;
    --sidebar-primary: 250 80% 75%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 240 7% 20%;
    --sidebar-accent-foreground: 240 4.8% 95.9%;
    --sidebar-border: 240 7% 20%;
    --sidebar-ring: 250 80% 75%;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  html {
    @apply scroll-smooth;
  }

  body {
    @apply bg-background text-foreground font-sans antialiased;
  }

  .glass-panel {
    @apply bg-white/50 dark:bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-glass;
  }

  .glass-panel-dark {
    @apply bg-black/30 backdrop-blur-md rounded-2xl border border-white/10 shadow-glass;
  }

  .neo-blur {
    @apply bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-glass;
  }

  .neo-button {
    @apply shadow-neolight hover:shadow-none transition-all duration-300 ease-in-out bg-white rounded-xl;
  }

  .shimmer {
    @apply bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:500px_100%] animate-shimmer;
  }
  
  .text-balance {
    text-wrap: balance;
  }

  /* Add star background */
  .stars-bg {
    @apply relative;
    background-image: radial-gradient(circle at 20% 50%, rgba(76, 0, 255, 0.15) 0%, rgba(76, 0, 255, 0) 25%), 
                     radial-gradient(circle at 80% 80%, rgba(76, 0, 255, 0.1) 0%, rgba(76, 0, 255, 0) 25%);
  }
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  @apply bg-muted/50 rounded-full dark:bg-white/5;
}

::-webkit-scrollbar-thumb {
  @apply bg-yourdai-purple/40 rounded-full transition-colors hover:bg-yourdai-purple/60;
}

/* Custom animation classes */
.animate-delay-100 {
  animation-delay: 100ms;
}

.animate-delay-200 {
  animation-delay: 200ms;
}

.animate-delay-300 {
  animation-delay: 300ms;
}

.animate-delay-400 {
  animation-delay: 400ms;
}

.animate-delay-500 {
  animation-delay: 500ms;
}

.animate-delay-600 {
  animation-delay: 600ms;
}

.animate-delay-700 {
  animation-delay: 700ms;
}

.animate-delay-1000 {
  animation-delay: 1000ms;
}

/* Fade up animation */
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-up {
  animation: fade-up 0.6s ease-out forwards;
}

tailwind.config.ts
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
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				yourdai: {
          purple: '#9b87f5',
          dark: '#1A1F2C',
          green: '#F2FCE2',
          blue: '#D3E4FD',
          gray: '#8E9196',
          lightgray: '#C8C8C9'
        }
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			fontFamily: {
				sans: ['Inter', 'sans-serif'],
				display: ['SF Pro Display', 'Inter', 'sans-serif']
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'fade-out': {
					'0%': { opacity: '1', transform: 'translateY(0)' },
					'100%': { opacity: '0', transform: 'translateY(10px)' }
				},
				'scale-in': {
					'0%': { transform: 'scale(0.95)', opacity: '0' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},
				'scale-out': {
					from: { transform: 'scale(1)', opacity: '1' },
					to: { transform: 'scale(0.95)', opacity: '0' }
				},
				'slide-in-right': {
					'0%': { transform: 'translateX(100%)' },
					'100%': { transform: 'translateX(0)' }
				},
				'slide-out-right': {
					'0%': { transform: 'translateX(0)' },
					'100%': { transform: 'translateX(100%)' }
				},
				'slide-up': {
					'0%': { transform: 'translateY(20px)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				},
				'slide-down': {
					'0%': { transform: 'translateY(-20px)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				},
				'pulse-slow': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.8' }
				},
				float: {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-10px)' }
				},
				shimmer: {
					'0%': { backgroundPosition: '-500px 0' },
					'100%': { backgroundPosition: '500px 0' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.5s ease-out',
				'fade-out': 'fade-out 0.5s ease-out',
				'scale-in': 'scale-in 0.3s ease-out',
				'scale-out': 'scale-out 0.3s ease-out',
				'slide-in-right': 'slide-in-right 0.3s ease-out',
				'slide-out-right': 'slide-out-right 0.3s ease-out',
				'slide-up': 'slide-up 0.5s ease-out',
				'slide-down': 'slide-down 0.5s ease-out',
				'pulse-slow': 'pulse-slow 4s infinite ease-in-out',
				float: 'float 6s infinite ease-in-out',
				shimmer: 'shimmer 3s infinite linear'
			},
			backdropFilter: {
				'none': 'none',
				'blur': 'blur(20px)'
			},
			boxShadow: {
				'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
				'neolight': '5px 5px 15px #d1d9e6, -5px -5px 15px #ffffff'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;