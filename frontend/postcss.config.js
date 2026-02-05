/**
 * PostCSS Configuration
 * 
 * PostCSS processes our CSS. Tailwind and Autoprefixer are PostCSS plugins.
 * - Tailwind: Generates utility classes
 * - Autoprefixer: Adds vendor prefixes (-webkit-, -moz-) for browser compatibility
 */

export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

