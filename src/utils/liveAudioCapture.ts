import {
	LIVE_INPUT_SAMPLE_RATE,
	LIVE_OUTPUT_SAMPLE_RATE,
} from '@/services/gemini/liveConstants'
import { bytesToBase64 } from '@/services/gemini/audioUtils'

export interface LiveAudioCaptureHandle {
	stop: () => void
}

function downsampleTo16kHz(
	input: Float32Array,
	inputSampleRate: number,
): Int16Array {
	if (inputSampleRate === LIVE_INPUT_SAMPLE_RATE) {
		const pcm = new Int16Array(input.length)
		for (let index = 0; index < input.length; index += 1) {
			const sample = Math.max(-1, Math.min(1, input[index]!))
			pcm[index] = sample < 0 ? sample * 32768 : sample * 32767
		}
		return pcm
	}

	const ratio = inputSampleRate / LIVE_INPUT_SAMPLE_RATE
	const outputLength = Math.floor(input.length / ratio)
	const pcm = new Int16Array(outputLength)

	for (let index = 0; index < outputLength; index += 1) {
		const sourceIndex = Math.floor(index * ratio)
		const sample = Math.max(-1, Math.min(1, input[sourceIndex]!))
		pcm[index] = sample < 0 ? sample * 32768 : sample * 32767
	}

	return pcm
}

export async function startLiveAudioCapture(
	onPcmChunk: (base64Pcm: string) => void,
): Promise<LiveAudioCaptureHandle> {
	const stream = await navigator.mediaDevices.getUserMedia({
		audio: {
			echoCancellation: true,
			noiseSuppression: true,
			autoGainControl: true,
		},
	})

	const audioContext = new AudioContext()
	const source = audioContext.createMediaStreamSource(stream)
	const processor = audioContext.createScriptProcessor(4096, 1, 1)
	const gain = audioContext.createGain()
	gain.gain.value = 0

	source.connect(processor)
	processor.connect(gain)
	gain.connect(audioContext.destination)

	processor.onaudioprocess = (event) => {
		const channel = event.inputBuffer.getChannelData(0)
		const pcm = downsampleTo16kHz(channel, audioContext.sampleRate)
		if (pcm.length === 0) {
			return
		}
		const bytes = new Uint8Array(pcm.buffer)
		onPcmChunk(bytesToBase64(bytes))
	}

	await audioContext.resume()

	return {
		stop: () => {
			processor.onaudioprocess = null
			processor.disconnect()
			source.disconnect()
			gain.disconnect()
			for (const track of stream.getTracks()) {
				track.stop()
			}
			void audioContext.close()
		},
	}
}

export { LIVE_OUTPUT_SAMPLE_RATE }
