const CACHE_NAME = "fwdnourish-pwa-v1";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
  "/favicon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function shouldHandle(request) {
  if (request.method !== "GET") return false;
  if (request.headers.has("authorization")) return false;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;

  // Never cache API/auth traffic or Vite development internals.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/docs") ||
    url.pathname.startsWith("/openapi") ||
    url.pathname.startsWith("/@") ||
    url.pathname.includes("node_modules")
  ) {
    return false;
  }

  return true;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!shouldHandle(request)) return;

  const url = new URL(request.url);

  // SPA navigation: network first, cached app shell as offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", copy));
          return response;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Static assets: cache first, then network and cache the result.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === "opaque") {
          return response;
        }

        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});
