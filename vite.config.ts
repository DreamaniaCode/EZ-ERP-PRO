import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';

const buildVersion = `v${Date.now()}`;

function pwaVersionPlugin(): Plugin {
  return {
    name: 'pwa-version-plugin',
    buildStart() {
      const versionData = {
        version: buildVersion,
        builtAt: new Date().toISOString(),
        name: 'EasyERP Pro'
      };
      try {
        const publicDir = path.resolve(__dirname, 'public');
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
        fs.writeFileSync(path.join(publicDir, 'version.json'), JSON.stringify(versionData, null, 2));
      } catch (err) {
        console.error('Failed to write public/version.json:', err);
      }
    },
    closeBundle() {
      const versionData = {
        version: buildVersion,
        builtAt: new Date().toISOString(),
        name: 'EasyERP Pro'
      };
      const distDir = path.resolve(__dirname, 'dist');
      try {
        if (fs.existsSync(distDir)) {
          fs.writeFileSync(path.join(distDir, 'version.json'), JSON.stringify(versionData, null, 2));
          
          const distSwPath = path.join(distDir, 'sw.js');
          if (fs.existsSync(distSwPath)) {
            let swContent = fs.readFileSync(distSwPath, 'utf-8');
            swContent = swContent.replace(
              /const CACHE_NAME = ['"][^'"]+['"];/,
              `const CACHE_NAME = 'easyerp-pwa-${buildVersion}';`
            );
            fs.writeFileSync(distSwPath, swContent);
          }
        }
      } catch (err) {
        console.error('Failed to update dist version / sw.js:', err);
      }
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), pwaVersionPlugin()],
    define: {
      __APP_BUILD_VERSION__: JSON.stringify(buildVersion),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});
