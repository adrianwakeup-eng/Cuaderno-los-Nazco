import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Recover automatically if a stale cached shell ever fails to preload an updated asset
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  window.location.reload();
});

// Register safe static-shell PWA Service Worker and auto-refresh on new deployments
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  let refreshing = false;
  let hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) {
      hadController = true;
      return;
    }
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        void reg.update();
      })
      .catch(() => {
        // Non-fatal in dev or restricted WebViews
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


 // Keep the mobile chat within the visible viewport when the keyboard opens.
const viewport = window.visualViewport;
if (viewport) {
  const syncViewport = () => {
    const focused = document.activeElement;
    const editing = focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement || (focused instanceof HTMLElement && focused.isContentEditable);
    const keyboard = editing && viewport.scale === 1 && window.innerHeight - viewport.height > 120;
    document.documentElement.dataset.keyboardOpen = String(keyboard);
    const chat = document.querySelector<HTMLElement>('.liquid-chat-shell');
    if (chat && window.innerWidth < 768) {
      const top = Math.max(0, chat.getBoundingClientRect().top - viewport.offsetTop);
      const bottom = keyboard ? 12 : 84;
      document.documentElement.style.setProperty('--mobile-chat-height', Math.max(160, viewport.height - top - bottom) + 'px');
    }
  };
  viewport.addEventListener('resize', syncViewport);
  viewport.addEventListener('scroll', syncViewport);
  document.addEventListener('focusin', syncViewport);
  document.addEventListener('focusout', () => requestAnimationFrame(syncViewport));
  window.addEventListener('resize', syncViewport);
}
