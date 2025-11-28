# Environment Variables Configuration

This document outlines the environment variables required for the CATT by Catt application.

## Required Environment Variables

### OpenRouter API (Translation)
- **Variable Name**: `OPENROUTER_API_KEY`
- **Description**: API key for OpenRouter's unified API, used for translation services
- **Usage**: Powers both GPT-4.1 Nano and Gemini 2.5 Flash translation models
- **How to set**: `convex env set OPENROUTER_API_KEY your_openrouter_api_key_here`
- **Get API Key**: Visit [https://openrouter.ai/](https://openrouter.ai/) to obtain your API key

### Groq API (Advanced ASR)
- **Variable Name**: `GROQ_API_KEY`
- **Description**: API key for Groq's Whisper V3 Turbo transcription service
- **Usage**: Used when "Use Advanced ASR" is enabled for high-quality speech recognition
- **How to set**: `convex env set GROQ_API_KEY your_groq_api_key_here`
- **Get API Key**: Visit [https://console.groq.com/](https://console.groq.com/) to obtain your API key

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

# Set Groq API key for Advanced ASR
convex env set GROQ_API_KEY your_groq_api_key_here
```

## Verification

To verify your environment variables are set correctly:

```bash
# List all environment variables
convex env list
```

## Features and API Usage

### Advanced ASR (Groq Whisper V3 Turbo with MicVAD)
- **Model**: `whisper-large-v3-turbo`
- **VAD Implementation**: MicVAD from `@ricky0123/vad-web`
- **VAD Configuration**: `preSpeechPadFrames: 10` (as requested)
- **Audio Format**: WAV 16-bit PCM, 16kHz sample rate
- **Speech Detection**: Real-time voice activity detection with automatic speech segmentation
- **Benefits**: Higher accuracy than browser Web Speech API, intelligent speech boundary detection

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
- **Advanced ASR Toggle**: Users can choose between browser Web Speech API and Groq Whisper with MicVAD
- **Improved Translation**: OpenRouter provides access to multiple high-quality translation models
- **Voice Activity Detection**: MicVAD (`@ricky0123/vad-web`) for precise speech boundary detection
- **Intelligent Speech Segmentation**: Automatic detection of speech start/end with configurable pre-speech padding
