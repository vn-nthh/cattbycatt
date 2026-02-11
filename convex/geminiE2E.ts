"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

// Strip Gemini-inserted timestamps like "00:03" or "00:03, 00:04, 00:05"
function stripTimestamps(text: string): string {
    return text.replace(/(?:\d{1,2}:\d{2}(?:,\s*)?)+/g, '').replace(/\s{2,}/g, ' ').trim();
}

// Language code mapping
const LANGUAGE_NAMES: Record<string, string> = {
    en: "English",
    ja: "Japanese",
    ko: "Korean",
};

// Helper: call Gemini with audio + a system prompt (with retry logic)
async function callGeminiWithAudio(
    audioBase64: string,
    systemPrompt: string,
    geminiApiKey: string,
    maxTokens: number = 1024,
    retries: number = 2
): Promise<string> {
    let lastError: Error | null = null;

    for (let i = 0; i <= retries; i++) {
        try {
            if (i > 0) {
                const delay = 500 * i; // 500ms, 1000ms
                await new Promise(resolve => setTimeout(resolve, delay));
                console.log(`[GEMINI-E2E] Retry ${i}/${retries} after ${delay}ms...`);
            }

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        systemInstruction: { parts: [{ text: systemPrompt }] },
                        contents: [{
                            parts: [{
                                inline_data: { mime_type: "audio/wav", data: audioBase64 }
                            }]
                        }],
                        generationConfig: {
                            temperature: 0.2,
                            topP: 0.8,
                            topK: 40,
                            maxOutputTokens: maxTokens,
                        }
                    }),
                }
            );

            if (response.ok) {
                const result = await response.json();
                const raw = (result.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
                return stripTimestamps(raw);
            }

            if (response.status === 503 || response.status === 429) {
                const errorText = await response.text();
                lastError = new Error(`HTTP ${response.status}: ${errorText}`);
                continue; // Retry
            }

            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (i === retries) break;
            // Continue to retry for network errors too
        }
    }

    throw lastError || new Error("Unknown error during Gemini call");
}

// Build transcription prompt with optional keyterms
function buildTranscriptionPrompt(languageName: string, keyterms?: string[]): string {
    let prompt = `Transcribe the following audio accurately. The audio is in ${languageName}. Return ONLY the transcribed text, nothing else. If the audio is silent or contains no speech, return an empty string.`;

    if (keyterms && keyterms.length > 0) {
        const shuffled = [...keyterms];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        prompt += `\n\nIMPORTANT: The speaker may use the following specific terms. When you hear these words or similar-sounding words, use the exact spelling provided:\n`;
        shuffled.forEach(term => { prompt += `- "${term}"\n`; });
    }

    return prompt;
}

export const transcribeAndTranslate = action({
    args: {
        audioBlob: v.bytes(),
        sourceLanguage: v.string(),
        sessionId: v.string(),
        keyterms: v.optional(v.array(v.string())),
    },
    returns: v.object({
        transcript: v.string(),
        translations: v.any(),
    }),
    handler: async (ctx, args) => {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
            throw new Error("GEMINI_API_KEY environment variable is not set");
        }

        try {
            const audioBuffer = Buffer.from(args.audioBlob);
            const fileSizeInMB = audioBuffer.length / (1024 * 1024);
            console.log(`[GEMINI-E2E] Audio: ${fileSizeInMB.toFixed(2)} MB`);

            if (fileSizeInMB > 20) {
                throw new Error(`Audio too large: ${fileSizeInMB.toFixed(2)} MB`);
            }

            const audioBase64 = audioBuffer.toString('base64');
            const sourceName = LANGUAGE_NAMES[args.sourceLanguage] || "English";
            const targetLanguages = Object.keys(LANGUAGE_NAMES).filter(l => l !== args.sourceLanguage);

            // Fire ALL 3 requests in parallel — each gets the audio directly
            const [transcript, ...translationResults] = await Promise.all([
                // Request 1: Audio → Transcription
                callGeminiWithAudio(
                    audioBase64,
                    buildTranscriptionPrompt(sourceName, args.keyterms),
                    geminiApiKey
                ),
                // Request 2+: Audio → Translation (one per target language)
                ...targetLanguages.map(async (lang, index) => {
                    // Stagger requests by 50ms to avoid simultaneous bursts
                    await new Promise(resolve => setTimeout(resolve, index * 50));

                    let translationPrompt = `Listen to the audio in ${sourceName} and translate what is said into ${LANGUAGE_NAMES[lang]}. Output ONLY the translation, nothing else. If the audio is silent, return an empty string.`;

                    if (args.keyterms && args.keyterms.length > 0) {
                        translationPrompt += `\n\nThe speaker may mention the following terms: ${args.keyterms.map(t => `"${t}"`).join(', ')}.`;
                    }

                    return callGeminiWithAudio(audioBase64, translationPrompt, geminiApiKey, 500);
                }),
            ]);

            // Build translations map
            const translations: Record<string, string> = {};
            targetLanguages.forEach((lang, i) => {
                translations[lang] = translationResults[i];
            });

            console.log('[GEMINI-E2E] Result:', { transcript, translations });
            return { transcript, translations };
        } catch (error) {
            console.error('[GEMINI-E2E] Error:', error instanceof Error ? error.message : error);
            throw new Error(`Gemini E2E failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },
});
