"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { getGeminiEndpoint } from "./geminiHelper";

// Strip Gemini-inserted timestamps like "00:03" or "00:03, 00:04, 00:05"
function stripTimestamps(text: string): string {
  return text.replace(/(?:\d{1,2}:\d{2}(?:,\s*)?)+/g, '').replace(/\s{2,}/g, ' ').trim();
}

// Language code mapping for Gemini
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  ja: "Japanese",
  ko: "Korean",
};

// Helper function to build transcription prompt with optional keyterms
function buildTranscriptionPrompt(languageName: string, keyterms?: string[]): string {
  let prompt = `Transcribe the following audio accurately. The audio is in ${languageName}. Return ONLY the transcribed text, nothing else. If the audio is silent or contains no speech, return an empty string. Do not add any additional text or explanation.`;

  if (keyterms && keyterms.length > 0) {
    // Security: shuffle keyterms to mitigate prompt injection
    const shuffled = [...keyterms];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    prompt += `\n\nIMPORTANT: The speaker may use the following specific terms. When you hear these words or similar-sounding words, use the exact spelling provided:\n`;
    shuffled.forEach(term => {
      prompt += `- "${term}"\n`;
    });
  }

  return prompt;
}

export const transcribeAudio = action({
  args: {
    audioBlob: v.bytes(),
    language: v.string(),
    keyterms: v.optional(v.array(v.string())),
  },
  returns: v.object({
    text: v.string(),
    confidence: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    try {
      return await performTranscription(args.audioBlob, args.language, args.keyterms);
    } catch (error) {
      console.error('Gemini transcription error:', error);
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Helper function to perform the actual transcription using Gemini
async function performTranscription(audioBlob: ArrayBuffer, language: string, keyterms?: string[]): Promise<{
  text: string;
  confidence?: number;
}> {
  try {
    // Convert ArrayBuffer to Buffer for Node.js compatibility
    const audioBuffer = Buffer.from(audioBlob);

    // Check file size
    const fileSizeInMB = audioBuffer.length / (1024 * 1024);
    console.log(`[GEMINI] Audio file size: ${fileSizeInMB.toFixed(2)} MB`);

    if (fileSizeInMB > 20) {
      throw new Error(`Audio file too large: ${fileSizeInMB.toFixed(2)} MB. Maximum allowed: 20 MB`);
    }

    // Convert audio to base64
    const audioBase64 = audioBuffer.toString('base64');

    // Get language name for the prompt
    const languageName = LANGUAGE_NAMES[language] || "English";

    // Wrap the call in a retry loop
    let lastError: Error | null = null;
    const retries = 2;

    for (let i = 0; i <= retries; i++) {
      try {
        if (i > 0) {
          const delay = 500 * i;
          await new Promise(resolve => setTimeout(resolve, delay));
          console.log(`[GEMINI] Retry ${i}/${retries} after ${delay}ms...`);
        }

        // Prepare the request body for Gemini API
        const requestBody = {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: buildTranscriptionPrompt(languageName, keyterms)
                },
                {
                  inline_data: {
                    mime_type: "audio/wav",
                    data: audioBase64
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 1024,
          }
        };

        // Make request using shared endpoint helper
        const endpoint = await getGeminiEndpoint('gemini-2.5-flash-lite');
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: endpoint.headers,
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          const result = await response.json();

          // Extract text from Gemini response
          let text = '';
          if (result.candidates && result.candidates.length > 0) {
            const candidate = result.candidates[0];
            if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
              text = candidate.content.parts[0].text || '';
            }
          }

          console.log('[GEMINI] Transcription result:', {
            text,
            candidatesCount: result.candidates?.length || 0
          });

          return {
            text: stripTimestamps(text.trim()),
            confidence: undefined, // Gemini doesn't provide confidence scores
          };
        }

        if (response.status === 503 || response.status === 429) {
          const errorText = await response.text();
          lastError = new Error(`HTTP ${response.status}: ${errorText}`);
          continue;
        }

        const errorText = await response.text();
        console.error('[GEMINI] API error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i === retries) break;
      }
    }

    throw lastError || new Error("Gemini transcription failed after retries");
  } catch (error) {
    console.error('Gemini API error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw new Error(`Gemini transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

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
    try {
      const result = await performTranscription(args.audioBlob, args.language, args.keyterms);

      // For Gemini, all results are considered final
      return {
        ...result,
        isFinal: true,
      };
    } catch (error) {
      console.error('Gemini stream transcription error:', error);
      throw error;
    }
  },
});

