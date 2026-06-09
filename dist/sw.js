const CACHE_NAME = "currency-converter-v7";

const FILES = [
	"./",
	"./index.html",
	"./icon.png",
	"./main.js",
	"./tailwind.css",
	"./react.production.min.js",
	"./react-dom.production.min.js",
	"./dnd.min.js",
	"./fontawesome/css/all.css",
	"./fontawesome/webfonts/fa-solid-900.woff2"
];

self.addEventListener("install", event => {
	self.skipWaiting();

	event.waitUntil(
		caches.open(CACHE_NAME).then(cache => {
			return cache.addAll(FILES);
		})
	);
});

self.addEventListener("activate", event => {
	event.waitUntil(
		Promise.all([
			caches.keys().then(keys => {
				return Promise.all(
					keys.map(key => {
						if (key !== CACHE_NAME) {
							return caches.delete(key);
						}
					})
				);
			}),
			self.clients.claim()
		])
	);
});

self.addEventListener("fetch", event => {
	event.respondWith(
		caches.open(CACHE_NAME).then(cache => {
			return cache.match(event.request).then(response => {
				if (response) return response;
				return fetch(event.request).then(networkResponse => {
					return networkResponse;
				});
			});
		})
	);
});
