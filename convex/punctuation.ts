"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const addPunctuation = action({
  args: {
    text: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    try {
      // Early return for empty or whitespace-only text
      if (!args.text || args.text.trim().length === 0) {
        return args.text;
      }

      const systemPrompt = `You are an expert at adding punctuation to transcribed speech. Add appropriate punctuation to make text grammatically correct and readable.

RULES:
1. Add periods (.), question marks (?), exclamation marks (!), and commas (,) where appropriate
2. Never change, add, or remove words - only add punctuation
3. Create clear sentence boundaries for complete thoughts
4. If text ends mid-sentence or mid-thought, do NOT add ending punctuation
5. Capitalize the first word of each sentence
6. Use commas for natural speech pauses and list items

EXAMPLES:

Input: "the organizational structure and"
Output: "The organizational structure and"

Input: "the candidate was offered the role"
Output: "The candidate was offered the role."

Input: "we conducted extensive interviews reference checks and skill tests"
Output: "We conducted extensive interviews, reference checks, and skill tests."

Input: "according to the 2019 Harvard Business Review article about forty percent of companies have outsourced their hiring processes to external agencies this trend has been increasing"
Output: "According to the 2019 Harvard Business Review article, about forty percent of companies have outsourced their hiring processes to external agencies. This trend has been increasing"

Input: "job advertisements were widely posted on job boards and in newspapers roughly after a week of extensive interviews reference checks and skill tests the candidate was then offered the role however according to research"
Output: "Job advertisements were widely posted on job boards and in newspapers. Roughly after a week of extensive interviews, reference checks, and skill tests, the candidate was then offered the role. However, according to research"

Input: "the job evaluation process involves analyzing organizational structure determining pay scales relative to other roles and ensuring correspondence with industry standards these factors help companies maintain competitive positioning"
Output: "The job evaluation process involves analyzing organizational structure, determining pay scales relative to other roles, and ensuring correspondence with industry standards. These factors help companies maintain competitive positioning."

Return only the punctuated text with no explanations.`;

      const userPrompt = args.text.trim();
      
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1, // Very low temperature for consistent punctuation
        max_tokens: Math.max(200, args.text.length + 100), // Increased for longer responses
      });
      
      const punctuatedText = response.choices[0].message.content;
      if (!punctuatedText) {
        console.warn('Empty punctuation response, returning original text');
        return args.text;
      }
      
      console.log(`[PUNCTUATION API] Input tokens: ~${Math.ceil(userPrompt.length / 4)}`);
      console.log(`[PUNCTUATION API] Output tokens: ~${Math.ceil(punctuatedText.length / 4)}`);
      console.log(`[PUNCTUATION API] Total estimated tokens: ~${Math.ceil((userPrompt.length + punctuatedText.length) / 4)}`);
      
      return punctuatedText.trim();
    } catch (error) {
      console.error('Punctuation restoration error:', error);
      // Return original text on any error to maintain functionality
      return args.text;
    }
  },
}); 