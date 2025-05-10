# CATT by Catt - Live Speech Caption and Translation Tool

A real-time speech recognition and translation application that provides immediate text transcription and translation for multilingual communication.

## Features

- Real-time speech recognition using Web Speech API
- Instant translation into multiple languages
- Support for English, Japanese, and Korean
- Clean, responsive UI for displaying transcriptions
- OBS integration for streamers and content creators

## Project Structure

- Frontend: React/Vite application in the `src` directory
- Backend: Convex backend in the `convex` directory
- Deployed on Netlify with Convex backend

## Setup and Development

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Configure environment variables:
   - `VITE_CONVEX_URL`: Your Convex deployment URL

## Deployment

The application is configured for deployment on Netlify with routing set up for SPA support.

## Technology Stack

- React 19
- Vite
- Convex
- Web Speech API
- Tailwind CSS
- TypeScript

## License

MIT
