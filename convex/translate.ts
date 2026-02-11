"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

// Strip Gemini-inserted timestamps like "00:03" or "00:03, 00:04, 00:05"
function stripTimestamps(text: string): string {
  return text.replace(/(?:\d{1,2}:\d{2}(?:,\s*)?)+/g, '').replace(/\s{2,}/g, ' ').trim();
}

const LANGUAGES: Record<string, string> = {
  en: "English",
  ja: "Japanese",
  ko: "Korean",
};

// Helper function to call OpenRouter API
async function callOpenRouter(model: string, systemPrompt: string, userContent: string): Promise<string> {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterApiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }


  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://catt-by-catt.netlify.app',
      'X-Title': 'CATT by Catt',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[OpenRouter] API error:', response.status, errorText);
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  const translation = result.choices?.[0]?.message?.content;
  if (!translation) {
    console.error('[OpenRouter] Empty translation in response:', result);
    throw new Error('Empty translation from OpenRouter');
  }

  const cleaned = String(translation).trim().replace(/^["']|["']$/g, '');
  return cleaned;
}

export const translateText = action({
  args: {
    text: v.string(),
    sourceLanguage: v.string(),
    targetLanguage: v.string(),
    useGpt: v.boolean(),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.useGpt) {
      try {
        const systemPrompt = `You are a professional translator. Translate the following text from ${LANGUAGES[args.sourceLanguage]} to ${LANGUAGES[args.targetLanguage]}. ${args.context
          ? `Consider this previous context for better translation: "${args.context}"\n\nNow translate the following text, maintaining consistency with the context:`
          : 'Maintain the original meaning and nuance, but make it sound natural in the target language.'
          } Return only the translated text with no explanations or additional content.`;

        const translation = await callOpenRouter('openai/gpt-4.1-nano', systemPrompt, args.text);
        return translation;
      } catch (error) {
        console.error('GPT translation error:', error);
        // Fall back to Gemini 2.5 Flash Lite if GPT fails
        return translateWithGemini(args.text, args.sourceLanguage, args.targetLanguage);
      }
    }

    return translateWithGemini(args.text, args.sourceLanguage, args.targetLanguage);
  },
});

// ============================================================================
// Translation Denial Filter
// ============================================================================
// Detects when Gemini returns leaked prompt text instead of a real translation.
// This happens most often with short Japanese inputs where the model translates
// the English system prompt into Japanese and appends the input at the end.

// English prompt fragments that should never appear in a valid translation
const PROMPT_LEAK_EN = [
  'professional translator',
  'translate the following',
  'return only',
  'no explanations',
  'additional content',
  'target language',
  'source language',
  'original meaning',
];

// Japanese translations of prompt fragments (the exact failure mode)
const PROMPT_LEAK_JA = [
  '翻訳する必要があります',
  '元のテキストを返さないでください',
  'ターゲット言語',
  '翻訳されたテキストのみ',
  '説明や追加コンテンツなし',
  '元の意味とニュアンス',
  'プロの翻訳者',
];

// Korean translations of prompt fragments (preventive)
const PROMPT_LEAK_KO = [
  '전문 번역가',
  '원본 텍스트를 반환하지',
  '대상 언어',
  '번역된 텍스트만',
  '설명이나 추가 콘텐츠 없이',
];

function isTranslationDenial(input: string, output: string): { denied: boolean; reason: string } {
  const outputLower = output.toLowerCase();

  // Check for English prompt leakage
  for (const fragment of PROMPT_LEAK_EN) {
    if (outputLower.includes(fragment)) {
      return { denied: true, reason: `EN prompt leak: "${fragment}"` };
    }
  }

  // Check for Japanese prompt leakage
  for (const fragment of PROMPT_LEAK_JA) {
    if (output.includes(fragment)) {
      return { denied: true, reason: `JA prompt leak: "${fragment}"` };
    }
  }

  // Check for Korean prompt leakage
  for (const fragment of PROMPT_LEAK_KO) {
    if (output.includes(fragment)) {
      return { denied: true, reason: `KO prompt leak: "${fragment}"` };
    }
  }

  // Length ratio check: if input is short (≤10 chars) but output is very long (>5x input),
  // it's likely prompt leakage
  if (input.length <= 10 && output.length > input.length * 5 && output.length > 30) {
    return { denied: true, reason: `Suspicious length ratio: input=${input.length}, output=${output.length}` };
  }

  // Identity check: output is identical to input
  if (output.toLowerCase() === input.trim().toLowerCase()) {
    return { denied: true, reason: 'Output identical to input' };
  }

  return { denied: false, reason: '' };
}

// ============================================================================
// Gemini Translation (with systemInstruction + denial filter)
// ============================================================================

