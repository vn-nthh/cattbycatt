import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Store a new transcription
 */
export const storeTranscription = mutation({
  args: {
    transcript: v.string(),
    translations: v.record(v.string(), v.string()),
    sourceLanguage: v.string(),
    sessionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    
    // Get the existing transcription if it exists
    const existing = await ctx.db
      .query("transcriptions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    // If it exists, update it
    if (existing) {
      await ctx.db.patch(existing._id, {
        transcript: args.transcript,
        translations: args.translations,
        sourceLanguage: args.sourceLanguage,
        timestamp,
        updatedAt: timestamp,
        // Preserve isLLMProcessed if it exists, otherwise set to false
        isLLMProcessed: existing.isLLMProcessed !== undefined ? existing.isLLMProcessed : false,
      });
    } else {
      // Otherwise, create a new one
      await ctx.db.insert("transcriptions", {
        sessionId: args.sessionId,
        transcript: args.transcript,
        translations: args.translations,
        sourceLanguage: args.sourceLanguage,
        timestamp,
        updatedAt: timestamp,
        isLLMProcessed: false,
      });
    }

    return null;
  },
});

/**
 * Get the current transcription
 */
export const getTranscription = query({
  args: {
    sessionId: v.string(),
  },
  returns: v.object({
    transcript: v.string(),
    translations: v.record(v.string(), v.string()),
    sourceLanguage: v.string(),
    timestamp: v.float64(),
  }),
  handler: async (ctx, args) => {
    // Get the existing transcription for this session
    const existing = await ctx.db
      .query("transcriptions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    // If it exists, return it
    if (existing) {
      return {
        transcript: existing.transcript,
        translations: existing.translations,
        sourceLanguage: existing.sourceLanguage || "",
        timestamp: existing.timestamp,
      };
    }

    // Otherwise, return empty values
    return {
      transcript: "",
      translations: {},
      sourceLanguage: "",
      timestamp: Date.now(),
    };
  },
}); 