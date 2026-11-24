/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Na publicação pelo GitHub Pages o app fica em /<nome-do-repo>/
export default defineConfig({
  base: process.env.PAGES_BASE ?? '/',
  test: { include: ["src/**/*.test.ts"] },
  plugins: [react()],
})
