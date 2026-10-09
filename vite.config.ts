import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build:html` збирає все (JS, CSS, шрифти) в один файл standalone/index.html,
// який можна відкрити в браузері подвійним кліком, без сервера.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), tailwindcss(), ...(mode === 'single' ? [viteSingleFile({ removeViteModuleLoader: true })] : [])],
  build: {
    chunkSizeWarningLimit: 2000,
    ...(mode === 'single' ? { outDir: 'standalone', assetsInlineLimit: 100_000_000 } : {}),
  },
}));
