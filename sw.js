// Deliberately minimal: registering a service worker with a fetch handler
// is what makes the site installable on Android/Chrome. This one does NOT
// cache anything — every request just passes straight through to the
// network. A caching service worker caused serious stale-content problems
// earlier in this project's history, so this trades offline support for
// reliability: you'll always see the latest deployed version.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
