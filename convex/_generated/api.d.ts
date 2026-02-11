/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as deepgramTranscription from "../deepgramTranscription.js";
import type * as geminiE2E from "../geminiE2E.js";
import type * as geminiTranscription from "../geminiTranscription.js";
import type * as googleSttTranscription from "../googleSttTranscription.js";
import type * as groqTranscription from "../groqTranscription.js";
import type * as http from "../http.js";
import type * as router from "../router.js";
import type * as transcription from "../transcription.js";
import type * as translate from "../translate.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  deepgramTranscription: typeof deepgramTranscription;
  geminiE2E: typeof geminiE2E;
  geminiTranscription: typeof geminiTranscription;
  googleSttTranscription: typeof googleSttTranscription;
  groqTranscription: typeof groqTranscription;
  http: typeof http;
  router: typeof router;
  transcription: typeof transcription;
  translate: typeof translate;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
