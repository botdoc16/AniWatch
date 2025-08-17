import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  server: {
    host: "::",
    port: 8080,
    fs: {
      strict: true,
    },
  },
  build: {
    assetsDir: "assets",
    rollupOptions: {
      output: {
        assetFileNames: "assets/[name].[hash].[ext]"
      }
    },
    target: 'esnext',
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
  },
  css: {
    modules: {
      localsConvention: 'camelCase'
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    ViteImageOptimizer({
      jpg: {
        quality: 80,
      },
      jpeg: {
        quality: 80,
      },
      png: {
        quality: 80,
        compressionLevel: 9,
      },
      webp: {
        lossless: true,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
