import {
	FunctionResponse,
	GoogleGenAI,
	Modality,
	type LiveServerMessage,
	type Session,
} from '@google/genai'
import { buildChatTools, executeAppToolCall } from '@/services/gemini/executeAppToolCall'
import { buildLiveSessionInstruction } from '@/services/gemini/liveContext'
import { DEFAULT_LIVE_MODEL_ID } from '@/services/gemini/liveConstants'
import { normalizeTtsVoiceName } from '@/services/gemini/ttsVoices'
import type { PendingDeleteConfirmation, StoredMessage, UserPreferences } from '@/storage/types'
import { startLiveAudioCapture } from '@/utils/liveAudioCapture'
import { PcmStreamPlayer } from '@/utils/pcmStreamPlayer'

export type LiveSessionStatus =
	| 'idle'
	| 'connecting'
	| 'listening'
	| 'speaking'
	| 'thinking'
	| 'error'

export interface LiveTranscriptTurn {
	role: 'user' | 'assistant'
	content: string
}

export interface GeminiLiveSessionOptions {
	preferences: UserPreferences
	recentMessages: StoredMessage[]
	useWebSearch?: boolean
	onStatusChange?: (status: LiveSessionStatus) => void
	onInputTranscript?: (text: string, isFinal: boolean) => void
	onOutputTranscript?: (text: string) => void
	onTranscriptTurn?: (turn: LiveTranscriptTurn) => void
	onPendingDelete?: (confirmation: PendingDeleteConfirmation) => void
	onError?: (error: Error) => void
}

export class GeminiLiveSession {
	private readonly options: GeminiLiveSessionOptions
	private session: Session | null = null
	private captureStop: (() => void) | null = null
	private player: PcmStreamPlayer | null = null
	private status: LiveSessionStatus = 'idle'
	private currentUserTranscript = ''
	private currentAssistantTranscript = ''
	private closed = false

	constructor(options: GeminiLiveSessionOptions) {
		this.options = options
	}

	getStatus(): LiveSessionStatus {
		return this.status
	}

	private setStatus(status: LiveSessionStatus): void {
		this.status = status
		this.options.onStatusChange?.(status)
	}

	async start(): Promise<void> {
		if (this.session) {
			return
		}

		this.closed = false
		this.setStatus('connecting')

		const apiKey = this.options.preferences.geminiApiKey.trim()
		if (!apiKey) {
			throw new Error('Add your Gemini API key in Settings to use Live Mode.')
		}

		const systemInstruction = await buildLiveSessionInstruction(
			this.options.preferences,
			this.options.recentMessages,
		)

		const ai = new GoogleGenAI({ apiKey })
		const voiceName = normalizeTtsVoiceName(this.options.preferences.ttsVoiceName)
		const modelId =
			this.options.preferences.liveModelId?.trim() || DEFAULT_LIVE_MODEL_ID

		this.session = await ai.live.connect({
			model: modelId,
			config: {
				responseModalities: [Modality.AUDIO],
				systemInstruction: {
					parts: [{ text: systemInstruction }],
				},
				speechConfig: {
					voiceConfig: {
						prebuiltVoiceConfig: {
							voiceName,
						},
					},
				},
				inputAudioTranscription: {},
				outputAudioTranscription: {},
				tools: buildChatTools(
					this.options.useWebSearch ?? false,
					this.options.preferences.allowCodebaseInspection ?? true,
				),
			},
			callbacks: {
				onopen: () => {
					if (this.closed) {
						return
					}
					void this.beginMicrophone()
				},
				onmessage: (message) => {
					void this.handleServerMessage(message)
				},
				onerror: (event) => {
					this.options.onError?.(
						new Error(event.message || 'Live session error.'),
					)
					this.setStatus('error')
				},
				onclose: () => {
					if (!this.closed) {
						this.cleanup()
						this.setStatus('idle')
					}
				},
			},
		})
	}

	private async beginMicrophone(): Promise<void> {
		if (!this.session || this.closed) {
			return
		}

		this.setStatus('listening')
		const capture = await startLiveAudioCapture((base64Pcm) => {
			if (!this.session || this.closed) {
				return
			}
			this.session.sendRealtimeInput({
				audio: {
					data: base64Pcm,
					mimeType: 'audio/pcm;rate=16000',
				},
			})
		})
		this.captureStop = capture.stop
	}

	private async handleServerMessage(message: LiveServerMessage): Promise<void> {
		if (this.closed) {
			return
		}

		const serverContent = message.serverContent
		if (serverContent?.interrupted) {
			this.player?.stop()
			this.player = null
			this.setStatus('listening')
		}

		if (serverContent?.inputTranscription?.text) {
			this.currentUserTranscript = serverContent.inputTranscription.text
			this.options.onInputTranscript?.(
				serverContent.inputTranscription.text,
				true,
			)
		}

		if (serverContent?.interimInputTranscription?.text) {
			this.options.onInputTranscript?.(
				serverContent.interimInputTranscription.text,
				false,
			)
		}

		if (serverContent?.outputTranscription?.text) {
			this.currentAssistantTranscript = serverContent.outputTranscription.text
			this.options.onOutputTranscript?.(serverContent.outputTranscription.text)
		}

		const parts = serverContent?.modelTurn?.parts ?? []
		for (const part of parts) {
			const inlineData = part.inlineData
			if (!inlineData?.data) {
				continue
			}

			if (!this.player) {
				this.player = new PcmStreamPlayer(24000)
				await this.player.start()
				this.setStatus('speaking')
			}

			this.player.enqueuePcmBase64(inlineData.data)
		}

		if (serverContent?.turnComplete) {
			if (this.currentUserTranscript.trim()) {
				this.options.onTranscriptTurn?.({
					role: 'user',
					content: this.currentUserTranscript.trim(),
				})
				this.currentUserTranscript = ''
			}
			if (this.currentAssistantTranscript.trim()) {
				this.options.onTranscriptTurn?.({
					role: 'assistant',
					content: this.currentAssistantTranscript.trim(),
				})
				this.currentAssistantTranscript = ''
			}

			this.player?.markStreamComplete()
			this.player = null
			this.setStatus('listening')
		}

		if (message.toolCall?.functionCalls?.length) {
			await this.handleToolCalls(message.toolCall.functionCalls)
		}
	}

	private async handleToolCalls(
		functionCalls: NonNullable<
			NonNullable<LiveServerMessage['toolCall']>['functionCalls']
		>,
	): Promise<void> {
		if (!this.session) {
			return
		}

		this.setStatus('thinking')
		const responses: FunctionResponse[] = []

		for (const call of functionCalls) {
			const name = call.name ?? 'unknown_tool'
			const args = (call.args ?? {}) as Record<string, unknown>
			const result = await executeAppToolCall(name, args)

			if (result.pendingDeleteConfirmation) {
				this.options.onPendingDelete?.(result.pendingDeleteConfirmation)
			}

			responses.push({
				id: call.id,
				name: result.name,
				response: result.response,
			})
		}

		this.session.sendToolResponse({ functionResponses: responses })
		this.setStatus('listening')
	}

	async stop(): Promise<void> {
		this.closed = true
		this.cleanup()
		this.session?.close()
		this.session = null
		this.setStatus('idle')
	}

	private cleanup(): void {
		this.captureStop?.()
		this.captureStop = null
		this.player?.stop()
		this.player = null
	}
}
