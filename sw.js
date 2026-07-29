// Deliberately minimal: registering a service worker with a fetch handler
// is what makes the site installable on Android/Chrome. This one does NOT
// cache anything — every request just passes straight through to the
// network. A caching service worker caused serious stale-content problems
// earlier in this project's history, so this trades offline support for
// reliability: you'll always see the latest deployed version.
//
// Critically: it never touches navigation requests (full page loads).
// Intercepting those caused the Google sign-in redirect to fail — any
// hiccup in the passthrough fetch turned into a hard "failed to fetch"
// right as the browser tried to reload the page after returning from
// Google. Skipping navigations entirely removes that risk while still
// satisfying the "has a fetch handler" requirement for installability.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(() => new Response('', { status: 504, statusText: 'Offline' }))
  );
});