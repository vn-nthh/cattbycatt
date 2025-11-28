"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

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

  console.log(`[OpenRouter] Calling model: ${model}`);

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
  console.log('[OpenRouter] Raw response:', JSON.stringify(result));
  
  const translation = result.choices?.[0]?.message?.content;
  if (!translation) {
    console.error('[OpenRouter] Empty translation in response:', result);
    throw new Error('Empty translation from OpenRouter');
  }

  const cleaned = String(translation).trim().replace(/^["']|["']$/g, '');
  console.log(`[OpenRouter] Translation complete: "${userContent}" -> "${cleaned}"`);
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
        const systemPrompt = `You are a professional translator. Translate the following text from ${LANGUAGES[args.sourceLanguage]} to ${LANGUAGES[args.targetLanguage]}. ${
          args.context
            ? `Consider this previous context for better translation: "${args.context}"\n\nNow translate the following text, maintaining consistency with the context:`
            : 'Maintain the original meaning and nuance, but make it sound natural in the target language.'
        } Return only the translated text with no explanations or additional content.`;
        
        const translation = await callOpenRouter('openai/gpt-4.1-nano', systemPrompt, args.text);
        console.log('[GPT-4.1-Nano] Translation result:', { original: args.text, translation });
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

// Helper function to translate using Gemini 2.5 Flash Lite via OpenRouter
async function translateWithGemini(text: string, sourceLanguage: string, targetLanguage: string): Promise<string> {
  try {
    console.log(`[Gemini] Starting translation: ${sourceLanguage} -> ${targetLanguage}`);
    
    const systemPrompt = `You are a professional translator. Translate the following text from ${LANGUAGES[sourceLanguage]} to ${LANGUAGES[targetLanguage]}. 
IMPORTANT: You MUST translate the text completely. Do not return the original text.
Maintain the original meaning and nuance, but make it sound natural in the target language.
Return ONLY the translated text with no explanations or additional content.`;

    const translation = await callOpenRouter('google/gemini-2.5-flash-lite', systemPrompt, text);
    
    // Check if translation is same as input (model failed to translate)
    if (translation.trim().toLowerCase() === text.trim().toLowerCase()) {
      console.warn('[Gemini] Warning: Translation appears identical to input, model may have failed');
    }
    
    console.log('[Gemini 2.5 Flash Lite] Translation result:', { original: text, translation });
    return translation;
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
