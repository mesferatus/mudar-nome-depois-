/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  test: { include: ["src/**/*.test.ts"] },
  plugins: [react()],
})
