# Environment Variables Configuration

This document outlines the environment variables required for the CATT by Catt application.

## Required Environment Variables

### Groq API (Advanced ASR)
- **Variable Name**: `GROQ_API_KEY`
- **Description**: API key for Groq's Whisper V3 Turbo transcription service
- **Usage**: Used when "Use Advanced ASR" is enabled for high-quality speech recognition
- **How to set**: `convex env set GROQ_API_KEY your_groq_api_key_here`
- **Get API Key**: Visit [https://console.groq.com/](https://console.groq.com/) to obtain your API key

### OpenRouter API (Translation)
- **Variable Name**: `OPENROUTER_API_KEY`
- **Description**: API key for OpenRouter's Gemma 3 4B translation service
- **Usage**: Used as the default translation service (replaces Google Translate)
- **How to set**: `convex env set OPENROUTER_API_KEY your_openrouter_api_key_here`
- **Get API Key**: Visit [https://openrouter.ai/](https://openrouter.ai/) to obtain your API key

### OpenAI API (Fallback & Punctuation)
- **Variable Name**: `OPENAI_API_KEY`
- **Description**: API key for OpenAI's GPT models
- **Usage**: Used for GPT-4 Nano translation (when enabled) and punctuation processing
- **How to set**: `convex env set OPENAI_API_KEY your_openai_api_key_here`
- **Get API Key**: Visit [https://platform.openai.com/](https://platform.openai.com/) to obtain your API key

## Setting Environment Variables

To set environment variables in Convex, use the following commands:

```bash
# Set Groq API key for Advanced ASR
convex env set GROQ_API_KEY your_groq_api_key_here

# Set OpenRouter API key for translation
convex env set OPENROUTER_API_KEY your_openrouter_api_key_here

# Set OpenAI API key for GPT features
convex env set OPENAI_API_KEY your_openai_api_key_here
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

### Translation (OpenRouter Gemma 3 4B)
- **Model**: `google/gemma-3-4b-it:free`
- **Features**: Free tier available, good translation quality
- **Special Handling**: Prompts designed to prevent sentence carryover from previous translations
- **Fallback**: Falls back to OpenAI GPT-4 Nano when "Use GPT-4 Nano for translation" is enabled

### Punctuation Processing (OpenAI GPT-4 Nano)
- **Model**: `gpt-4.1-nano`
- **Usage**: Adds punctuation to streaming transcribed speech
- **Features**: Conservative punctuation, handles incomplete sentences

## Migration Notes

### Removed Dependencies
- **Google Cloud Translate**: Removed `@google-cloud/translate` dependency
- **Google API Keys**: No longer needed:
  - `GOOGLE_PROJECT_ID_1`, `GOOGLE_PROJECT_ID_2`, `GOOGLE_PROJECT_ID_3`
  - `GOOGLE_API_KEY_1`, `GOOGLE_API_KEY_2`, `GOOGLE_API_KEY_3`

### New Features
- **Advanced ASR Toggle**: Users can now choose between browser Web Speech API and Groq Whisper with MicVAD
- **Improved Translation**: OpenRouter Gemma 3 4B provides better translation quality
- **Voice Activity Detection**: MicVAD (`@ricky0123/vad-web`) for precise speech boundary detection
- **Intelligent Speech Segmentation**: Automatic detection of speech start/end with configurable pre-speech padding