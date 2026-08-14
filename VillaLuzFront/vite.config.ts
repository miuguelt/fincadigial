import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { compression } from 'vite-plugin-compression2';
import path from 'path';
import fs from 'fs';
import { X509Certificate } from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to prevent plugins from running during secondary builds (like the PWA Service Worker build)
function onlyMainBuild(plugin: any) {
  let isSW = false;
  return {
    ...plugin,
    configResolved(config: any) {
      const input = config.build?.rollupOptions?.input;
      if (input) {
        const inputStr = typeof input === 'string'
          ? input
          : Array.isArray(input)
            ? input.join(',')
            : Object.values(input).join(',');
        if (inputStr.includes('sw.ts') || inputStr.includes('sw.js')) {
          isSW = true;
        }
      }
      if (plugin.configResolved) {
        plugin.configResolved(config);
      }
    },
    async closeBundle() {
      if (isSW) return;
      if (plugin.closeBundle) {
        await plugin.closeBundle();
      }
    }
  };
}

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
          enabled: false, // Desactivado en dev por defecto para mejorar HMR
          navigateFallback: 'index.html',
          type: 'module'
        }
      }),
      ...(isProd ? [
        onlyMainBuild(
          compression({
            algorithms: ['gzip', 'brotliCompress'],
            exclude: [/\.(png|jpg|webp|gif|ico|woff2?)$/]
          })
        ),
      ] : []),
    ],
    resolve: {
      alias: [
        { find: '@', replacement: path.resolve(__dirname, './src') },
        { find: 'lucide-react', replacement: path.resolve(__dirname, './src/shared/ui/icons') },
        { find: /^react-icons(\/.*)?$/, replacement: path.resolve(__dirname, './src/shared/ui/icons') },
      ],
      conditions: ['module'],
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'recharts',
        'lucide-react',
        'axios',
        '@tanstack/react-query',
        'class-variance-authority',
        'clsx',
        'tailwind-merge'
      ],
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
      sourcemap: !isProd,
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router')) return 'vendor-core';
            if (id.includes('node_modules/@tanstack/react-query')) return 'vendor-state';
            if (id.includes('node_modules/recharts') || id.includes('node_modules/chart.js') || id.includes('node_modules/react-chartjs-2')) return 'vendor-charts';
            if (id.includes('node_modules/lucide-react') || id.includes('node_modules/react-icons') || id.includes('node_modules/@radix-ui') || id.includes('node_modules/@heroui')) return 'vendor-ui-icons';
            if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/zod') || id.includes('node_modules/axios')) return 'vendor-utils';
            if (id.includes('node_modules/date-fns') || id.includes('node_modules/framer-motion')) return 'vendor-ux';
            if (id.includes('node_modules/leaflet')) return 'vendor-maps';
          },
        },
      },
    },
    server: {
      https: httpsConfig,
      host: '0.0.0.0',
      port: 3005,
      strictPort: true,
      cors: true, 
      hmr: {
        // Let Vite infer protocol/host/port from the actual dev server URL.
        // Hardcoding localhost + configured port breaks HMR when npm/CLI starts Vite on a fallback port.
        overlay: true,
      },
      watch: {
        // Desactivado por defecto en Windows local para evitar escaneos constantes de disco y CPU altos tras cambios.
        // Habilitar con VITE_USE_POLLING=true solo si se ejecuta dentro de WSL2 con volúmenes montados NTFS.
        usePolling: env.VITE_USE_POLLING === 'true', 
        interval: 100,
        ignored: ['**/node_modules/**', '**/dist/**'],
      },
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://127.0.0.1:8092',
          changeOrigin: true,
          secure: false,
          // Optimización para SSE y conexiones largas
          timeout: 0, 
          proxyTimeout: 0,
          headers: {
            Connection: 'keep-alive',
          },
          configure: (proxy) => {
            proxy.on('error', (err, req) => {
              // Ignorar ECONNRESET en SSE ya que es el comportamiento normal al recargar o cerrar pestañas
              if (err.message.includes('ECONNRESET') && req.url?.includes('sse')) return;
              console.error('[Vite Proxy] Error:', err.message, '→', req.url);
            });
            proxy.on('proxyReq', (proxyReq, req) => {
              const origin = req.headers.origin || (disableHttps ? 'http://localhost:3005' : 'https://localhost:3005');
              proxyReq.setHeader('Origin', origin);
              
              // Deshabilitar buffering para SSE
              if (req.url?.includes('sse')) {
                proxyReq.setHeader('Cache-Control', 'no-cache');
                proxyReq.setHeader('X-Accel-Buffering', 'no');
              }
            });
          }
        }
      }
    }
  };
});
