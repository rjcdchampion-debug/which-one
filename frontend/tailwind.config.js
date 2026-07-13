/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:    '#534AB7',
        coral:      '#993C1D',
        'accent-blue': '#185FA5',
        success:    '#0F6E56',
        surface:    '#F5F5F5',
        'border-default': '#E5E5E5',
        'text-primary':   '#1A1A1A',
        'text-secondary': '#6B6B6B',
      },
      borderRadius: {
        card: '12px',
        btn:  '8px',
      },
      maxWidth: {
        app: '430px',
        'app-desktop': '1240px',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
     