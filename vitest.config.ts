import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  define: {
    __DEV_MODE__: JSON.stringify(true),
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['tests/**/*.test.ts'],
    watch: false,  // Don't run in watch mode by default
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
