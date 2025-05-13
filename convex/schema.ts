import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  
  // Add transcription table to store current transcription data
  transcriptions: defineTable({
    // A single global entry for the active transcription
    sessionId: v.string(),
    transcript: v.string(),
    translations: v.record(v.string(), v.string()),
    sourceLanguage: v.optional(v.string()),
    timestamp: v.float64(),
    updatedAt: v.optional(v.float64()),
    isLLMProcessed: v.optional(v.boolean()),
  }).index("by_session", ["sessionId"]),
});
