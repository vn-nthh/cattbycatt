"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { Translate } from '@google-cloud/translate/build/src/v2';
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// API credentials rotation system
const API_CREDENTIALS = [
  {
    projectId: process.env.GOOGLE_PROJECT_ID_1,
    key: process.env.GOOGLE_API_KEY_1,
    charactersTranslated: 0
  },
  {
    projectId: process.env.GOOGLE_PROJECT_ID_2,
    key: process.env.GOOGLE_API_KEY_2,
    charactersTranslated: 0
  },
  {
    projectId: process.env.GOOGLE_PROJECT_ID_3,
    key: process.env.GOOGLE_API_KEY_3,
    charactersTranslated: 0
  }
];

let currentCredentialIndex = 0;
const CHAR_LIMIT = 450000;

function getNextCredentials() {
  const current = API_CREDENTIALS[currentCredentialIndex];
  
  if (current.charactersTranslated < CHAR_LIMIT && 
      current.projectId && 
      current.key) {
    return current;
  }
  
  for (let i = 1; i < API_CREDENTIALS.length; i++) {
    const nextIndex = (currentCredentialIndex + i) % API_CREDENTIALS.length;
    const next = API_CREDENTIALS[nextIndex];
    
    if (next.charactersTranslated < CHAR_LIMIT && 
        next.projectId && 
        next.key) {
      currentCredentialIndex = nextIndex;
      return next;
    }
  }
  
  // Reset character counts if all are over the limit
  for (let cred of API_CREDENTIALS) {
    cred.charactersTranslated = 0;
  }
  
  // Find the first valid credential
  for (let i = 0; i < API_CREDENTIALS.length; i++) {
    if (API_CREDENTIALS[i].projectId && API_CREDENTIALS[i].key) {
      currentCredentialIndex = i;
      return API_CREDENTIALS[i];
    }
  }
  
  return API_CREDENTIALS[0];
}

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
    useChunking: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.useGpt) {
      try {
        let prompt = "";
        
        if (args.useChunking) {
          prompt = `You are a professional translator specializing in chunked speech translation.

Instructions:
1. Analyze the text to divide it into semantically sound phrases or sentences
2. Add appropriate punctuation to set boundaries between these phrases
3. Translate the text from ${LANGUAGES[args.sourceLanguage]} to ${LANGUAGES[args.targetLanguage]}
4. ONLY mark incomplete phrases at the VERY END with [square brackets]

IMPORTANT NOTES:
- The brackets are ONLY a marker for the system to identify incomplete content
- ALL bracket characters will be REMOVED from the displayed translation
- ONLY use brackets at the very end of your translation for incomplete phrases
- DO NOT use brackets anywhere else in your translation
- The purpose of the brackets is to mark text that will be combined with the next chunk
- Avoid placing a single bracket character like '[' or ']' on its own
- Always use paired brackets [like this] when marking incomplete phrases

Original text: ${args.text}

Translate the content naturally. Remember the brackets are just system markers and will be removed before display.`;
        } else {
          prompt = `You are a professional translator. Translate the following text from ${LANGUAGES[args.sourceLanguage]} to ${LANGUAGES[args.targetLanguage]}. Maintain the original meaning and nuance, but make it sound natural in the target language:\n\n${args.text}`;
        }
        
        const response = await openai.chat.completions.create({
          model: "gpt-4.1-nano",
          messages: [{ role: "user", content: prompt }],
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
        // Fall back to Google Translate if GPT fails
        return translateWithGoogleApi(args.text, args.sourceLanguage, args.targetLanguage);
      }
    }

    return translateWithGoogleApi(args.text, args.sourceLanguage, args.targetLanguage);
  },
});

// Helper function to translate using Google API
async function translateWithGoogleApi(text: string, sourceLanguage: string, targetLanguage: string): Promise<string> {
  try {
    const credentials = getNextCredentials();
    
    if (!credentials.projectId || !credentials.key) {
      console.error('No valid API credentials available');
      return text;
    }

    const translate = new Translate({
      projectId: credentials.projectId,
      key: credentials.key
    });

    const [translation] = await translate.translate(text, {
      from: sourceLanguage,
      to: targetLanguage
    });

    credentials.charactersTranslated += text.length;
    
    return translation;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}
