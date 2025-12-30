import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    plugins: [react()],
    server: {
      port: 3001,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true
        }
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            charts: ['recharts']
          }
        }
      },
      // Optimize for production
      chunkSizeWarningLimit: 1000,
      emptyOutDir: true
    },
    base: '/',
    // Set production mode
    define: {
      'import.meta.env.MODE': JSON.stringify(mode),
      'import.meta.env.PROD': JSON.stringify(isProduction),
      'import.meta.env.DEV': JSON.stringify(!isProduction)
    }
  };
});

