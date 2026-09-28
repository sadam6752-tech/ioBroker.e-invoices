import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite';

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
				// Never serve the app shell for API navigations (PDF/XML downloads).
				navigateFallbackDenylist: [/^\/api\//],
				runtimeCaching: [
					{
						urlPattern: ({ url }) => url.pathname.startsWith('/api/invoices') && !url.pathname.endsWith('/issue'),
						handler: 'NetworkFirst',
						options: { cacheName: 'api-read', networkTimeoutSeconds: 5 },
					},
				],
			},
		}),
	],
});
