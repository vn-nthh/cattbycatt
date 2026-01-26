"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

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
        try {
            return await performTranscription(args.audioBlob, args.language);
        } catch (error) {
            console.error('Deepgram transcription error:', error);
            throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },
});

// Helper function to perform the actual transcription using Deepgram Nova-3
async function performTranscription(audioBlob: ArrayBuffer, language: string): Promise<{
    text: string;
    confidence?: number;
}> {
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramApiKey) {
        throw new Error("DEEPGRAM_API_KEY environment variable is not set");
    }

    try {
        // Convert ArrayBuffer to Buffer for Node.js compatibility
        const audioBuffer = Buffer.from(audioBlob);

        // Check file size
        const fileSizeInMB = audioBuffer.length / (1024 * 1024);
        console.log(`[DEEPGRAM] Audio file size: ${fileSizeInMB.toFixed(2)} MB`);

        if (fileSizeInMB > 25) {
            throw new Error(`Audio file too large: ${fileSizeInMB.toFixed(2)} MB. Maximum allowed: 25 MB`);
        }

        // Deepgram API parameters
        // model=nova-3
        // language: en, ja, ko
        // smart_format=true (for punctuation and formatting)
        const params = new URLSearchParams({
            model: 'nova-3',
            language: language,
            smart_format: 'true',
        });

        const response = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${deepgramApiKey}`,
                'Content-Type': 'audio/wav',
            },
            body: audioBuffer,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[DEEPGRAM] API error response:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();

        // Extract text and confidence from Deepgram response
        // Response structure: results.channels[0].alternatives[0].transcript
        const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
        const confidence = result.results?.channels?.[0]?.alternatives?.[0]?.confidence;

        console.log('[DEEPGRAM] Transcription result:', {
            text: transcript,
            confidence,
        });

        return {
            text: transcript.trim(),
            confidence,
        };
    } catch (error) {
        console.error('Deepgram API error:', error);

        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }

        throw new Error(`Deepgram transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export const transcribeAudioStream = action({
    args: {
        audioBlob: v.bytes(),
        language: v.string(),
        sessionId: v.string(),
    },
    returns: v.object({
        text: v.string(),
        confidence: v.optional(v.number()),
        isFinal: v.boolean(),
    }),
    handler: async (ctx, args) => {
        try {
            const result = await performTranscription(args.audioBlob, args.language);

            // For this implementation, we treat each segment as final
            return {
                ...result,
                isFinal: true,
            };
        } catch (error) {
            console.error('Deepgram stream transcription error:', error);
            throw error;
        }
    },
});

export const getDeepgramApiKey = action({
    args: {},
    returns: v.string(),
    handler: async (ctx) => {
        const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
        if (!deepgramApiKey) {
            throw new Error("DEEPGRAM_API_KEY environment variable is not set");
        }
        return deepgramApiKey;
    },
});

