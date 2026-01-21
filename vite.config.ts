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
const isProduction = process.env.BUILD_MODE === 'production'

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
    minify: isProduction ? 'terser' : false,
    terserOptions: isProduction ? {
      compress: {
        drop_console: true,      // 移除 console.log
        drop_debugger: true,     // 移除 debugger
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      mangle: {
        properties: {
          regex: /^_/,           // 混淆以 _ 开头的私有属性
        },
      },
      format: {
        comments: false,         // 移除所有注释
      },
    } : undefined,
    sourcemap: !isProduction,    // 生产模式不生成 sourcemap
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
