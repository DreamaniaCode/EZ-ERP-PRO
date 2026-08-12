import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './i18n'; // Initialize i18n before app renders
import './index.css';

// Global helper to force unregister SW and purge all caches for hard mobile updates
(window as any).forcePWAUpdate = async () => {
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
  } catch (err) {
    console.error('PWA force update error:', err);
  } finally {
    window.location.reload();
  }
};

// Register PWA Service Worker with auto-update listener & notification events
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('PWA Service Worker registered successfully:', reg.scope);
      
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
              console.log('New PWA version detected and installed!');
              window.dispatchEvent(new CustomEvent('pwa-update-available', { detail: { registration: reg } }));
            }
          });
        }
      });

      // Force update check on page load, focus, and every 15 minutes
      reg.update();
      window.addEventListener('focus', () => reg.update());
      setInterval(() => reg.update(), 15 * 60 * 1000);

    }).catch((err) => {
      console.log('PWA Service Worker registration failed:', err);
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
