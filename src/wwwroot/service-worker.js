// In development, always fetch from the network and do not enable offline support.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip interception for debugger and hot-reload traffic to avoid "breakpoint" issues
    if (url.pathname.includes('_framework/debug') ||
        url.pathname.includes('_framework/blazor-hotreload') ||
        url.pathname.endsWith('.map') || // Source maps
        event.request.method !== 'GET') {
        return;
    }

    if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.status === 0 || !response.ok) {
                    return response;
                }

                // Only inject headers for HTML and JS/Wasm files
                const contentType = response.headers.get('content-type');
                const isHtml = event.request.mode === 'navigate';
                const isFramework = url.pathname.includes('_framework/');

                if (isHtml || isFramework) {
                    const newHeaders = new Headers(response.headers);
                    newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
                    newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

                    // If it's a stream, we can't easily modify headers without re-creating
                    // but we must preserve the original response properties
                    return new Response(response.body, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: newHeaders,
                    });
                }

                return response;
            })
            .catch((error) => {
                // Return original fetch if something goes wrong
                return fetch(event.request);
            })
    );
});
