"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

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
      console.error('Groq transcription error:', error);
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Build a language-native prompt from keyterms to condition Whisper
function buildKeytermPrompt(language: string, keyterms: string[]): string {
  const termsList = keyterms.join(', ');
  // Write the prompt in the source language so Whisper stays in that language
  switch (language) {
    case 'ja':
      return `キーワード：${termsList}。`;
    case 'ko':
      return `키워드: ${termsList}.`;
    case 'en':
    default:
      return `Keywords: ${termsList}.`;
  }
}

// Helper function to perform the actual transcription
async function performTranscription(audioBlob: ArrayBuffer, language: string, keyterms?: string[]): Promise<{
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
    const formDataParts = [
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
    ];

    // Add prompt from keyterms if provided
    if (keyterms && keyterms.length > 0) {
      const prompt = buildKeytermPrompt(language, keyterms);
      console.log(`[GROQ] Using initial prompt: "${prompt}"`);
      formDataParts.push(
        `--${boundary}`,
        'Content-Disposition: form-data; name="prompt"',
        '',
        prompt,
      );
    }

    formDataParts.push(`--${boundary}--`);

    const formDataBody = formDataParts.join('\r\n');

    // Make direct HTTP request to Groq API
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: Buffer.from(formDataBody, 'binary'),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const transcription = await response.json();

    // Quality filter thresholds (Whisper standard values)
    const NO_SPEECH_PROB_THRESHOLD = 0.6;
    const COMPRESSION_RATIO_THRESHOLD = 2.4;
    const AVG_LOGPROB_THRESHOLD = -1.0;

    // Filter segments by quality metrics to prevent hallucinations
    let text = transcription.text || '';
    let confidence: number | undefined = undefined;

    if (transcription.segments && Array.isArray(transcription.segments) && transcription.segments.length > 0) {
      const totalSegments = transcription.segments.length;
      const acceptedSegments: any[] = [];

      for (const seg of transcription.segments) {
        const noSpeechProb = seg.no_speech_prob ?? 0;
        const compressionRatio = seg.compression_ratio ?? 0;
        const avgLogprob = seg.avg_logprob ?? 0;

        // Check no_speech_prob — high value means likely silence/noise
        if (noSpeechProb > NO_SPEECH_PROB_THRESHOLD) {
          console.log(`[GROQ] Filtered out segment (no_speech_prob=${noSpeechProb.toFixed(3)}): "${seg.text}"`);
          continue;
        }

        // Check compression_ratio — high value means likely repetitive hallucination
        if (compressionRatio > COMPRESSION_RATIO_THRESHOLD) {
          console.log(`[GROQ] Filtered out segment (compression_ratio=${compressionRatio.toFixed(3)}): "${seg.text}"`);
          continue;
        }

        // Check avg_logprob — very low value means low-confidence hallucination
        if (avgLogprob < AVG_LOGPROB_THRESHOLD) {
          console.log(`[GROQ] Filtered out segment (avg_logprob=${avgLogprob.toFixed(3)}): "${seg.text}"`);
          continue;
        }

        acceptedSegments.push(seg);
      }

      // Reconstruct text from accepted segments only
      if (acceptedSegments.length > 0) {
        text = acceptedSegments.map((seg: any) => seg.text).join('');
        const totalLogProb = acceptedSegments.reduce((acc: number, seg: any) => acc + (seg.avg_logprob || 0), 0);
        confidence = totalLogProb / acceptedSegments.length;
      } else {
        // All segments filtered out — return empty
        text = '';
        confidence = undefined;
      }

      console.log(`[GROQ] Segment filtering: ${acceptedSegments.length}/${totalSegments} segments accepted`);
    }

    console.log('[GROQ] Transcription result:', {
      text,
      confidence,
      segmentsCount: transcription.segments?.length || 0,
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