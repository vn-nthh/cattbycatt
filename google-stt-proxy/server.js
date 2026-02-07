// Google STT V2 Streaming Proxy
const speech = require('@google-cloud/speech');
const { SpeechClient } = speech.v2;
const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;

// Parse credentials from environment variable
function getCredentials() {
    const credentialsJson = process.env.GOOGLE_STT_CREDENTIALS;
    if (!credentialsJson) {
        throw new Error('GOOGLE_STT_CREDENTIALS environment variable is not set');
    }

    // Debug: log first 100 chars to see what we're getting
    console.log('[PROXY] Credentials string starts with:', credentialsJson.substring(0, 100));
    console.log('[PROXY] Credentials string length:', credentialsJson.length);

    // Handle case where JSON might be double-quoted or wrapped
    let jsonToParse = credentialsJson;
    if (credentialsJson.startsWith('"') && credentialsJson.endsWith('"')) {
        console.log('[PROXY] Detected outer quotes, removing...');
        jsonToParse = credentialsJson.slice(1, -1).replace(/\\"/g, '"');
    }

    return JSON.parse(jsonToParse);
}

// Create HTTP server
const server = http.createServer((req, res) => {
    // Health check endpoint for Cloud Run
    if (req.url === '/health') {
        res.writeHead(200);
        res.end('OK');
        return;
    }
    res.writeHead(404);
    res.end('Not Found');
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
    console.log('[PROXY] New WebSocket connection');

    // Parse language and keyterms from query params
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const language = url.searchParams.get('language') || 'en-US';
    const keyterms = url.searchParams.getAll('keyterms');

    console.log(`[PROXY] Language: ${language}`);
    if (keyterms.length > 0) {
        console.log(`[PROXY] Keyterms: ${keyterms.join(', ')}`);
    }

    let speechClient;
    let recognizeStream;

    try {
        // Initialize V2 Speech client with credentials
        const credentials = getCredentials();
        const projectId = credentials.project_id;
        speechClient = new SpeechClient({ credentials });

        // Build V2 adaptation config with per-phrase boost
        let adaptation = undefined;
        if (keyterms.length > 0) {
            adaptation = {
                phraseSets: [{
                    inlinePhraseSet: {
                        phrases: keyterms.map(term => ({
                            value: term,
                            boost: 20  // Maximum boost per phrase
                        }))
                    }
                }]
            };
            console.log('[PROXY] Adaptation config:', JSON.stringify(adaptation, null, 2));
        }

        // V2 streaming config
        const streamingConfig = {
            config: {
                autoDecodingConfig: {},  // Auto-detect encoding
                languageCodes: [language],
                model: 'latest_long',
                features: {
                    enableAutomaticPunctuation: true,
                },
                ...(adaptation && { adaptation }),
            },
            streamingFeatures: {
                interimResults: true,
            },
        };

        // Create the V2 streaming request
        // V2 uses _streamingRecognize and requires config as first write
        recognizeStream = speechClient._streamingRecognize()
            .on('error', (error) => {
                console.error('[PROXY] gRPC stream error:', error.message);
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        error: error.message
                    }));
                }
            })
            .on('data', (data) => {
                if (data.results && data.results.length > 0) {
                    const result = data.results[0];
                    const alternative = result.alternatives && result.alternatives[0];

                    if (alternative) {
                        const response = {
                            type: 'result',
                            transcript: alternative.transcript || '',
                            isFinal: result.isFinal || false,
                            confidence: alternative.confidence,
                        };

                        console.log('[PROXY] Result:', response.isFinal ? 'FINAL' : 'interim', response.transcript.substring(0, 50));

                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify(response));
                        }
                    }
                }
            })
            .on('end', () => {
                console.log('[PROXY] gRPC stream ended');
            });

        // Send V2 config as first message (required for V2)
        recognizeStream.write({
            recognizer: `projects/${projectId}/locations/global/recognizers/_`,
            streamingConfig: streamingConfig,
        });

        console.log('[PROXY] V2 gRPC stream created with config');

    } catch (error) {
        console.error('[PROXY] Failed to initialize:', error.message);
        ws.send(JSON.stringify({ type: 'error', error: error.message }));
        ws.close();
        return;
    }

    // Handle incoming audio data from browser
    ws.on('message', (data) => {
        if (recognizeStream && !recognizeStream.destroyed) {
            // Write audio data to gRPC stream (V2 format)
            recognizeStream.write({ audio: data });
        }
    });

    // Handle WebSocket close
    ws.on('close', () => {
        console.log('[PROXY] WebSocket closed');
        if (recognizeStream && !recognizeStream.destroyed) {
            recognizeStream.end();
        }
    });

    // Handle WebSocket errors
    ws.on('error', (error) => {
        console.error('[PROXY] WebSocket error:', error.message);
        if (recognizeStream && !recognizeStream.destroyed) {
            recognizeStream.end();
        }
    });

    // Send ready message
    ws.send(JSON.stringify({ type: 'ready' }));
});

// Start server
server.listen(PORT, () => {
    console.log(`[PROXY] Google STT V2 Streaming Proxy running on port ${PORT}`);
});
