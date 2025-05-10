# Live Caption & Translation System Documentation

## Overview
The Live Caption & Translation System is a powerful real-time speech-to-text and translation application that integrates with OBS Studio. It provides real-time transcription and translation capabilities, making it ideal for streamers, content creators, and multilingual presentations.

## System Requirements

### Hardware Requirements
- Microphone (built-in or external)
- Modern computer with at least 4GB RAM
- Stable internet connection

### Software Requirements
- Node.js 16 or higher
- npm (Node Package Manager)
- Modern web browser (Chrome recommended for best speech recognition)
- OBS Studio (optional, for streaming integration)

## Installation Guide

### 1. Clone the Repository
```bash
git clone [repository-url]
cd live-caption
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory with the following variables:
```
OPENAI_API_KEY=your_openai_api_key
GOOGLE_APPLICATION_CREDENTIALS=path_to_google_credentials.json
```

### 4. Local Development Setup
1. Start the development server:
```bash
npm run dev
```
This command will:
- Initialize the Convex backend
- Run the setup script
- Start both frontend and backend servers

2. Access the application:
- Frontend: http://localhost:5173
- Backend API: Running on Convex

## Running in Production

### 1. Build the Application
```bash
npm run build
```

### 2. Deploy to Production
The application can be deployed to any static hosting service (Vercel, Netlify, etc.) with the following considerations:

1. Set up environment variables in your hosting platform
2. Configure CORS settings if needed
3. Ensure the Convex backend is properly deployed

### 3. Production Environment Variables
Make sure to set these environment variables in your production environment:
- `OPENAI_API_KEY`
- `GOOGLE_APPLICATION_CREDENTIALS`
- `CONVEX_DEPLOY_KEY` (if using Convex)

## OBS Integration

### Setting Up OBS Browser Source
1. Open OBS Studio
2. Add a new Browser Source
3. Configure the source:
   - URL: `http://localhost:5173/server-export` (for local development)
   - Width: Match your scene width
   - Height: Match your scene height
   - Custom CSS: (optional) Add custom styling
   - Shutdown source when not visible: Enabled (recommended)

### Browser Source Settings
- Refresh cache of current page: Enabled
- Shutdown source when not visible: Enabled
- Control audio via OBS: Disabled (handled by the application)

## Features and Usage

### Speech Recognition
- Click "Start Listening" to begin speech recognition
- The system will automatically transcribe speech in real-time
- Supported languages: English, Japanese, Korean

### Translation
- Real-time translation to multiple languages
- Optional GPT-4 Nano integration for improved quality
- Translation delay: Typically 1-2 seconds

### UI Customization
- Text size adjustment
- Font family selection
- Color customization
- Background opacity control

## Troubleshooting

### Common Issues

1. Speech Recognition Not Working
   - Ensure microphone permissions are granted
   - Check if using a supported browser (Chrome recommended)
   - Verify microphone is properly connected

2. Translation Issues
   - Check internet connection
   - Verify API keys are properly configured
   - Ensure sufficient API quota

3. OBS Integration Problems
   - Clear browser source cache
   - Verify correct URL is set
   - Check if the application is running

### Performance Optimization
- Use hardware acceleration in OBS
- Keep the browser source dimensions minimal
- Enable "Shutdown source when not visible" in OBS

## Security Considerations

1. API Keys
   - Never commit API keys to version control
   - Use environment variables for sensitive data
   - Regularly rotate API keys

2. User Data
   - Speech data is processed locally
   - Translations are handled securely through API services
   - No permanent storage of speech data

## Support and Maintenance

### Regular Maintenance
- Keep dependencies updated
- Monitor API usage and quotas
- Regular security updates

### Getting Help
- Check the GitHub issues section
- Contact the development team
- Review the documentation

## License
This project is licensed under the MIT License. See the LICENSE file for details.

## Contributing
Contributions are welcome! Please read our contributing guidelines before submitting pull requests. 