/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,jsx,tsx,vue,js,ts}"],
  theme: {
    extend: {
      colors: {
        // Paleta de marca construida a partir de #97bdb4 (salvia)
        salvia: {
          DEFAULT: "#97bdb4",
          50: "#f2f8f6",
          100: "#e2eeeb",
          200: "#c6dcd7",
          300: "#97bdb4",
          400: "#76a79c",
          500: "#578e81",
          600: "#437569",
          700: "#355f55",
          800: "#274941",
          900: "#1c3630",
          950: "#11221e",
        },
      },
    },
  },
  plugins: [],
}
