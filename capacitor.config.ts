import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
	appId: 'com.personaldashboard.app',
	appName: 'Personal Dashboard',
	webDir: 'dist',
	server: {
		androidScheme: 'https',
	},
}

export default config
