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
        // Fall back to Groq OSS 20B if GPT fails
        return translateWithGroq(args.text, args.sourceLanguage, args.targetLanguage);
      }
    }
 
    return translateWithGroq(args.text, args.sourceLanguage, args.targetLanguage);
  },
});

// Helper function to translate using Groq OpenAI OSS 20B
async function translateWithGroq(text: string, sourceLanguage: string, targetLanguage: string): Promise<string> {
  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      console.error('GROQ_API_KEY environment variable is not set');
      return text;
    }

    // Reuse the same system and user prompts as the OpenAI nano path
    const systemPrompt = `You are a professional translator. Translate the following text from ${LANGUAGES[sourceLanguage]} to ${LANGUAGES[targetLanguage]}. ${
      // No context available here, keep parity with nano path's "no context" branch
      'Maintain the original meaning and nuance, but make it sound natural in the target language.'
    } Return only the translated text with no explanations or additional content.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.3,
        top_p: 1,
        max_tokens: 500,
        stream: false
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const result = await response.json();
    const translation = result.choices?.[0]?.message?.content;
    if (!translation) {
      throw new Error('Empty translation from Groq');
    }

    // Clean
    const cleaned = String(translation).trim().replace(/^["']|["']$/g, '');
    console.log('[GROQ] Translation result:', { original: text, translation: cleaned });
    return cleaned;
  } catch (error) {
    console.error('Groq translation error:', error);
    return text;
  }
}
