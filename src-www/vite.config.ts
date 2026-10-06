import { readFileSync } from 'node:fs';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig, type Plugin } from 'vite';

/**
 * Embeds the iOS home screen icon into the page as a data URI. iOS fetches an `apple-touch-icon` with a connection
 * of its own, and over HTTPS with a certificate it does not trust (a self-signed one) that second request fails —
 * the app is then saved without its icon. With the picture inside the page there is no second request.
 */
function embedTouchIcon(): Plugin {
	return {
		name: 'embed-touch-icon',
		transformIndexHtml(html) {
			const png = readFileSync('public/icons/apple-touch-icon.png').toString('base64');
			return html.replace('href="./icons/apple-touch-icon.png"', `href="data:image/png;base64,${png}"`);
		},
	};
}

export default defineConfig({
	base: './',
	build: {
		outDir: '../www',
		emptyOutDir: true,
	},
	server: {
		proxy: {
			'/api': 'http://localhost:8093',
		},
	},
	plugins: [
		embedTouchIcon(),
		VitePWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'E-Invoices',
				short_name: 'E-Invoices',
				description: 'ZUGFeRD E-Rechnungen erstellen, speichern und sichern',
				lang: 'de',
				start_url: '.',
				display: 'standalone',
				background_color: '#ffffff',
				theme_color: '#1a56db',
				icons: [
					{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
					{ src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
				],
			},
			workbox: {
				// Drop runtime caches from earlier versions, otherwise a PDF stored
				// by the old NetworkFirst rule survives the update.
				cleanupOutdatedCaches: true,
				// Never serve the app shell for API navigations (PDF/XML downloads).
				navigateFallbackDenylist: [/^\/api\//],
				runtimeCaching: [
					{
						// Read-only invoice data. NetworkOnly: a cached PDF would show
						// a stale rendering after a layout fix, and NetworkFirst falls
						// back to the cache on timeout, which had exactly that effect.
						urlPattern: ({ url }) =>
							url.pathname.startsWith('/api/invoices') && !url.pathname.endsWith('/issue'),
						handler: 'NetworkOnly',
						options: { cacheName: 'api-read' },
					},
				],
			},
		}),
	],
});
