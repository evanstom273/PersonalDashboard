import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
	appId: 'com.personalai.geminichat',
	appName: 'Gemini Chat',
	webDir: 'dist',
	server: {
		androidScheme: 'https',
	},
	plugins: {
		LocalNotifications: {
			iconColor: '#0e1016',
		},
	},
}

export default config
