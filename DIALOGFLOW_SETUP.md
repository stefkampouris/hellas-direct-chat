# Dialogflow ES Setup and Troubleshooting Guide

## Current Issue Analysis

Based on the error message, you have two main issues to resolve:

1. ✅ **JSON Parsing Error**: Fixed by improving error handling
2. ❌ **Dialogflow Agent Not Found**: You need to create a Dialogflow ES agent

## Required Setup Steps

### 1. Create a Dialogflow ES Agent

Since you have the Google Cloud project "hellas-direct-chat" set up, you now need to create a Dialogflow ES agent:

1. **Go to Dialogflow ES Console**: https://dialogflow.cloud.google.com/
2. **Sign in** with the same Google account used for your Google Cloud project
3. **Create a new agent**:
   - Click "Create Agent"
   - Agent name: `Hellas Direct Assistant`
   - Default language: `Greek - el`
   - Default time zone: `Europe/Athens`
   - **Important**: Select your existing project "hellas-direct-chat" from the dropdown
4. **Click "Create"**

### 2. Enable Required APIs

Make sure these APIs are enabled in your Google Cloud project:

1. Go to [Google Cloud Console APIs](https://console.cloud.google.com/apis/library)
2. Search for and enable:
   - **Dialogflow API**
   - **Cloud Resource Manager API** (if not already enabled)

### 3. Configure Basic Intents

After creating your agent, set up some basic intents:

#### Default Welcome Intent
- **Training phrases** (in Greek):
  - "Γεια σας"
  - "Καλησπέρα"
  - "Χρειάζομαι βοήθεια"
  - "Έχω ατύχημα"
  - "Έχω πρόβλημα με το αυτοκίνητο"

- **Response** (in Greek):
  - "Καλώς ήρθατε στην Hellas Direct! Εξυπηρετώ για Ατυχήματα (AC) και Οδική Βοήθεια (RA). Περιγράψτε το περιστατικό σας."

#### Accident Intent
- **Intent name**: `accident`
- **Training phrases**:
  - "Είχα ατύχημα"
  - "Τράκαρα"
  - "Χτύπησα άλλο αυτοκίνητο"
  - "Μου χτύπησαν το αυτοκίνητο"
  - "Ατύχημα"

- **Response**:
  - "Λυπάμαι που ακούω για το ατύχημα. Είστε όλοι καλά; Πού ακριβώς βρίσκεστε;"

#### Road Assistance Intent
- **Intent name**: `roadside_assistance`
- **Training phrases**:
  - "Έσπασε το αυτοκίνητο"
  - "Δεν ξεκινάει"
  - "Χρειάζομαι οδική βοήθεια"
  - "Έμεινα από βενζίνη"
  - "Έσπασε το λάστιχο"

- **Response**:
  - "Θα σας βοηθήσω με την οδική βοήθεια. Πού ακριβώς βρίσκεστε και τι πρόβλημα έχει το όχημα;"

## Environment Configuration

Your `.env.local` file is now set up correctly:

```bash
GOOGLE_CLOUD_PROJECT_ID=hellas-direct-chat
GOOGLE_APPLICATION_CREDENTIALS=./hellas-direct-chat-312292c9e88c.json
```

## Testing Your Setup

1. **Restart your development server**:
   ```bash
   pnpm dev
   ```

2. **Test the connection**:
   - Open your app in the browser
   - Type a test message like "Γεια σας"
   - Check the browser console and server logs for any errors

3. **Check server logs** for detailed error messages and debugging information

## Verification Checklist

- [ ] Dialogflow ES agent created in project "hellas-direct-chat"
- [ ] Agent language set to Greek (el)
- [ ] Basic intents configured with Greek training phrases
- [ ] Dialogflow API enabled in Google Cloud Console
- [ ] Service account has proper permissions
- [ ] `.env.local` file configured correctly
- [ ] Development server restarted

## Common Issues and Solutions

### "No DesignTimeAgent found"
This means you haven't created a Dialogflow ES agent yet. Follow step 1 above.

### "UNAUTHENTICATED" errors
- Verify your service account JSON file is valid
- Make sure the service account has "Dialogflow API Client" role
- Check that the Dialogflow API is enabled

### "PERMISSION_DENIED" errors
- Go to Google Cloud Console > IAM
- Find your service account: `nextappkey@hellas-direct-chat.iam.gserviceaccount.com`
- Add the role: "Dialogflow API Client"

### Voice recognition not working
- Use Chrome or Edge browser
- Access the site via HTTPS (required for microphone access)
- Grant microphone permissions when prompted

## Testing Voice Input

Once everything is set up:
1. Click the microphone button (🎤)
2. Say something in Greek like "Γεια σας, χρειάζομαι βοήθεια"
3. The text should appear in the input field
4. Submit to test the full integration

## Next Steps

After basic setup works:
1. Create more sophisticated intents for your specific use cases
2. Add entities for extracting structured data (names, locations, etc.)
3. Implement fulfillment webhooks for complex logic
4. Add context management for conversation flow
