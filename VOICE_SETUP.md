# Hellas Direct Chat - Voice Integration Setup

This application now includes voice input functionality for the chat interface using Google Cloud Dialogflow CX.

## Features Added

- **Voice Input**: Click the microphone button to start voice recording
- **Speech Recognition**: Converts Greek speech to text automatically
- **Dialogflow CX Integration**: Uses the official Google Cloud SDK for better reliability
- **Visual Feedback**: Shows when the app is listening with visual indicators

## Setup Instructions

### 1. Environment Configuration

Copy the example environment file and configure your Dialogflow CX settings:

```powershell
Copy-Item .env.example .env.local
```

Edit `.env.local` with your actual values:

```env
GOOGLE_CLOUD_PROJECT_ID=your-actual-project-id
DIALOGFLOW_LOCATION=global
DIALOGFLOW_AGENT_ID=your-actual-agent-id
```

### 2. Google Cloud Service Account Setup

You need to set up authentication for Dialogflow CX. Choose one of these methods:

#### Method 1: Service Account Key (Development)
1. Create a service account in Google Cloud Console
2. Download the JSON key file
3. Add to `.env.local`:
```env
GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\your\service-account-key.json
```

#### Method 2: Inline JSON Credentials
Add the entire JSON content as a string to `.env.local`:
```env
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"..."}
```

### 3. Dialogflow CX Agent Setup

1. Create a Dialogflow CX agent in Google Cloud Console
2. Configure intents for handling Greek language queries
3. Set up flows for Accidents (AC) and Roadside Assistance (RA)
4. Note down your Project ID, Agent ID, and Location

### 4. Install Dependencies

```powershell
pnpm install
```

### 5. Run the Application

```powershell
pnpm dev
```

## Voice Feature Usage

1. **Start Voice Input**: Click the microphone button in the chat input area
2. **Grant Permissions**: Browser will request microphone access - click "Allow"
3. **Speak**: When the button turns red and shows "Ακούω... μιλήστε τώρα", start speaking in Greek
4. **Auto-transcription**: Your speech will be converted to text and appear in the input field
5. **Send Message**: The transcribed text will be sent to Dialogflow CX for processing

## Browser Compatibility

Voice input requires a modern browser with Speech Recognition API support:
- ✅ Chrome/Edge (recommended)
- ✅ Safari (with webkit prefix)
- ❌ Firefox (limited support)

## Troubleshooting

### Voice not working
- Check if your browser supports Speech Recognition
- Ensure microphone permissions are granted
- Try using Chrome or Edge browser

### Dialogflow errors
- Verify your environment variables are correct
- Check that your service account has Dialogflow API permissions
- Ensure your agent is in the correct location/region

### Connection issues
- Check your internet connection
- Verify Google Cloud billing is enabled
- Check browser console for detailed error messages

## Architecture

- **Frontend**: Next.js with React hooks for state management
- **Voice Input**: Web Speech API for speech-to-text
- **Backend**: Next.js API route handling Dialogflow CX communication
- **AI Processing**: Google Cloud Dialogflow CX for natural language understanding
