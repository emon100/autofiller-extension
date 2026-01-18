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

// Content script 需要单独构建为 IIFE 格式（Chrome content scripts 不支持 ES modules）
const isContentBuild = process.env.BUILD_TARGET === 'content'

export default defineConfig({
  plugins: isContentBuild ? [] : [react(), generateSidepanelHtml()],
  publicDir: isContentBuild ? false : 'public',
  server: {
    fs: {
      allow: ['..'],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: !isContentBuild, // content build 不清空目录
    cssCodeSplit: false,
    rollupOptions: isContentBuild
      ? {
          input: {
            content: path.resolve(__dirname, 'src/content/main.ts'),
          },
          output: {
            entryFileNames: '[name].js',
            format: 'iife', // Content script 必须是 IIFE
            inlineDynamicImports: true,
          },
        }
      : {
          input: {
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
