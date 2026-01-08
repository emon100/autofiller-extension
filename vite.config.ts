import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { writeFileSync, mkdirSync } from 'fs'

function generateSidepanelHtml() {
  return {
    name: 'generate-sidepanel-html',
    writeBundle() {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AutoFiller</title>
  <link rel="stylesheet" href="./assets/style.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./sidepanel.js"></script>
</body>
</html>`
      mkdirSync('dist', { recursive: true })
      writeFileSync('dist/sidepanel.html', html)
    }
  }
}

export default defineConfig({
  plugins: [react(), generateSidepanelHtml()],
  publicDir: 'public',
  server: {
    fs: {
      allow: ['..'],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        content: path.resolve(__dirname, 'src/content/main.ts'),
        background: path.resolve(__dirname, 'src/background/index.ts'),
        sidepanel: path.resolve(__dirname, 'src/sidepanel/main.tsx'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name][extname]',
        format: 'es',
      },
    },
    target: 'esnext',
    minify: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
