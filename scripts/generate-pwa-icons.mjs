import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(__dirname, '../public')
const source = path.join(publicDir, 'pwa-icon.svg')

const sizes = [192, 512]

await mkdir(publicDir, { recursive: true })

for (const size of sizes) {
	const output = path.join(publicDir, `pwa-${size}x${size}.png`)
	const buffer = await sharp(source).resize(size, size).png().toBuffer()
	await writeFile(output, buffer)
	console.log(`Wrote ${output}`)
}
