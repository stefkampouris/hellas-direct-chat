# Dialogflow CX Streaming and Enhanced Webhook Implementation

This document outlines the advanced Dialogflow CX features implemented in the Hellas Direct Chat application, based on Google Cloud best practices and documentation.

## 🎥 Streaming Detect Intent

### Overview
Implemented real-time streaming audio detection that allows users to speak continuously while receiving partial transcription results and intent detection.

### Features
- **Real-time Audio Streaming**: Uses AudioWorklet API for low-latency audio processing
- **Partial Response Support**: Shows transcription in real-time as the user speaks
- **Intent Detection with Audio**: Direct audio processing through Dialogflow CX
- **Fallback Support**: Graceful fallback to Web Speech API for unsupported browsers

### Implementation Files
- `lib/dialogflow.ts` - Core streaming functionality
- `app/components/StreamingVoiceRecorder.tsx` - Enhanced voice recorder component
- `app/api/stream-audio/route.ts` - Streaming API endpoint
- `public/audio-processor.js` - AudioWorklet processor

### Usage

#### Basic Streaming Setup
```typescript
import { streamingDetectIntent } from '@/lib/dialogflow';

const streamRequest = {
  sessionId: 'your-session-id',
  audioStream: audioStream, // ReadableStream<Uint8Array>
  sampleRate: 16000,
  languageCode: 'el',
  enablePartialResponse: true
};

for await (const response of streamingDetectIntent(streamRequest)) {
  if (response.isPartial) {
    console.log('Partial:', response.transcript);
  } else {
    console.log('Final:', response.response);
  }
}
```

#### Using the Enhanced Voice Recorder
```tsx
import StreamingVoiceRecorder from '@/app/components/StreamingVoiceRecorder';

<StreamingVoiceRecorder
  sessionId={sessionId}
  enablePartialResponse={true}
  onPartialResult={(result) => {
    console.log('Partial:', result.text, result.isPartial);
  }}
  onFinalResult={(result) => {
    console.log('Final:', result.text, result.response);
  }}
/>
```

## 🔧 Enhanced Webhook Implementation

### Overview
Implemented comprehensive webhook handling with advanced debugging, error handling, and logging capabilities following Google Cloud documentation best practices.

### Features
- **Enhanced Debugging**: Detailed logging with correlation IDs
- **Request Validation**: Comprehensive webhook request validation
- **Error Handling**: Structured error responses with debugging information
- **Performance Monitoring**: Request processing time tracking
- **Session Correlation**: Session ID extraction for Cloud Logging correlation

### Implementation Files
- `lib/webhook-handlers.ts` - Enhanced webhook handlers
- `app/api/webhook/route.ts` - Enhanced webhook endpoint

### Debugging Features

#### Request Correlation
Every webhook request gets:
- **Request ID**: Unique identifier for request tracking
- **Trace ID**: For correlating with Cloud Logging
- **Detect Intent Response ID**: UUID for Dialogflow correlation
- **Processing Time**: Performance monitoring

#### Session Logging
```typescript
// Example log output
📋 Session Debug Info (req_1234567890_abc123):
🔗 Session ID: session-uuid-here
🎯 Detect Intent Response ID: response-uuid-here
🔍 Trace ID: trace-abc123def456
🆔 Request ID: req_1234567890_abc123
📄 Current Page: Default Start Flow
💬 Intent: get.insurance.help
🎯 Confidence: 0.95
🗣️ Text Input: Χρειάζομαι βοήθεια με ατύχημα
🌐 Language: el
```

#### Error Logging
```typescript
// Example error log output
🚨 Webhook Error Details (req_1234567890_abc123):
🔗 Session ID: session-uuid-here
⏱️ Processing Time: 150ms
🏷️ Fulfillment Tag: collect-customer-info
📄 Current Page: Customer Information
💬 Intent: provide.customer.details
🔍 Error Type: ValidationError
📝 Error Message: Missing required customer name
📊 Error Stack: [stack trace]
```

### Webhook Response Enhancement

