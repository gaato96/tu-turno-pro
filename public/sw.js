// Service Worker simple para habilitar PWA Install Prompt
self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(self.clients.claim());
});

// A fetch listener is required for the install prompt to trigger
self.addEventListener('fetch', (e) => {
    // Solo passthrough, no hace cache local en este stub
});
