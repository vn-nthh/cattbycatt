"use node";

import { GoogleAuth } from 'google-auth-library';

// ============================================================================
// Shared Gemini/Vertex AI endpoint helper
// ============================================================================
//
// If VERTEX_AI_CREDENTIALS is set, uses Vertex AI endpoint with service account auth.
// Otherwise, falls back to GEMINI_API_KEY with the direct Gemini API.
//
// Required env vars for Vertex AI:
//   VERTEX_AI_CREDENTIALS  — JSON service account key (string)
//   VERTEX_AI_LOCATION     — Optional, defaults to "us-central1"
//
// Required env vars for direct Gemini API:
//   GEMINI_API_KEY         — API key
// ============================================================================

const DEFAULT_MODEL = 'gemini-2.5-flash-lite';
const DEFAULT_LOCATION = 'us-central1';

// Cache for GoogleAuth instance (reused across calls within the same action)
let _authClient: GoogleAuth | null = null;

function getAuthClient(credentials: object): GoogleAuth {
    if (!_authClient) {
        _authClient = new GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });
    }
    return _authClient;
}

export interface GeminiEndpoint {
    url: string;
    headers: Record<string, string>;
}

/**
 * Get the correct Gemini API endpoint and auth headers.
 * Prefers Vertex AI if VERTEX_AI_CREDENTIALS is set.
 */
export async function getGeminiEndpoint(model: string = DEFAULT_MODEL): Promise<GeminiEndpoint> {
    const vertexCredentials = process.env.VERTEX_AI_CREDENTIALS;

    if (vertexCredentials) {
        // --- Vertex AI path ---
        try {
            const creds = JSON.parse(vertexCredentials);
            const projectId = creds.project_id;
            if (!projectId) {
                throw new Error("VERTEX_AI_CREDENTIALS missing project_id");
            }

            const location = process.env.VERTEX_AI_LOCATION || DEFAULT_LOCATION;
            const auth = getAuthClient(creds);
            const client = await auth.getClient();
            const tokenResponse = await client.getAccessToken();
            const accessToken = tokenResponse.token;

            if (!accessToken) {
                throw new Error("Failed to get Vertex AI access token");
            }

            const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

            console.log(`[GEMINI] Using Vertex AI endpoint (${location})`);

            return {
                url,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
            };
        } catch (error) {
            console.warn(`[GEMINI] Vertex AI credentials failed, falling back to API key:`, error instanceof Error ? error.message : error);
            // Fall through to API key
        }
    }

    // --- Direct Gemini API path ---
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Neither VERTEX_AI_CREDENTIALS nor GEMINI_API_KEY is set");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    return {
        url,
        headers: {
            'Content-Type': 'application/json',
        },
    };
}
