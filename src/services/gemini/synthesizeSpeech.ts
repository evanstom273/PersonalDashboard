import { geminiFetch, toDataUrl } from '@/services/gemini/client'
import { DEFAULT_TTS_MODEL_ID } from '@/services/gemini/ttsVoices'
import { getConfiguredAiName } from '@/services/gemini/systemInstruction'
import type { UserPreferences } from '@/storage/types'

interface SynthesizeSpeechResponse {
	candidates?: Array<{
		content?: {
			parts?: Array<{
				inlineData?: {
					mimeType: string
					data: string
				}
			}>
		}
	}>
}

export interface SynthesizeSpeechOptions {
	apiKey: string
	text: string
	voiceName: string
	preferences: UserPreferences
	modelId?: string
}

export interface SynthesizedSpeech {
	dataUrl: string
	mimeType: string
}

export async function synthesizeSpeechWithGemini(
	options: SynthesizeSpeechOptions,
): Promise<SynthesizedSpeech> {
	const apiKey = options.apiKey.trim()
	if (!apiKey) {
		throw new Error('Add your Gemini API key in Settings to use text-to-speech.')
	}

	const speechText = options.text.trim()
	if (!speechText) {
		throw new Error('There is no text to speak.')
	}

	const modelId = options.modelId?.trim() || DEFAULT_TTS_MODEL_ID
	const prompt = buildTtsPrompt(options.preferences, speechText)

	const response = await geminiFetch<SynthesizeSpeechResponse>(
		apiKey,
		`/models/${modelId}:generateContent`,
		{
			method: 'POST',
			body: JSON.stringify({
				contents: [
					{
						parts: [{ text: prompt }],
					},
				],
				generationConfig: {
					responseModalities: ['AUDIO'],
					speechConfig: {
						voiceConfig: {
							prebuiltVoiceConfig: {
								voiceName: options.voiceName,
							},
						},
					},
				},
			}),
		},
	)

	const inlineData = response.candidates?.[0]?.content?.parts?.find(
		(part) => part.inlineData?.data,
	)?.inlineData

	if (!inlineData?.data) {
		throw new Error('Speech generation returned no audio.')
	}

	return audioInlineDataToPlayable(inlineData.mimeType, inlineData.data)
}

export function buildTtsPrompt(
	preferences: UserPreferences,
	speechText: string,
): string {
	const aiName = getConfiguredAiName(preferences)
	const behavior = preferences.aiBehaviorInstructions.trim().slice(0, 240)
	const styleClause = behavior
		? `Speak naturally as ${aiName}, reflecting this personality: ${behavior}. `
		: `Speak naturally as ${aiName} in a warm, conversational tone. `

	return `${styleClause}Say the following reply:\n\n${speechText}`
}

function audioInlineDataToPlayable(
	mimeType: string,
	base64Data: string,
): SynthesizedSpeech {
	const normalizedMimeType = mimeType.toLowerCase()

	if (
		normalizedMimeType.includes('wav') ||
		normalizedMimeType.includes('mpeg') ||
		normalizedMimeType.includes('mp3') ||
		normalizedMimeType.includes('ogg') ||
		normalizedMimeType.includes('webm')
	) {
		return {
			dataUrl: toDataUrl(mimeType, base64Data),
			mimeType,
		}
	}

	const pcmBytes = base64ToBytes(base64Data)
	const wavBytes = pcmToWav(pcmBytes)
	const wavBase64 = bytesToBase64(wavBytes)

	return {
		dataUrl: toDataUrl('audio/wav', wavBase64),
		mimeType: 'audio/wav',
	}
}

function base64ToBytes(base64Data: string): Uint8Array {
	const binary = atob(base64Data)
	const bytes = new Uint8Array(binary.length)
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index)
	}
	return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
	let binary = ''
	for (let index = 0; index < bytes.length; index += 1) {
		binary += String.fromCharCode(bytes[index]!)
	}
	return btoa(binary)
}

function pcmToWav(
	pcmData: Uint8Array,
	sampleRate = 24000,
	channels = 1,
	bitsPerSample = 16,
): Uint8Array {
	const bytesPerSample = bitsPerSample / 8
	const blockAlign = channels * bytesPerSample
	const byteRate = sampleRate * blockAlign
	const dataSize = pcmData.length
	const buffer = new ArrayBuffer(44 + dataSize)
	const view = new DataView(buffer)

	writeAscii(view, 0, 'RIFF')
	view.setUint32(4, 36 + dataSize, true)
	writeAscii(view, 8, 'WAVE')
	writeAscii(view, 12, 'fmt ')
	view.setUint32(16, 16, true)
	view.setUint16(20, 1, true)
	view.setUint16(22, channels, true)
	view.setUint32(24, sampleRate, true)
	view.setUint32(28, byteRate, true)
	view.setUint16(32, blockAlign, true)
	view.setUint16(34, bitsPerSample, true)
	writeAscii(view, 36, 'data')
	view.setUint32(40, dataSize, true)

	new Uint8Array(buffer, 44).set(pcmData)
	return new Uint8Array(buffer)
}

function writeAscii(view: DataView, offset: number, value: string): void {
	for (let index = 0; index < value.length; index += 1) {
		view.setUint8(offset + index, value.charCodeAt(index))
	}
}