async function callGeminiTranslate(
  text: string,
  systemPrompt: string,
  geminiApiKey: string
): Promise<string> {
  let lastError: Error | null = null;
  const retries = 2;

  for (let i = 0; i <= retries; i++) {
    try {
      if (i > 0) {
        const delay = 500 * i;
        await new Promise(resolve => setTimeout(resolve, delay));
        console.log(`[Gemini] Retry ${i}/${retries} after ${delay}ms...`);
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            contents: [
              {
                parts: [{ text: text }]
              }
            ],
            generationConfig: {
              temperature: 0.3,
              topP: 0.8,
              topK: 40,
              maxOutputTokens: 500,
            }
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();

        let translation = '';
        if (result.candidates && result.candidates.length > 0) {
          const candidate = result.candidates[0];
          if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            translation = candidate.content.parts[0].text || '';
          }
        }

        if (!translation) {
          throw new Error('Empty translation from Gemini');
        }

        return stripTimestamps(translation.trim());
      }

      if (response.status === 503 || response.status === 429) {
        const errorText = await response.text();
        lastError = new Error(`HTTP ${response.status}: ${errorText}`);
        continue;
      }

      const errorText = await response.text();
      console.error('[Gemini] API error response:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i === retries) break;
    }
  }

  throw lastError || new Error("Gemini translation failed after retries");
}

// Helper function to translate using Gemini 2.5 Flash Lite directly
async function translateWithGemini(text: string, sourceLanguage: string, targetLanguage: string): Promise<string> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const primaryPrompt = `Translate ${LANGUAGES[sourceLanguage]} to ${LANGUAGES[targetLanguage]}. Output ONLY the translation, nothing else.`;
  const retryPrompt = `Translate to ${LANGUAGES[targetLanguage]}: ${text}`;

  try {
    // Primary attempt with systemInstruction separation
    const result = await callGeminiTranslate(text, primaryPrompt, geminiApiKey);
    const denial = isTranslationDenial(text, result);

    if (!denial.denied) {
      return result;
    }

    // Denial detected — retry with minimal prompt
    console.warn(`[Gemini] Translation denial detected (${denial.reason}). Input: "${text}", Output: "${result}". Retrying...`);

    try {
      const retryResult = await callGeminiTranslate(text, retryPrompt, geminiApiKey);
      const retryDenial = isTranslationDenial(text, retryResult);

      if (!retryDenial.denied) {
        console.log(`[Gemini] Retry succeeded: "${retryResult}"`);
        return retryResult;
      }

      console.warn(`[Gemini] Retry also denied (${retryDenial.reason}). Returning original text.`);
      return text;
    } catch (retryError) {
      console.error('[Gemini] Retry failed:', retryError instanceof Error ? retryError.message : retryError);
      return text;
    }
  } catch (error) {
    console.error('[Gemini] Translation error:', error instanceof Error ? error.message : error);
    return text;
  }
}

// ============================================================================
// DEPRECATED: Groq OSS-20B Translation (kept for reference)
// ============================================================================
// async function translateWithGroq(text: string, sourceLanguage: string, targetLanguage: string): Promise<string> {
//   try {
//     const groqApiKey = process.env.GROQ_API_KEY;
//     if (!groqApiKey) {
//       console.error('GROQ_API_KEY environment variable is not set');
//       return text;
//     }
//
//     // Reuse the same system and user prompts as the OpenAI nano path
//     const systemPrompt = `You are a professional translator. Translate the following text from ${LANGUAGES[sourceLanguage]} to ${LANGUAGES[targetLanguage]}. ${
//       // No context available here, keep parity with nano path's "no context" branch
//       'Maintain the original meaning and nuance, but make it sound natural in the target language.'
//     } Return only the translated text with no explanations or additional content.`;
//
//     const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${groqApiKey}`,
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         model: 'openai/gpt-oss-20b',
//         messages: [
//           { role: 'system', content: systemPrompt },
//           { role: 'user', content: text }
//         ],
//         temperature: 0.3,
//         top_p: 1,
//         reasoning_effort: "low",
//         max_tokens: 500,
//         stream: false
//       }),
//     });
//
//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error('Groq API error:', response.status, errorText);
//       throw new Error(`Groq API error: ${response.status}`);
//     }
//
//     const result = await response.json();
//     const translation = result.choices?.[0]?.message?.content;
//     if (!translation) {
//       throw new Error('Empty translation from Groq');
//     }
//
//     // Clean
//     const cleaned = String(translation).trim().replace(/^["']|["']$/g, '');
//     console.log('[GROQ] Translation result:', { original: text, translation: cleaned });
//     return cleaned;
//   } catch (error) {
//     console.error('Groq translation error:', error);
//     return text;
//   }
// }
