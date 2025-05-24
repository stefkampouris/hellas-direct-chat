# Dialogflow ES Integration Setup Guide

## Environment Variables

You need to set up the following environment variables in your `.env.local` file:

### Required Variables

```bash
# Your Google Cloud Project ID (same as your Dialogflow project ID)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
# Alternative name for the same variable (either one works)
DIALOGFLOW_PROJECT_ID=your-project-id
```

### Authentication Options

Choose ONE of the following authentication methods:

#### Option 1: Service Account JSON (Recommended for development)
```bash
# Put your entire service account JSON as a string (escape quotes properly)
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

#### Option 2: Service Account Key File Path
```bash
# Path to your service account key file
GOOGLE_APPLICATION_CREDENTIALS=./path/to/service-account-key.json
```

## Google Cloud Setup Steps

### 1. Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your Project ID

### 2. Enable Dialogflow API
1. In Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Dialogflow API"
3. Click on it and press "Enable"

### 3. Create a Service Account
1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Give it a name like "dialogflow-service-account"
4. Click "Create and Continue"
5. Add the role "Dialogflow API Client"
6. Click "Done"

### 4. Create and Download Service Account Key
1. Click on your newly created service account
2. Go to the "Keys" tab
3. Click "Add Key" > "Create New Key"
4. Choose "JSON" format
5. Download the JSON file

### 5. Set Up Dialogflow ES Agent
1. Go to [Dialogflow ES Console](https://dialogflow.cloud.google.com/)
2. Create a new agent or use an existing one
3. Make sure it's linked to your Google Cloud project
4. Set the default language to Greek (el) if needed
5. Create intents and responses for your use case

## Voice Recognition Features

The app includes:
- **Voice Input Button**: Microphone icon next to the text input
- **Greek Language Support**: Configured for `el-GR` language
- **Visual Feedback**: Shows when listening with a red indicator
- **Automatic Transcription**: Converts speech to text in the input field
- **Browser Compatibility**: Works in Chrome, Edge, and other Chromium-based browsers

### Browser Support
- ✅ Chrome/Chromium browsers (recommended)
- ✅ Microsoft Edge
- ❌ Firefox (limited speech recognition support)
- ❌ Safari (limited speech recognition support)

## Testing Your Setup

1. Create your `.env.local` file with the required variables
2. Start your development server: `pnpm dev`
3. Test the chat functionality by typing a message
4. Test voice input by clicking the microphone button (browser will ask for permission)
5. Check the browser console for any error messages

## Troubleshooting

### Common Issues

1. **"Project ID not configured" error**
   - Make sure `GOOGLE_CLOUD_PROJECT_ID` or `DIALOGFLOW_PROJECT_ID` is set in `.env.local`

2. **Authentication errors**
   - Verify your service account JSON is properly formatted
   - Make sure the service account has "Dialogflow API Client" role
   - Check that the Dialogflow API is enabled in your Google Cloud project

3. **Voice recognition not working**
   - Ensure you're using a supported browser (Chrome/Edge)
   - Check that microphone permissions are granted
   - Verify you're accessing the site via HTTPS (required for microphone access)

4. **No response from Dialogflow**
   - Check your Dialogflow agent has intents configured
   - Verify the agent is published and linked to your Google Cloud project
   - Check the browser console for API error messages

### Logs and Debugging

Check the browser console and server logs for detailed error messages. The API route logs errors to help with debugging authentication and configuration issues.
