import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [vue()],
  server: {
    host: '::',
    port: 3002,
    proxy: {
      // 开发环境将 /api 转发到本地 SamWaf 管理端口
      '/api': {
        target: 'http://127.0.0.1:26666',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    cssCodeSplit: false,
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        // 生产环境移除 console/debugger
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // 大依赖单独分包，减小主 chunk 体积并提升缓存命中率
        manualChunks: {
          tdesign: ['tdesign-vue-next', 'tdesign-icons-vue-next'],
          echarts: ['echarts/core', 'echarts/charts', 'echarts/components', 'echarts/renderers', 'echarts-wordcloud'],
          codemirror: ['codemirror', 'vue-codemirror'],
          vendor: ['vue', 'vue-router', 'pinia', 'vue-i18n', 'axios', 'dayjs', 'crypto-js', 'marked', 'dompurify'],
        },
      },
    },
  },
})
