import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Session ID for the active transcription - we'll use the same ID for all transcriptions
// to simplify the implementation
const GLOBAL_SESSION_ID = "global";

/**
 * Store a new transcription
 */
export const storeTranscription = mutation({
  args: {
    transcript: v.string(),
    translations: v.record(v.string(), v.string()),
    sourceLanguage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get the existing transcription if it exists
    const existing = await ctx.db
      .query("transcriptions")
      .withIndex("by_session", (q) => q.eq("sessionId", GLOBAL_SESSION_ID))
      .first();

    // If it exists, update it
    if (existing) {
      await ctx.db.patch(existing._id, {
        transcript: args.transcript,
        translations: args.translations,
        sourceLanguage: args.sourceLanguage,
        timestamp: Date.now(),
      });
    } else {
      // Otherwise, create a new one
      await ctx.db.insert("transcriptions", {
        sessionId: GLOBAL_SESSION_ID,
        transcript: args.transcript,
        translations: args.translations,
        sourceLanguage: args.sourceLanguage,
        timestamp: Date.now(),
      });
    }

    return null;
  },
});

/**
 * Get the current transcription
 */
export const getTranscription = query({
  args: {},
  returns: v.object({
    transcript: v.string(),
    translations: v.record(v.string(), v.string()),
    sourceLanguage: v.string(),
    timestamp: v.number(),
  }),
  handler: async (ctx) => {
    // Get the existing transcription if it exists
    const existing = await ctx.db
      .query("transcriptions")
      .withIndex("by_session", (q) => q.eq("sessionId", GLOBAL_SESSION_ID))
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