#### Enhanced Responses
All webhook responses include debugging parameters:
```json
{
  "fulfillmentResponse": { /* ... */ },
  "sessionInfo": {
    "parameters": {
      "webhook-processing-time-ms": 150,
      "webhook-detect-intent-response-id": "uuid-here",
      "webhook-trace-id": "trace-id-here",
      "webhook-request-id": "req-id-here",
      "webhook-timestamp": "2025-05-25T12:00:00Z"
    }
  }
}
```

### Webhook Troubleshooting

#### Common Issues and Solutions

1. **Webhook Timeout**
   - **Error**: `State: URL_TIMEOUT, Reason: TIMEOUT_WEB`
   - **Solution**: Reduce processing time or increase webhook timeout
   - **Monitoring**: Check `webhook-processing-time-ms` parameter

2. **Authentication Failed**
   - **Error**: `State: URL_ERROR, Reason: ERROR_AUTHENTICATION`
   - **Solution**: Verify webhook URL and authentication settings
   - **Debug**: Check request headers and authentication

3. **URL Unreachable**
   - **Error**: `State: URL_UNREACHABLE`
   - **Solution**: Verify webhook URL accessibility and network configuration
   - **Debug**: Check DNS resolution and firewall settings

## 🔍 Cloud Logging Integration

### Correlation with Cloud Logging

#### Finding Webhook Logs
Use these Cloud Logging filters to find specific webhook calls:

```
# Find Dialogflow errors for an agent
labels.location_id="global"
labels.agent_id="YOUR_AGENT_ID"
severity=ERROR

# Find webhook calls by session ID
resource.type = "cloud_run_revision"
textPayload="Session ID = YOUR_SESSION_ID"

# Find webhook calls by trace ID
resource.type = "cloud_run_revision"
trace="projects/YOUR_PROJECT/traces/YOUR_TRACE_ID"
```

#### Session Correlation
The enhanced webhook implementation logs session IDs in the exact format expected by Cloud Logging filters:

```typescript
console.log(`Debug Node: session ID = ${sessionId}`);
```

## 📊 Performance Monitoring

### Metrics Tracked
- **Request Processing Time**: Time taken to process webhook requests
- **Audio Processing Latency**: Time for streaming audio processing
- **Intent Detection Confidence**: Confidence scores for quality monitoring
- **Error Rates**: Tracking of different error types

### Health Check Endpoints
- `GET /api/webhook` - Webhook endpoint health check
- `GET /api/stream-audio` - Streaming capabilities information

## 🚀 Advanced Features

### Partial Response Support
```typescript
// Enable partial responses for streaming
const request = {
  queryInput: {
    enablePartialResponse: true
  }
};
```

### Enhanced Audio Configuration
```typescript
// Optimized audio settings for Greek language
const audioConfig = {
  sampleRateHertz: 16000,
  languageCode: 'el',
  audioEncoding: 'AUDIO_ENCODING_LINEAR_16',
  enableWordInfo: true
};
```

### Session Parameter Validation
```typescript
// Validate session parameters before processing
const validation = validateAndSetSessionParameters(parameters);
if (!validation.valid) {
  console.warn('Parameter validation warnings:', validation.errors);
}
```

## 🎯 Best Practices

### Webhook Development
1. **Always validate input**: Use the enhanced validation functions
2. **Log correlation IDs**: Include request IDs and trace IDs in all logs
3. **Handle timeouts gracefully**: Implement proper error handling
4. **Monitor performance**: Track processing times and optimize accordingly

### Streaming Audio
1. **Use appropriate sample rates**: 16kHz for Dialogflow CX
2. **Enable partial responses**: For better user experience
3. **Implement fallbacks**: Use Web Speech API as backup
4. **Handle network issues**: Graceful degradation for poor connections

### Debugging
1. **Use structured logging**: Consistent log format for easy searching
2. **Correlate with Cloud Logging**: Use session IDs and trace IDs
3. **Monitor error patterns**: Track common issues and solutions
4. **Performance profiling**: Regular monitoring of response times

## 📚 References

- [Dialogflow CX Streaming Detect Intent](https://cloud.google.com/dialogflow/cx/docs/how/detect-intent-stream)
- [Dialogflow CX Webhook Implementation](https://cloud.google.com/dialogflow/cx/docs/how/webhook)
- [Cloud Logging for Dialogflow](https://cloud.google.com/dialogflow/cx/docs/concept/logging)
- [AudioWorklet API](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)
