/* Traveller Sheet offline support.
   The sheet's own files are fetched fresh whenever there's a connection, so a pushed fix reaches
   players straight away, and the last copy is kept for when there's no signal at the table.
   Fonts rarely change, so they come from the cache first. */
const CACHE = "traveller-sheet-v2";
const SHELL = ["./", "index.html", "css/sheet.css", "css/crt.css", "js/sheet.js", "js/crt.js",
  "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/favicon-32.png"];

self.addEventListener("install", (e) => {
  // "reload" skips the browser's HTTP cache, so the saved copy is the version just published
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const font = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== location.origin && !font) return;

  if (font) {
    // Cache first: fonts don't change
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })));
    return;
  }

  // Network first, falling back to the saved copy when offline. "no-cache" makes the browser check with
  // the server each time instead of reusing its own HTTP cache (GitHub Pages lets that last 10 minutes),
  // so a new index.html never loads alongside an old sheet.js or the other way round.
  e.respondWith(fetch(req, { cache: "no-cache" }).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true })
    .then((hit) => hit || (req.mode === "navigate" ? caches.match("index.html") : Response.error()))));
});
