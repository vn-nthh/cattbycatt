"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

// Import V2 SpeechClient
const speech = require('@google-cloud/speech');
const { SpeechClient } = speech.v2;

// Helper to get credentials from environment
function getCredentials(): { credentials: object; projectId: string } {
    const credentialsJson = process.env.GOOGLE_STT_CREDENTIALS;
    if (!credentialsJson) {
        throw new Error("GOOGLE_STT_CREDENTIALS environment variable is not set");
    }

    try {
        const credentials = JSON.parse(credentialsJson);
        return {
            credentials,
            projectId: credentials.project_id || '',
        };
    } catch (error) {
        throw new Error(`Failed to parse GOOGLE_STT_CREDENTIALS: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }
}

// Helper to get authenticated V2 Speech client
function getSpeechClientV2() {
    const { credentials } = getCredentials();
    return new SpeechClient({ credentials });
}

// VAD-based stream transcription using V2 API (used with MicVAD)
export const transcribeAudioStream = action({
    args: {
        audioBlob: v.bytes(),
        language: v.string(),
        sessionId: v.string(),
        keyterms: v.optional(v.array(v.string())),
    },
    returns: v.object({
        text: v.string(),
        confidence: v.optional(v.number()),
        isFinal: v.boolean(),
    }),
    handler: async (ctx, args) => {
        const { credentials, projectId } = getCredentials();
        const client = new SpeechClient({ credentials });

        // Map language code
        const languageCodeMap: Record<string, string> = {
            'en': 'en-US',
            'ja': 'ja-JP',
            'ko': 'ko-KR',
        };
        const languageCode = languageCodeMap[args.language] || 'en-US';

        const audioBuffer = Buffer.from(args.audioBlob);

        console.log(`[GOOGLE_STT_V2] Stream audio size: ${(audioBuffer.length / 1024).toFixed(2)} KB`);
        console.log(`[GOOGLE_STT_V2] Keyterms received:`, args.keyterms);

        // Build V2 adaptation config with per-phrase boost
        let adaptation = undefined;
        if (args.keyterms && args.keyterms.length > 0) {
            adaptation = {
                phraseSets: [{
                    inlinePhraseSet: {
                        phrases: args.keyterms.map(term => ({
                            value: term,
                            boost: 20  // Maximum boost per phrase
                        }))
                    }
                }]
            };
            console.log(`[GOOGLE_STT_V2] Adaptation config:`, JSON.stringify(adaptation, null, 2));
        }

        // V2 API config
        const config = {
            autoDecodingConfig: {},  // Auto-detect encoding
            languageCodes: [languageCode],
            model: 'latest_short',  // Use short model for VAD-based short audio segments
            features: {
                enableAutomaticPunctuation: true,
                diarization: {
                    minSpeakerCount: 1,
                    maxSpeakerCount: 6,
                },
            },
            ...(adaptation && { adaptation }),
        };

        // V2 API request
        const request = {
            recognizer: `projects/${projectId}/locations/global/recognizers/_`,
            config,
            content: audioBuffer,
        };

        try {
            const [response] = await client.recognize(request);

            let transcript = '';
            let confidence: number | undefined;

            if (response.results) {
                for (const result of response.results) {
                    if (result.alternatives && result.alternatives.length > 0) {
                        transcript += result.alternatives[0].transcript || '';
                        if (confidence === undefined) {
                            confidence = result.alternatives[0].confidence || undefined;
                        }
                    }
                }
            }

            console.log('[GOOGLE_STT_V2] Stream result:', { text: transcript, confidence });

            return {
                text: transcript.trim(),
                confidence,
                isFinal: true,
            };
        } catch (error) {
            console.error('[GOOGLE_STT_V2] Error:', error);
            throw error;
        }
    },
});

// Simple single-chunk transcription (fallback) - V2 API
export const transcribeAudio = action({
    args: {
        audioBlob: v.bytes(),
        language: v.string(),
    },
    returns: v.object({
        text: v.string(),
        confidence: v.optional(v.number()),
    }),
    handler: async (ctx, args) => {
        const { credentials, projectId } = getCredentials();
        const client = new SpeechClient({ credentials });

        // Map language code
        const languageCodeMap: Record<string, string> = {
            'en': 'en-US',
            'ja': 'ja-JP',
            'ko': 'ko-KR',
        };
        const languageCode = languageCodeMap[args.language] || 'en-US';

        const audioBuffer = Buffer.from(args.audioBlob);

        console.log(`[GOOGLE_STT_V2] Audio size: ${(audioBuffer.length / 1024).toFixed(2)} KB`);

        const config = {
            autoDecodingConfig: {},
            languageCodes: [languageCode],
            model: 'long',
        };

        const request = {
            recognizer: `projects/${projectId}/locations/global/recognizers/_`,
            config,
            content: audioBuffer,
        };

        const [response] = await client.recognize(request);

        let transcript = '';
        let confidence: number | undefined;

        if (response.results) {
            for (const result of response.results) {
                if (result.alternatives && result.alternatives.length > 0) {
                    transcript += result.alternatives[0].transcript || '';
                    if (confidence === undefined) {
                        confidence = result.alternatives[0].confidence || undefined;
                    }
                }
            }
        }

        console.log('[GOOGLE_STT_V2] Result:', { text: transcript, confidence });

        return {
            text: transcript.trim(),
            confidence,
        };
    },
});

// Get access token for browser-based operations
export const getAccessToken = action({
    args: {},
    returns: v.object({
        accessToken: v.string(),
        projectId: v.string(),
    }),
    handler: async (ctx) => {
        const { credentials, projectId } = getCredentials();
        const client = new SpeechClient({ credentials });

        const authClient = await client.auth.getClient();
        const tokenResponse = await authClient.getAccessToken();

        if (!tokenResponse.token) {
            throw new Error("Failed to get access token");
        }

        return {
            accessToken: tokenResponse.token,
            projectId,
        };
    },
});
