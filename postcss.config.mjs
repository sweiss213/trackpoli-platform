// Tailwind CSS v4 is wired as a PostCSS plugin (ADR-0011). Next.js auto-detects this config and runs
// it over src/app/globals.css, which imports Tailwind's theme + utilities layers. No tailwind.config.*
// file is needed in v4: content sources and theme live in globals.css (@source / @theme).
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
