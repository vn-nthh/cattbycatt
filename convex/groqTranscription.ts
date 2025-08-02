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
      console.error('Groq transcription error:', error);
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Helper function to perform the actual transcription
async function performTranscription(audioBlob: ArrayBuffer, language: string): Promise<{
  text: string;
  confidence?: number;
}> {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    throw new Error("GROQ_API_KEY environment variable is not set");
  }

  try {
    // Convert ArrayBuffer to Buffer for Node.js compatibility
    const audioBuffer = Buffer.from(audioBlob);
    
    // Check file size - Use reasonable limit for Groq API
    const fileSizeInMB = audioBuffer.length / (1024 * 1024);
    console.log(`[GROQ] Audio file size: ${fileSizeInMB.toFixed(2)} MB`);
    
    if (fileSizeInMB > 25) {
      throw new Error(`Audio file too large: ${fileSizeInMB.toFixed(2)} MB. Maximum allowed: 25 MB`);
    }
    
    // Create multipart form data manually
    const boundary = `----formdata-convex-${Date.now()}`;
    const formData = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="audio.wav"',
      'Content-Type: audio/wav',
      '',
      audioBuffer.toString('binary'),
      `--${boundary}`,
      'Content-Disposition: form-data; name="model"',
      '',
      'whisper-large-v3-turbo',
      `--${boundary}`,
      'Content-Disposition: form-data; name="language"',
      '',
      language,
      `--${boundary}`,
      'Content-Disposition: form-data; name="response_format"',
      '',
      'verbose_json',
      `--${boundary}`,
      'Content-Disposition: form-data; name="temperature"',
      '',
      '0.0',
      `--${boundary}--`
    ].join('\r\n');
    
    // Make direct HTTP request to Groq API
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: Buffer.from(formData, 'binary'),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const transcription = await response.json();

    // Extract text and confidence from the response
    const text = transcription.text || '';
    
    // Calculate confidence from segments if available
    let confidence: number | undefined = undefined;
    if (transcription.segments && Array.isArray(transcription.segments) && transcription.segments.length > 0) {
      const totalLogProb = transcription.segments.reduce((acc: number, seg: any) => {
        return acc + (seg.avg_logprob || 0);
      }, 0);
      confidence = totalLogProb / transcription.segments.length;
    }

    console.log('[GROQ] Transcription result:', {
      text,
      confidence,
      segmentsCount: transcription.segments?.length || 0
    });
    
    return {
      text: text.trim(),
      confidence,
    };
  } catch (error) {
    console.error('Groq SDK error:', error);
    
    // Log more details about the error for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    throw new Error(`Groq transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

      // For Groq Whisper, all results are considered final
      return {
        ...result,
        isFinal: true,
      };
    } catch (error) {
      console.error('Groq stream transcription error:', error);
      throw error;
    }
  },
});