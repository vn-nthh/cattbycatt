"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const LANGUAGES: Record<string, string> = {
  en: "English",
  ja: "Japanese",
  ko: "Korean",
};

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
        
        const response = await openai.chat.completions.create({
          model: "gpt-4.1-nano",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: args.text }
          ],
          temperature: 0.3, // Lower temperature for more consistent translations
          max_tokens: 500,
        });
        
        const translation = response.choices[0].message.content;
        if (!translation) {
          throw new Error('Empty translation');
        }
        
        return translation;
      } catch (error) {
        console.error('GPT translation error:', error);
        // Fall back to OpenRouter Gemma if GPT fails
        return translateWithOpenRouter(args.text, args.sourceLanguage, args.targetLanguage);
      }
    }

    return translateWithOpenRouter(args.text, args.sourceLanguage, args.targetLanguage);
  },
});

// Helper function to translate using OpenRouter Gemma 3 4B
async function translateWithOpenRouter(text: string, sourceLanguage: string, targetLanguage: string): Promise<string> {
  try {
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      console.error('OPENROUTER_API_KEY environment variable is not set');
      return text;
    }

    // Craft prompt to prevent sentence carryover from previous prompts
    // Note: Gemma doesn't support system prompts, so we include everything in the user message
    const prompt = `Translate ONLY the following text from ${LANGUAGES[sourceLanguage]} to ${LANGUAGES[targetLanguage]}.

IMPORTANT: Do not translate any text from previous conversations or examples. Only translate the text provided below.

Text to translate: "${text}"

Translation:`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://catt-by-catt.com',
        'X-Title': 'CATT by Catt - Real-time Translation',
      },
      body: JSON.stringify({
        model: 'google/gemma-3-4b-it:free',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const result = await response.json();
    const translation = result.choices?.[0]?.message?.content;
    
    if (!translation) {
      throw new Error('Empty translation from OpenRouter');
    }

    // Clean up the translation to remove any extra text that might have been added
    const cleanedTranslation = translation.trim()
      .replace(/^Translation:\s*/i, '')
      .replace(/^["']|["']$/g, ''); // Remove surrounding quotes if present

    console.log('[OPENROUTER] Translation result:', { original: text, translation: cleanedTranslation });
    
    return cleanedTranslation;
  } catch (error) {
    console.error('OpenRouter translation error:', error);
    return text;
  }
}
