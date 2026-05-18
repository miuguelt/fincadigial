import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import fs from 'fs';
import { X509Certificate } from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===========================================================
// CONFIGURACIÓN VITE / REACT / DOCKER (finca / mifinca)
// ===========================================================
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const runtimeEnv = env.VITE_RUNTIME_ENV || mode;
  const isProd = runtimeEnv === 'production';

  // ===========================================================
  // BACKEND URL / PROXY TARGET
  // ===========================================================
  // Best practice in dev: keep axios baseURL relative (/api/v1) and use Vite proxy to avoid CORS.
  // Use VITE_PROXY_TARGET (no /api/v1) to point the proxy at a remote backend (e.g. https://finca.enlinea.sbs).
  const backendUrl =
    env.VITE_API_BASE_URL ||
    // En desarrollo local fuera de Docker, usar localhost por defecto.
    // En Docker/compose, se debe proveer VITE_API_BASE_URL (p.ej. http://finca:8181/api/v1).
    (isProd ? 'http://villaluz-backend:8081/api/v1' : 'http://127.0.0.1:8081/api/v1');

  const proxyTarget =
    env.VITE_PROXY_TARGET ||
    env.VITE_API_BASE_URL_NO_VERSION ||
    backendUrl.replace(/\/$/, '').replace(/\/api\/v1$/, '');

  // ===========================================================
  // HTTPS LOCAL (solo para desarrollo fuera de Docker)
  // ===========================================================
  const disableHttps = env.VITE_DISABLE_HTTPS === 'true';
  let httpsConfig: any = undefined;
  if (command === 'serve' && !isProd && !disableHttps) {
    const keyPath = path.resolve(__dirname, 'certificates', 'cert.key');
    const certPath = path.resolve(__dirname, 'certificates', 'cert.crt');
    const caPath = path.resolve(__dirname, 'certificates', 'ca.crt');

    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      console.warn('[HTTPS] Certificados no encontrados. Se usará HTTPS autogenerado.');
      httpsConfig = true;
    } else {
      const certBuf = fs.readFileSync(certPath);
      try {
        const x509 = new X509Certificate(certBuf);
        const validTo = new Date(x509.validTo);
        const daysRemaining = Math.floor((validTo.getTime() - Date.now()) / 86_400_000);
        if (daysRemaining < 0) {
          console.warn(`[HTTPS] Certificado expirado (${validTo.toISOString()}). Se usará HTTPS autogenerado.`);
          httpsConfig = true;
        } else if (daysRemaining <= 14) {
          console.warn(`[HTTPS] Advertencia: el certificado local expira en ${daysRemaining} días (${validTo.toISOString()}).`);
        }
      } catch (err) {
        console.warn('[HTTPS] No se pudo inspeccionar el certificado local:', err);
      }

      if (httpsConfig !== true) {
        httpsConfig = {
          key: fs.readFileSync(keyPath),
          cert: certBuf,
          ...(fs.existsSync(caPath) ? { ca: fs.readFileSync(caPath) } : {})
        };
      }
    }
  }

  // ===========================================================
  // CONFIGURACIÓN FINAL
  // ===========================================================
  return {
    plugins: [
      tailwindcss(),
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'Finca Villa Luz',
          short_name: 'Finca',
          description: 'Gestión de finca - Trabaja offline en el campo',
          theme_color: '#166534',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
          ]
        },
        devOptions: {
          enabled: env.VITE_ENABLE_PWA_PREFETCH === 'true' && mode === 'development',
          navigateFallback: 'index.html',
          type: 'module'
        }
      })
    ],
    resolve: {
      alias: [
        { find: '@', replacement: path.resolve(__dirname, './src') },
      ],
      conditions: ['module'],
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
    },
    define: {
      __VITE_IMPORT_META_ENV__: 'import.meta.env'
    },
    esbuild: {
      target: 'esnext',
      drop: isProd ? ['console', 'debugger'] : [],
    },
    build: {
      target: 'esnext',
      sourcemap: isProd ? false : true,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // React core
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
              return 'vendor-react';
            }
            // Router
            if (id.includes('node_modules/react-router')) {
              return 'vendor-router';
            }
            // State management
            if (id.includes('node_modules/@reduxjs') || id.includes('node_modules/react-redux') || id.includes('node_modules/@tanstack/react-query')) {
              return 'vendor-state';
            }
            // Charts
            if (id.includes('node_modules/chart.js') || id.includes('node_modules/react-chartjs-2') || id.includes('node_modules/recharts')) {
              return 'vendor-charts';
            }
            // Date utils
            if (id.includes('node_modules/date-fns')) {
              return 'vendor-dates';
            }
            // Animation
            if (id.includes('node_modules/framer-motion')) {
              return 'vendor-motion';
            }
            // UI — Radix + HeroUI
            if (id.includes('node_modules/@radix-ui') || id.includes('node_modules/@heroui')) {
              return 'vendor-ui';
            }
            // Icons
            if (id.includes('node_modules/lucide-react') || id.includes('node_modules/react-icons') || id.includes('node_modules/@heroicons')) {
              return 'vendor-icons';
            }
            // Forms
            if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/zod') || id.includes('node_modules/@hookform')) {
              return 'vendor-forms';
            }
            // HTTP / utils
            if (id.includes('node_modules/axios') || id.includes('node_modules/jwt-decode')) {
              return 'vendor-http';
            }
          },
        },
      },
    },
    server: {
      https: httpsConfig,
      host: '127.0.0.1',
      port: 3003,
      strictPort: true,
      cors: true,
      proxy: {
        '/api/v1/events': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
          configure: (proxy) => {
            proxy.on('error', (err) => console.error('SSE Proxy error:', err));
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Connection', 'keep-alive');
              proxyReq.setHeader('Cache-Control', 'no-cache');
            });
          }
        },
        '/api/v1': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: '',
          cookiePathRewrite: '/',
          configure: (proxy) => {
            proxy.on('error', (err) => console.error('Proxy error:', err));
          }
        },
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/public': { target: proxyTarget, changeOrigin: true, secure: false },
        '/static': { target: proxyTarget, changeOrigin: true, secure: false }
      }
    }
  };
});
