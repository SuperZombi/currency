const CACHE_NAME = "currency-converter-v2";

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
	event.waitUntil(
		caches.open(CACHE_NAME)
			.then(cache => cache.addAll(FILES))
	)
})

self.addEventListener("fetch", event => {
	event.respondWith(
		caches.match(event.request)
			.then(response => response || fetch(event.request))
	)
})
