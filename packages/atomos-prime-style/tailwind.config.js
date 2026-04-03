const { colors } = require('./dist/tokens/colors');
const { typography } = require('./dist/tokens/typography');
const { spacing, borderRadius } = require('./dist/tokens/spacing');
const { shadows, animation, transition } = require('./dist/tokens/effects');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    '../web-ui/src/**/*.{js,ts,jsx,tsx}',
    '../web-ui/**/*.html',
    '../atomos-prime/src/**/*.{js,ts,jsx,tsx}',
    '../atomos-structura/src/**/*.{js,ts,jsx,tsx}',
    '../atomos-structura/canvas.html'
  ],
  theme: {
    extend: {
      colors: {
        ...colors,
        // Legacy VBS colors
        vbs: {
          primary: colors.primary,
          secondary: colors.secondary,
          entity: colors.entity
        }
      },
      fontFamily: typography.fontFamily,
      fontSize: typography.fontSize,
      fontWeight: typography.fontWeight,
      letterSpacing: typography.letterSpacing,
      spacing: {
        ...spacing,
        // Legacy VBS spacing
        'entity': '12rem',
        'grid': '1rem'
      },
      borderRadius,
      boxShadow: shadows,
      animation,
      transitionProperty: transition,
      // Legacy border extensions
      borderWidth: {
        '3': '3px',
        '5': '5px'
      }
    }
  },
  plugins: [],
  darkMode: 'class'
};