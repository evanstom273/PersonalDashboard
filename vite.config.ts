import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const rootDir = import.meta.dirname

export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: [
				'favicon.svg',
				'icons.svg',
				'pwa-icon.svg',
				'apple-touch-icon.png',
			],
			manifest: {
				name: 'Personal Dashboard',
				short_name: 'Dashboard',
				description: 'A modular personal productivity dashboard with independent widgets.',
				theme_color: '#101010',
				background_color: '#101010',
				display: 'standalone',
				orientation: 'any',
				start_url: '/',
				scope: '/',
				categories: ['productivity', 'utilities'],
				icons: [
					{
						src: 'pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png',
					},
					{
						src: 'pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png',
					},
					{
						src: 'pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable',
					},
				],
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
				navigateFallback: 'index.html',
				navigateFallbackDenylist: [/^\/api\//],
			},
			devOptions: {
				enabled: true,
				type: 'module',
			},
		}),
	],
	resolve: {
		alias: {
			'@': path.resolve(rootDir, './src'),
		},
	},
	server: {
		host: true,
	},
})
