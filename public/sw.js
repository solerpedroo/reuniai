const CACHE_NAME = "reuniai-shell-v4";
const SHELL = ["/", "/manifest.webmanifest", "/revisar", "/hoje", "/tarefas"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response.ok || response.type !== "basic") return response;
        const copy = response.clone();
        void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});

self.addEventListener("push", (event) => {
  let payload;
  try {
    payload = event.data ? event.data.json() : undefined;
  } catch {
    payload = undefined;
  }
  const title = (payload && payload.title) || "ReuniAI";
  const href = (payload && payload.href) || "/";
  const options = {
    body: (payload && payload.body) || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { href },
    tag: (payload && payload.kind) || "reuniai",
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = (event.notification.data && event.notification.data.href) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          const url = new URL(client.url);
          if (url.origin === self.location.origin) {
            client.navigate(href);
            return client.focus();
          }
        }
      }
      return self.clients.openWindow(href);
    })
  );
});
