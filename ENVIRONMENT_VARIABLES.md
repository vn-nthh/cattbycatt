# Environment Variables Configuration

This document outlines the environment variables required for the CATT by Catt application.

## Required Environment Variables

### OpenRouter API (Translation)
- **Variable Name**: `OPENROUTER_API_KEY`
- **Description**: API key for OpenRouter's unified API, used for translation services
- **Usage**: Powers both GPT-4.1 Nano and Gemini 2.5 Flash translation models
- **How to set**: `convex env set OPENROUTER_API_KEY your_openrouter_api_key_here`
- **Get API Key**: Visit [https://openrouter.ai/](https://openrouter.ai/) to obtain your API key

### Groq API (Whisper ASR)
- **Variable Name**: `GROQ_API_KEY`
- **Description**: API key for Groq's Whisper V3 Turbo transcription service
- **Usage**: Used when "Whisper" ASR model is selected for high-quality speech recognition
- **How to set**: `convex env set GROQ_API_KEY your_groq_api_key_here`
- **Get API Key**: Visit [https://console.groq.com/](https://console.groq.com/) to obtain your API key

### Google AI Studio API (Gemini ASR)
- **Variable Name**: `GEMINI_API_KEY`
- **Description**: API key for Google's Gemini 2.5 Flash model with audio transcription capabilities
- **Usage**: Used when "Gemini" ASR model is selected for speech recognition
- **How to set**: `convex env set GEMINI_API_KEY your_gemini_api_key_here`
- **Get API Key**: Visit [https://aistudio.google.com/](https://aistudio.google.com/) to obtain your API key

### Deepgram API (Nova-3 ASR)
- **Variable Name**: `DEEPGRAM_API_KEY`
- **Description**: API key for Deepgram's Nova-3 transcription service
- **Usage**: Used when "Nova-3 (Deepgram)" ASR model is selected for high-speed, accurate speech recognition
- **How to set**: `convex env set DEEPGRAM_API_KEY your_deepgram_api_key_here`
- **Get API Key**: Visit [https://console.deepgram.com/](https://console.deepgram.com/) to obtain your API key

### Google Cloud Speech-to-Text API
- **Variable Name**: `GOOGLE_STT_CREDENTIALS`
- **Description**: Service account JSON credentials for Google Cloud Speech-to-Text
- **Usage**: Used when "Google Speech-to-Text V2" ASR model is selected for high-accuracy streaming recognition
- **How to set**: 
  1. Go to [Google Cloud Console → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
  2. Create a service account with "Cloud Speech Client" role
  3. Create a JSON key for the service account
  4. Copy the entire JSON content and paste it as the value in Convex Dashboard → Settings → Environment Variables

### Google STT Streaming Proxy (Optional)
- **Variable Name**: `VITE_GOOGLE_STT_PROXY_URL`
- **Description**: WebSocket URL for the Google STT streaming proxy server
- **Usage**: Enables real-time streaming with interim results. If not set, falls back to VAD-based approach
- **How to set**: Add to `.env.local`: `VITE_GOOGLE_STT_PROXY_URL=wss://your-proxy-url.run.app`
- **Deployment**: See `google-stt-proxy/README.md` for Cloud Run deployment instructions

## Deprecated Environment Variables

### OpenAI API (Deprecated for Translation)
- **Variable Name**: `OPENAI_API_KEY`
- **Description**: Previously used for direct OpenAI API calls
- **Status**: No longer required for translation (now handled via OpenRouter)
- **Note**: May still be needed for other features if applicable

## Setting Environment Variables

To set environment variables in Convex, use the following commands:

```bash
# Set OpenRouter API key for Translation (GPT-4.1 Nano & Gemini 2.5 Flash)
convex env set OPENROUTER_API_KEY your_openrouter_api_key_here

# Set Groq API key for Whisper ASR
convex env set GROQ_API_KEY your_groq_api_key_here

# Set Gemini API key for Gemini ASR
convex env set GEMINI_API_KEY your_gemini_api_key_here

# Set Deepgram API key for Nova-3 ASR
convex env set DEEPGRAM_API_KEY your_deepgram_api_key_here

# Set Google API key for Google Speech-to-Text V2 ASR
convex env set GOOGLE_STT_API_KEY your_google_api_key_here
```

## Verification

To verify your environment variables are set correctly:

```bash
# List all environment variables
convex env list
```

## Features and API Usage

### ASR Models

Users can choose between three ASR (Automatic Speech Recognition) models:

#### 1. WebSpeech API (Default)
- **Provider**: Browser built-in
- **Requirements**: No API key required
- **Features**: Real-time streaming transcription with interim results
- **Best for**: Quick setup, no additional costs

#### 2. Whisper (Groq)
- **Model**: `whisper-large-v3-turbo`
- **Provider**: Groq
- **VAD Implementation**: MicVAD from `@ricky0123/vad-web`
- **VAD Configuration**: `preSpeechPadFrames: 10`
- **Audio Format**: WAV 16-bit PCM, 16kHz sample rate
- **Speech Detection**: Real-time voice activity detection with automatic speech segmentation
- **Benefits**: Higher accuracy than browser Web Speech API, intelligent speech boundary detection

#### 3. Gemini
- **Model**: `gemini-2.5-flash`
- **Provider**: Google AI Studio
- **VAD Implementation**: MicVAD from `@ricky0123/vad-web`
- **Audio Format**: WAV 16-bit PCM, 16kHz sample rate (sent as base64)
- **Speech Detection**: Real-time voice activity detection with automatic speech segmentation
- **Benefits**: Multimodal AI with strong language understanding, good for context-aware transcription

#### 4. Nova-3 (Deepgram)
- **Model**: `nova-3`
- **Provider**: Deepgram
- **VAD Implementation**: MicVAD from `@ricky0123/vad-web`
- **Audio Format**: WAV 16-bit PCM, 16kHz sample rate
- **Speech Detection**: Real-time voice activity detection with automatic speech segmentation
- **Benefits**: Extremely fast and accurate, supports smart formatting (punctuation, casing) out of the box.

### Translation (OpenRouter)

#### Primary Model: GPT-4.1 Nano
- **Model ID**: `openai/gpt-4.1-nano`
- **Provider**: OpenRouter
- **Features**: Context-aware translation, supports previous translation context for consistency
- **Prompting**: Conservative temperature (0.3) for consistent translations

#### Default Model: Gemini 2.5 Flash
- **Model ID**: `google/gemini-2.5-flash`
- **Provider**: OpenRouter
- **Features**: Fast, high-quality translation as the default option
- **Behavior**: Non-streaming single-shot completion with conservative temperature (0.3)
- **Fallback**: Used when GPT-4.1 Nano is not selected or encounters an error

## Migration Notes

### Recent Changes (OpenRouter Migration)
- **Removed**: Direct OpenAI API calls for translation
- **Removed**: Groq OSS-20B translation model
- **Added**: OpenRouter as unified translation provider
- **Added**: Gemini 2.5 Flash as default translation model
- **Changed**: GPT-4.1 Nano now accessed via OpenRouter instead of direct OpenAI API

### Removed Dependencies
- **Google Cloud Translate**: Removed `@google-cloud/translate` dependency
- **Google API Keys**: No longer needed:
  - `GOOGLE_PROJECT_ID_1`, `GOOGLE_PROJECT_ID_2`, `GOOGLE_PROJECT_ID_3`
  - `GOOGLE_API_KEY_1`, `GOOGLE_API_KEY_2`, `GOOGLE_API_KEY_3`

### Current Features
- **ASR Model Selection**: Users can choose between browser WebSpeech API, Groq Whisper, or Gemini for speech recognition
- **Improved Translation**: OpenRouter provides access to multiple high-quality translation models
- **Voice Activity Detection**: MicVAD (`@ricky0123/vad-web`) for precise speech boundary detection (used with Whisper and Gemini)
- **Intelligent Speech Segmentation**: Automatic detection of speech start/end with configurable pre-speech padding
