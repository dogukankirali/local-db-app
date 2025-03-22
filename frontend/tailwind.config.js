/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-poppins)"],
        poppins: ["var(--font-poppins)"],
        montserrat: ["var(--font-montserrat)"],
      },
      colors: {
        background: "#202125",
        foreground: "#141517",
        foreground_alt: "#313131",
        primary: {
          DEFAULT: "#1578FF",
          text: "#FFFFFF",
          button: "#1578FF",
          button_sub: "#0f4ba0",
          dropdown: "#4E4F56",
        },
        secondary: {
          DEFAULT: "#1CDD7D",
          text: "#757574",
        },
        input: {
          DEFAULT: "#202125",
          border: "#4E4F56",
          text: "#F8FBFD",
        },
        table: {
          header: "#141517",
          row_light: "#333439",
          row_dark: "#2C2D32",
        },
        danger: {
          DEFAULT: "#890020",
          alt: "#FF0000",
        },
        warning: {
          DEFAULT: "#C88900",
          alt: "#D6C20C",
        },
        success: {
          DEFAULT: "#60BB46",
          alt: "#72C25B",
        },
        neutral: {
          0: "#2B2C30",
          5: "#232428",
          10: "#1A1C1D",
          80: "#FFFFFF",
        },
        button: {
          DEFAULT: "#1578FF",
          text: "#121212",
          text_alt: "#FFFFFF",
        },
      },
    },
  },
  plugins: [],
};
