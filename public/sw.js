const CACHE_NAME = "everywhere-studio-v1";

// Install
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy: Network-first for everything
// This keeps the app always fresh while still being installable
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET requests (POST to APIs, etc.)
  if (request.method !== "GET") return;

  // Skip API calls entirely — they should always hit the network
  if (request.url.includes("/api/")) return;

  // For navigation (page loads): network first, fall back to cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/studio/dashboard"))
        )
    );
    return;
  }

  // For static assets (JS, CSS, images, fonts): cache first, update in background
  if (request.url.match(/\.(js|css|png|jpg|jpeg|svg|woff2?|ico)(\?.*)?$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }
});
