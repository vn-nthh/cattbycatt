"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

// Language code mapping for Gemini
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  ja: "Japanese",
  ko: "Korean",
};

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
      console.error('Gemini transcription error:', error);
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Helper function to perform the actual transcription using Gemini
async function performTranscription(audioBlob: ArrayBuffer, language: string): Promise<{
  text: string;
  confidence?: number;
}> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

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
    
    // Prepare the request body for Gemini API
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `Transcribe the following audio accurately. The audio is in ${languageName}. Return ONLY the transcribed text, nothing else. If the audio is silent or contains no speech, return an empty string.`
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
    
    // Make request to Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GEMINI] API error response:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
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
      text: text.trim(),
      confidence: undefined, // Gemini doesn't provide confidence scores
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    
    // Log more details about the error for debugging
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
  },
  returns: v.object({
    text: v.string(),
    confidence: v.optional(v.number()),
    isFinal: v.boolean(),
  }),
  handler: async (ctx, args) => {
    try {
      const result = await performTranscription(args.audioBlob, args.language);

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

