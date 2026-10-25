/// <reference lib="webworker" />
import { assets, immutable } from '$app/manifest';
import { version } from '$app/env';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `teilchen-${version}`;
const PRECACHE = [...immutable, ...assets].map((f) => f.path);

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((c) => c.addAll(PRECACHE))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});

// Build-Assets: Cache zuerst. Seiten & Daten: immer Netz (Salden müssen aktuell sein),
// bei Offline die zuletzt gesehene Version.
sw.addEventListener('fetch', (event) => {
	const req = event.request;
	const url = new URL(req.url);
	if (
		req.method !== 'GET' ||
		url.origin !== sw.location.origin ||
		url.pathname.startsWith('/auth/')
	)
		return;

	if (PRECACHE.includes(url.pathname)) {
		event.respondWith(caches.match(req).then((r) => r ?? fetch(req)));
		return;
	}

	event.respondWith(
		fetch(req)
			.then((res) => {
				if (res.ok && res.type === 'basic') {
					const copy = res.clone();
					void caches.open(CACHE).then((c) => c.put(req, copy));
				}
				return res;
			})
			.catch(async () => (await caches.match(req)) ?? Response.error())
	);
});
