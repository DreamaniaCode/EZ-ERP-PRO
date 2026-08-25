import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './i18n'; // Initialize i18n before app renders
import './index.css';

declare const __APP_BUILD_VERSION__: string;

const CURRENT_VERSION = typeof __APP_BUILD_VERSION__ !== 'undefined' ? __APP_BUILD_VERSION__ : 'live';

// Global helper to force unregister SW and purge all caches for hard mobile updates
(window as any).forcePWAUpdate = async (targetVersion?: string) => {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          reg.waiting.postMessage({ type: 'CLEAR_CACHE' });
        }
        await reg.unregister();
      }
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
      }
    }
    // Clear chunk load reload locks
    sessionStorage.removeItem('erp_chunk_load_reload');
    if (targetVersion) {
      localStorage.setItem('erp_app_version', targetVersion);
    }
  } catch (err) {
    console.error('PWA force update error:', err);
  } finally {
    const timestamp = Date.now();
    window.location.replace(`${window.location.origin}${window.location.pathname}?_v=${targetVersion || CURRENT_VERSION}&_t=${timestamp}`);
  }
};

// Register PWA Service Worker with auto-update listener & notification events
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // updateViaCache: 'none' forces the browser to NEVER use HTTP cache when checking for sw.js updates!
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((reg) => {
      console.log('[PWA] Service Worker registered successfully:', reg.scope);
      
      // Check if an update is already waiting
      if (reg.waiting) {
        window.dispatchEvent(new CustomEvent('pwa-update-available', { detail: { registration: reg } }));
      }

      // Listen for new service worker installation
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New version detected and installed in background!');
              window.dispatchEvent(new CustomEvent('pwa-update-available', { detail: { registration: reg } }));
            }
          });
        }
      });

      // Active Real-Time Version Checker (polls /version.json)
      const checkRemoteVersion = async () => {
        try {
          const res = await fetch(`/version.json?t=${Date.now()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.version && data.version !== CURRENT_VERSION) {
              console.log(`[PWA] Remote version detected: ${data.version} (Current: ${CURRENT_VERSION})`);
              reg.update();
              window.dispatchEvent(new CustomEvent('pwa-update-available', { 
                detail: { registration: reg, remoteVersion: data.version } 
              }));
            }
          }
        } catch (e) {
          // Ignore offline errors
        }
      };

      // Check on startup after 2 seconds
      setTimeout(checkRemoteVersion, 2000);

      // Force update check on focus, visibility change, online, and every 45 seconds
      reg.update();
      window.addEventListener('focus', () => {
        reg.update();
        checkRemoteVersion();
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          reg.update();
          checkRemoteVersion();
        }
      });

      window.addEventListener('online', () => {
        reg.update();
        checkRemoteVersion();
      });

      setInterval(() => {
        reg.update();
        checkRemoteVersion();
      }, 45 * 1000);

    }).catch((err) => {
      console.log('[PWA] Service Worker registration failed:', err);
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

