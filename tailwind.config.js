/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── ธีม "สะอาดตา" (v2) ──────────────────────────────────
        // ชมพูเดิม (#FF6B9D) สว่างและจัดเกินไปเมื่ออยู่บนพื้นขาว
        // ตัวเลข/ป้ายสถานะจึงแย่งความสนใจกันเอง
        // ชุดนี้ลดความสว่างลงแต่คงเป็นชมพูแบรนด์เดิม
        // ชื่อคลาส (brand-50 … brand-900) ไม่เปลี่ยน โค้ดเดิมใช้ได้หมด
        brand: {
          50:  '#FDF2F6',
          100: '#FCE3EC',
          200: '#F8C7D8',
          300: '#F0A0BE',
          400: '#E06894',
          500: '#C9376B',
          600: '#B62F60',
          700: '#A82B57',
          900: '#6E1738',
        },
        surface: '#F6F5F3',
      },
      fontFamily: {
        sans: ['IBM Plex Sans Thai', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
