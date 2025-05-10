// Central file for Convex configuration
import { ConvexReactClient } from "convex/react";

// This ensures we're using the same client instance everywhere
export const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// Helper function to check if Convex URL is properly configured
export function isConvexConfigured(): boolean {
  try {
    return Boolean(import.meta.env.VITE_CONVEX_URL);
  } catch (e) {
    console.error("Error checking Convex configuration:", e);
    return false;
  }
} 