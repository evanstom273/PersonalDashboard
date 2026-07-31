import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(scriptDir, '..', 'public')
const iconSvg = readFileSync(path.join(publicDir, 'pwa-icon.svg'))

const sizes = [
	{ name: 'pwa-192x192.png', size: 192 },
	{ name: 'pwa-512x512.png', size: 512 },
	{ name: 'apple-touch-icon.png', size: 180 },
]

for (const { name, size } of sizes) {
	const outputPath = path.join(publicDir, name)
	const buffer = await sharp(iconSvg).resize(size, size).png().toBuffer()
	writeFileSync(outputPath, buffer)
}

writeFileSync(path.join(publicDir, 'pwa-icon-maskable.svg'), iconSvg)

console.log('Generated PWA icons')
