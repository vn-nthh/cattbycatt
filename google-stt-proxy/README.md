# Google STT Streaming Proxy

WebSocket proxy server for Google Speech-to-Text streaming. Enables real-time speech recognition from the browser via gRPC.

## Architecture

```
Browser ──WebSocket──> This Proxy ──gRPC──> Google Speech-to-Text
```

## Local Development

```bash
cd google-stt-proxy
npm install

# Set credentials (paste your service account JSON)
export GOOGLE_STT_CREDENTIALS='{"type":"service_account",...}'

npm start
```

## Deploy to Cloud Run

### 1. Build and Push Image

```bash
# From project root
cd google-stt-proxy

# Build
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/google-stt-proxy

# Or use Docker directly
docker build -t gcr.io/YOUR_PROJECT_ID/google-stt-proxy .
docker push gcr.io/YOUR_PROJECT_ID/google-stt-proxy
```

### 2. Deploy to Cloud Run

```bash
gcloud run deploy google-stt-proxy \
  --image gcr.io/YOUR_PROJECT_ID/google-stt-proxy \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_STT_CREDENTIALS=$(cat path/to/service-account.json)"
```

### 3. Get the URL

After deployment, Cloud Run will provide a URL like:
```
https://google-stt-proxy-xxxxx.run.app
```

### 4. Update Frontend

Add to your `.env.local`:
```
VITE_GOOGLE_STT_PROXY_URL=wss://google-stt-proxy-xxxxx.run.app
```

## WebSocket Protocol

### Connection
```
wss://your-proxy-url?language=en-US
```

### Messages from Server

```json
// Ready
{ "type": "ready" }

// Result (interim or final)
{ "type": "result", "transcript": "hello world", "isFinal": false, "confidence": 0.95 }

// Error
{ "type": "error", "error": "Error message" }
```

### Messages to Server
Send raw audio data as binary WebSocket messages (WebM Opus format).
