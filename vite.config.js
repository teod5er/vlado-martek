import { defineConfig } from 'vite';

// base: './' keeps every path relative, so the build works from any folder or subpath.
export default defineConfig({
  base: './',
  build: { target: 'es2020', chunkSizeWarningLimit: 800 },
});
