module.exports = {
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    colors: {
      blue: "#000048",
      "text-gray-900": "#000048",
      "text-gray-500": "#53565A",
      "text-green-900": "#2DB81F",
      "text-red-700": "#B81F2D",
    },
    extend: {
      // See: https://github.com/tailwindlabs/tailwindcss-typography/issues/18
      typography: {
        DEFAULT: {
          css: {
            'code::before': {
              content: '""'
            },
            'code::after': {
              content: '""'
            }
          }
        }
      },
    },
  },
  variants: {
  },
  plugins: [
    require('@tailwindcss/typography')
  ],
};
