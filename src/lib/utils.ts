import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function ensureTransformersCacheDir(dir: string) {
  if (!dir) return
  try {
    if (typeof process !== 'undefined' && process.env) process.env.TRANSFORMERS_CACHE = dir
    if (typeof globalThis !== 'undefined') (globalThis as any).TRANSFORMERS_CACHE = dir
  } catch {}
}
