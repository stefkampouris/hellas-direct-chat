// lib/dialogflow.ts - Dialogflow CX implementation with webhook support
import { SessionsClient } from '@google-cloud/dialogflow-cx';
import path from 'path';

// TypeScript interfaces for Dialogflow CX
export interface DialogflowResponse {
  response: string;
  intent?: string;
  confidence?: number;
  sessionId: string;
  parameters?: Record<string, any>;
  currentPage?: string;
}

export interface DialogflowRequest {
  message: string;
  sessionId?: string;
  parameters?: Record<string, any>;
}

export interface DialogflowAudioRequest {
  sessionId: string;
  inputAudio: string; // base64 encoded audio
  sampleRate?: number;
  languageCode?: string;
  parameters?: Record<string, any>;
}

// Dialogflow CX Webhook interfaces
export interface WebhookRequest {
  fulfillmentInfo: {
    tag: string;
  };
  sessionInfo: {
    session: string;
    parameters: Record<string, any>;
  };
  pageInfo?: {
    currentPage: string;
    displayName: string;
  };
  intentInfo?: {
    lastMatchedIntent: string;
    displayName: string;
    confidence: number;
  };
  text?: string;
  languageCode?: string;
}

export interface WebhookResponse {
  fulfillmentResponse?: {
    messages: Array<{
      text: {
        text: string[];
      };
    }>;
  };
  sessionInfo?: {
    parameters: Record<string, any>;
  };
  pageInfo?: {
    currentPage?: string;
    formInfo?: {
      parameterInfo: Array<{
        displayName: string;
        required: boolean;
        state: 'PARAMETER_STATE_EMPTY' | 'PARAMETER_STATE_INVALID' | 'PARAMETER_STATE_FILLED';
        value?: any;
      }>;
    };
  };
  targetPage?: string;
  targetFlow?: string;
}

export interface AudioConfig {
  sampleRateHertz: number;
  languageCode: string;
  audioEncoding: 'AUDIO_ENCODING_LINEAR_16' | 'AUDIO_ENCODING_FLAC' | 'AUDIO_ENCODING_MULAW' | 'AUDIO_ENCODING_AMR' | 'AUDIO_ENCODING_AMR_WB' | 'AUDIO_ENCODING_OGG_OPUS' | 'AUDIO_ENCODING_SPEEX_WITH_HEADER_BYTE';
}

const PROJECT_ID = process.env.DIALOGFLOW_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID;
const LOCATION_ID = process.env.DIALOGFLOW_LOCATION_ID || 'global';
const AGENT_ID = process.env.DIALOGFLOW_AGENT_ID;
const KEY_FILE = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

console.log('Initializing Dialogflow CX with:');
console.log('Project ID:', PROJECT_ID);
console.log('Location ID:', LOCATION_ID);
console.log('Agent ID:', AGENT_ID);
console.log('Key file:', KEY_FILE);

// Initialize Dialogflow CX client
const sessionClient = new SessionsClient({
  keyFilename: KEY_FILE || './hellas-direct-chat-0b058c48395a.json',
});

console.log('Dialogflow CX SessionsClient initialized successfully');

// Function to send a message to Dialogflow CX
export async function sendMessageToDialogflow(
  message: string, 
  userSessionId?: string,
  parameters?: Record<string, any>
): Promise<DialogflowResponse> {
  if (!PROJECT_ID || !LOCATION_ID || !AGENT_ID) {
    throw new Error('Missing required Dialogflow CX configuration. Please set DIALOGFLOW_PROJECT_ID, DIALOGFLOW_LOCATION_ID, and DIALOGFLOW_AGENT_ID environment variables.');
  }

  // Create session path for Dialogflow CX
  const sessionId = userSessionId || `session-${Date.now()}-${Math.random().toString(36).substring(2)}`;
  const sessionPath = sessionClient.projectLocationAgentSessionPath(
    PROJECT_ID,
    LOCATION_ID,
    AGENT_ID,
    sessionId
  );  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: message,
      },
      languageCode: 'el', // Greek language
    },
    queryParams: parameters ? {
      parameters: parameters,
      // Ensure parameters are properly structured for Dialogflow CX
      sessionEntityTypes: [],
      analyzeQueryTextSentiment: false
    } : undefined,
  };

  try {    console.log(`🤖 Sending to Dialogflow CX: "${message}"`);
    console.log(`📍 Project: ${PROJECT_ID}`);
    console.log(`📍 Location: ${LOCATION_ID}`);
    console.log(`📍 Agent: ${AGENT_ID}`);
    console.log(`🔗 Session: ${sessionId}`);
    if (parameters) {
      console.log(`📋 Sending parameters:`, JSON.stringify(parameters, null, 2));
    }
    
    const [response] = await sessionClient.detectIntent(request);
    const result = response.queryResult;
    
    if (!result) {
      throw new Error('No result received from Dialogflow CX');
    }
    
    console.log('✅ Dialogflow CX response received');
    console.log('💬 Intent:', result.intent?.displayName || 'No intent');
    console.log('🎯 Confidence:', result.intentDetectionConfidence || 0);
    console.log('📝 Response messages:', result.responseMessages?.length || 0);
    console.log('📄 Current page:', result.currentPage?.displayName || 'Unknown');
    
    // Enhanced parameter extraction and logging
    let extractedParameters: Record<string, any> = {};
    if (result.parameters) {
      extractedParameters = Object.fromEntries(
        Object.entries(result.parameters).map(([key, value]) => [key, value])
      );
      console.log('📋 Received parameters from Dialogflow:', JSON.stringify(extractedParameters, null, 2));
    }
    
    // Extract text response from response messages
    let responseText = '';
    if (result.responseMessages && result.responseMessages.length > 0) {
      for (const message of result.responseMessages) {
        if (message.text && message.text.text && message.text.text.length > 0) {
          responseText += message.text.text.join(' ') + ' ';
        }
      }
    }
      // Fallback to a default message if no text response
    if (!responseText.trim()) {
      responseText = 'Συγγνώμη, δε μπόρεσα να καταλάβω. Μπορείτε να επαναδιατυπώσετε;';
    }
    
    return {
      response: responseText.trim(),
      intent: result.intent?.displayName || undefined,
      confidence: result.intentDetectionConfidence || undefined,
      sessionId: sessionId,
      parameters: Object.keys(extractedParameters).length > 0 ? extractedParameters : undefined,
      currentPage: result.currentPage?.displayName || undefined
    };
  } catch (error: any) {
    console.error('❌ Dialogflow CX Error:', error);
    
    // Provide helpful error messages based on error type
    if (error.code === 5 || error.message?.includes('NOT_FOUND')) {
      console.error('🚨 AGENT NOT FOUND - Setup Required:');
      console.error('1. Visit: https://dialogflow.cloud.google.com/cx');
      console.error('2. Create a new Dialogflow CX agent');
      console.error(`3. Use project: ${PROJECT_ID}`);
      console.error(`4. Use location: ${LOCATION_ID}`);
      console.error('5. Set DIALOGFLOW_AGENT_ID environment variable');
      throw new Error(`No Dialogflow CX agent found for project '${PROJECT_ID}' in location '${LOCATION_ID}'. Please create a Dialogflow CX agent.`);
    } else if (error.code === 16 || error.message?.includes('UNAUTHENTICATED')) {
      console.error('🚨 AUTHENTICATION FAILED:');
      console.error('Check your service account key file and permissions');
      throw new Error('Authentication failed. Please check your credentials.');
    } else if (error.message?.includes('PERMISSION_DENIED')) {
      console.error('🚨 PERMISSION DENIED:');
      console.error('The service account needs Dialogflow API Admin role');
      throw new Error('Permission denied. Please check service account roles.');
    } else {
      console.error('🚨 UNKNOWN ERROR:', error.message);
      throw new Error('An error occurred while processing your request: ' + (error.message || 'Unknown error'));
    }
  }
}

// Hellas Direct specific logic for insurance cases
export interface CaseData {
  type?: 'AC' | 'RA' | 'OTHER';
  customerName?: string;
  registrationNumber?: string;
  location?: string;
  description?: string;
  finalDestination?: string;
  fastTrack?: boolean;
  fraud?: boolean;
  possibleMalfunction?: string;
  delayCoupon?: boolean;
  geolocLink?: boolean;
  notAccessible?: boolean;
  injuryAsked?: boolean;
  damageAsked?: boolean;
  insuranceAsked?: boolean;
  photosAsked?: boolean;
  reserveAsked?: boolean;
  directionAsked?: boolean;
  colorAsked?: boolean;
  repairShopAsked?: boolean;
}

export function analyzeMessageForInsurance(message: string, caseData: CaseData): {
  type: string;
  reply: string[];
  caseData: CaseData;
} {
  const msg = message.toLowerCase();
  
  // Keywords for different case types
  const acKeywords = [
    "τρακάρισμα", "ατύχημα", "χτύπημα", "σπασμένο", "ζημιά", "παρμπρίζ", 
    "σταθμευμένο", "εξωτερικό παράγοντα", "τροχαίο", "collision"
  ];
  const raKeywords = [
    "λάστιχο", "βενζίνη", "μπαταρία", "βλάβη", "δεν ξεκινάει", "σταμάτησε", 
    "οδική", "βοήθεια", "ρεζέρβα", "πάντα", "breakdown"
  ];
  const fastTrackKeywords = ["πίσω", "σταθμευμένο", "stop", "σήμανση", "ξεπαρκάρισμα", "όπισθεν", "άνοιγμα θύρας"];
  const fraudKeywords = ["γνωριμία", "ασυμβατότητα", "έναρξη συμβολαίου"];
  const geolocKeywords = ["εθνική οδός", "άγνωστη τοποθεσία", "διπλότυπο όνομα"];
  const delayKeywords = ["ώρα αναμονής", "περίμενα πάνω από μία ώρα", "καθυστέρηση"];
  const notAccessibleKeywords = ["υπόγειο γκαράζ", "μη προσβάσιμο"];

  // Determine case type
  let type = caseData.type || null;
  if (!type) {
    if (acKeywords.some(k => msg.includes(k))) type = "AC";
    else if (raKeywords.some(k => msg.includes(k))) type = "RA";
    else type = "OTHER";
  }

  // Extract information from message
  let newCaseData = { ...caseData };
  
  // Must-have fields detection
  if (/\b(ονομα|ονόμα|λέγομαι|με λένε|είμαι)\b/.test(msg)) newCaseData.customerName = message;
  if (/\b(αριθμός κυκλοφορίας|πινακίδα|κυκλοφορίας)\b/.test(msg)) newCaseData.registrationNumber = message;
  if (/\b(τοποθεσία|βρίσκομαι|είμαι στο|είμαι στην|είμαι στον)\b/.test(msg)) newCaseData.location = message;
  if (/\b(περιστατικό|συνέβη|έγινε|τι συνέβη|τι έγινε)\b/.test(msg)) newCaseData.description = message;
  if (/\b(συνεργείο|οικία|προορισμός|θέλω να πάω|τελικός προορισμός)\b/.test(msg)) newCaseData.finalDestination = message;

  // Decision logic
  if (type === "AC") {
    if (fastTrackKeywords.some(k => msg.includes(k))) newCaseData.fastTrack = true;
    if (fraudKeywords.some(k => msg.includes(k))) newCaseData.fraud = true;
  }
  if (type === "RA") {
    if (raKeywords.some(k => msg.includes(k))) newCaseData.possibleMalfunction = message;
  }
  if (delayKeywords.some(k => msg.includes(k))) newCaseData.delayCoupon = true;
  if (geolocKeywords.some(k => msg.includes(k))) newCaseData.geolocLink = true;
  if (notAccessibleKeywords.some(k => msg.includes(k))) newCaseData.notAccessible = true;

  // Generate appropriate replies based on case type and collected data
  let reply: string[] = [];
  
  if (type === "AC") {
    if (!newCaseData.location) reply.push("Πού ακριβώς βρίσκεστε;");
    else if (!newCaseData.customerName) reply.push("Μπορείτε να μου δώσετε το ονοματεπώνυμό σας;");
    else if (!newCaseData.registrationNumber) reply.push("Ποιος είναι ο αριθμός κυκλοφορίας του οχήματός σας;");
    else if (!newCaseData.description) reply.push("Πώς ακριβώς συνέβη το περιστατικό;");
    else if (!newCaseData.finalDestination) reply.push("Σε περίπτωση που το όχημα δεν μπορεί να μετακινηθεί, ποιος θα θέλατε να είναι ο τελικός του προορισμός;");
    else if (!newCaseData.injuryAsked) {
      reply.push("Είστε όλοι εντάξει; Υπάρχει κάποιος τραυματισμός;");
      newCaseData.injuryAsked = true;
    } else if (!newCaseData.damageAsked) {
      reply.push("Τι υλικές ζημιές έχετε στο όχημά σας; Πού βρίσκονται;");
      newCaseData.damageAsked = true;
    } else if (!newCaseData.insuranceAsked) {
      reply.push("Ποια είναι η ασφαλιστική εταιρία του εμπλεκόμενου οχήματος;");
      newCaseData.insuranceAsked = true;
    } else if (!newCaseData.photosAsked) {
      reply.push("Μπορείτε να στείλετε φωτογραφίες της άδειας κυκλοφορίας, του διπλώματός σας, των ζημιών και του σημείου του συμβάντος;");
      newCaseData.photosAsked = true;
    } else {
      reply.push("Σας ευχαριστούμε. Ακολουθεί σύνοψη του περιστατικού:");
      reply.push(JSON.stringify({
        RegistrationNumber: newCaseData.registrationNumber || "-",
        CustomerName: newCaseData.customerName || "-",
        Description: newCaseData.description || "-",
        Location: newCaseData.location || "-",
        FinalDestination: newCaseData.finalDestination || "-",
        FastTrack: !!newCaseData.fastTrack,
        Fraud: !!newCaseData.fraud
      }, null, 2));
    }
  } else if (type === "RA") {
    if (!newCaseData.location) reply.push("Πού ακριβώς βρίσκεστε;");
    else if (!newCaseData.customerName) reply.push("Μπορείτε να μου δώσετε το ονοματεπώνυμό σας;");
    else if (!newCaseData.registrationNumber) reply.push("Ποιος είναι ο αριθμός κυκλοφορίας του οχήματός σας;");
    else if (!newCaseData.description) reply.push("Τι συνέβη στο όχημα;");
    else if (!newCaseData.reserveAsked) {
      reply.push("Υπάρχει ρεζέρβα στο όχημα;");
      newCaseData.reserveAsked = true;
    } else if (!newCaseData.directionAsked) {
      reply.push("Προς τα πού είχατε κατεύθυνση;");
      newCaseData.directionAsked = true;
    } else if (!newCaseData.colorAsked) {
      reply.push("Τι χρώμα είναι το αυτοκίνητο;");
      newCaseData.colorAsked = true;
    } else if (!newCaseData.repairShopAsked) {
      reply.push("Υπάρχει κάποιο συγκεκριμένο βουλκανιζατέρ/συνεργείο που θα θέλατε να πάμε;");
      newCaseData.repairShopAsked = true;
    } else if (!newCaseData.finalDestination) {
      reply.push("Σε περίπτωση που το όχημα δεν μπορεί να μετακινηθεί, ποιος θα θέλατε να είναι ο τελικός του προορισμός;");
    } else {
      reply.push("Σας ευχαριστούμε. Ακολουθεί σύνοψη του περιστατικού:");
      reply.push(JSON.stringify({
        RegistrationNumber: newCaseData.registrationNumber || "-",
        CustomerName: newCaseData.customerName || "-",
        Description: newCaseData.description || "-",
        Location: newCaseData.location || "-",
        FinalDestination: newCaseData.finalDestination || "-",
        PossibleMalfunction: newCaseData.possibleMalfunction || "-",
        DelayCoupon: !!newCaseData.delayCoupon,
        GeolocLink: !!newCaseData.geolocLink,
        NotAccessible: !!newCaseData.notAccessible
      }, null, 2));
    }
  } else {
    reply.push("Ευχαριστώ, εξυπηρετώ μόνο Ατυχήματα και Οδική Βοήθεια.");
  }

  return { type: type || 'OTHER', reply, caseData: newCaseData };
}

// Function to detect intent from audio input (Dialogflow CX)
export async function detectIntentFromAudio(
  audioRequest: DialogflowAudioRequest
): Promise<DialogflowResponse> {
  if (!PROJECT_ID || !LOCATION_ID || !AGENT_ID) {
    throw new Error('Missing required Dialogflow CX configuration. Please set DIALOGFLOW_PROJECT_ID, DIALOGFLOW_LOCATION_ID, and DIALOGFLOW_AGENT_ID environment variables.');
  }

  const sessionId = audioRequest.sessionId;
  const sessionPath = sessionClient.projectLocationAgentSessionPath(
    PROJECT_ID,
    LOCATION_ID,
    AGENT_ID,
    sessionId
  );

  // Convert base64 audio to buffer
  const audioBuffer = Buffer.from(audioRequest.inputAudio, 'base64');

  const request = {
    session: sessionPath,
    queryInput: {
      audio: {
        config: {
          audioEncoding: 'AUDIO_ENCODING_LINEAR_16' as const,
          sampleRateHertz: audioRequest.sampleRate || 16000,
        },
      },
      languageCode: audioRequest.languageCode || 'el',
    },
    inputAudio: audioBuffer,
  };

  try {
    console.log(`🎧 Audio input detected, processing...`);
    console.log(`📍 Project: ${PROJECT_ID}`);
    console.log(`📍 Location: ${LOCATION_ID}`);
    console.log(`📍 Agent: ${AGENT_ID}`);
    console.log(`🔗 Session: ${sessionId}`);
    
    const [response] = await sessionClient.detectIntent(request);
    const result = response.queryResult;
    
    if (!result) {
      throw new Error('No result received from Dialogflow CX for audio input');
    }
    
    console.log('✅ Dialogflow CX audio response received');
    console.log('💬 Intent:', result.intent?.displayName || 'No intent');
    console.log('🎯 Confidence:', result.intentDetectionConfidence || 0);
    console.log('📝 Response messages:', result.responseMessages?.length || 0);
    console.log('🗣️ Query text:', result.transcript);
    
    // Extract text response from response messages
    let responseText = '';
    if (result.responseMessages && result.responseMessages.length > 0) {
      for (const message of result.responseMessages) {
        if (message.text && message.text.text && message.text.text.length > 0) {
          responseText += message.text.text.join(' ') + ' ';
        }
      }
    }
    
    // Fallback to a default message if no text response
    if (!responseText.trim()) {
      responseText = 'Συγγνώμη, δε μπόρεσα να καταλάβω το ηχητικό μήνυμα. Μπορείτε να επαναδιατυπώσετε;';
    }
    
    return {
      response: responseText.trim(),
      intent: result.intent?.displayName || undefined,
      confidence: result.intentDetectionConfidence || undefined,
      sessionId: sessionId,
      parameters: result.parameters ? 
        Object.fromEntries(Object.entries(result.parameters).map(([key, value]) => [key, value])) : 
        undefined,
      currentPage: result.currentPage?.displayName || undefined
    };
  } catch (error: any) {
    console.error('❌ Dialogflow CX Audio Processing Error:', error);
    
    // Provide helpful error messages based on error type
    if (error.code === 5 || error.message?.includes('NOT_FOUND')) {
      console.error('🚨 AGENT NOT FOUND - Setup Required:');
      console.error('1. Visit: https://dialogflow.cloud.google.com/cx');
      console.error('2. Create a new Dialogflow CX agent');
      console.error(`3. Use project: ${PROJECT_ID}`);
      console.error(`4. Use location: ${LOCATION_ID}`);
      console.error('5. Set DIALOGFLOW_AGENT_ID environment variable');
      throw new Error(`No Dialogflow CX agent found for project '${PROJECT_ID}' in location '${LOCATION_ID}'. Please create a Dialogflow CX agent.`);
    } else if (error.code === 16 || error.message?.includes('UNAUTHENTICATED')) {
      console.error('🚨 AUTHENTICATION FAILED:');
      console.error('Check your service account key file and permissions');
      throw new Error('Authentication failed. Please check your credentials.');
    } else if (error.code === 7 || error.message?.includes('PERMISSION_DENIED')) {
      console.error('🚨 PERMISSION DENIED:');
      console.error('The service account needs Dialogflow API Admin role');
      throw new Error('Permission denied. Please check service account roles.');
    } else {
      console.error('🚨 UNKNOWN ERROR:', error.message);
      throw new Error('An error occurred while processing your request: ' + (error.message || 'Unknown error'));
    }
  }
}

// Streaming detect intent interfaces
export interface StreamingDetectIntentRequest {
  sessionId: string;
  audioStream: ReadableStream<Uint8Array>;
  sampleRate?: number;
  languageCode?: string;
  enablePartialResponse?: boolean;
  parameters?: Record<string, any>;
}

export interface StreamingDetectIntentResponse {
  transcript?: string;
  response?: string;
  intent?: string;
  confidence?: number;
  sessionId: string;
  parameters?: Record<string, any>;
  currentPage?: string;
  isPartial?: boolean;
  recognition_result?: {
    transcript: string;
    is_final: boolean;
    confidence: number;
  };
}

// Enhanced webhook request interface with additional debugging fields
export interface EnhancedWebhookRequest extends WebhookRequest {
  detectIntentResponseId?: string;
  traceId?: string;
  requestId?: string;
}

// Function to handle streaming detect intent with real-time audio
export async function streamingDetectIntent(
  streamRequest: StreamingDetectIntentRequest
): Promise<AsyncGenerator<StreamingDetectIntentResponse, void, unknown>> {
  if (!PROJECT_ID || !LOCATION_ID || !AGENT_ID) {
    throw new Error('Missing required Dialogflow CX configuration. Please set DIALOGFLOW_PROJECT_ID, DIALOGFLOW_LOCATION_ID, and DIALOGFLOW_AGENT_ID environment variables.');
  }

  const sessionId = streamRequest.sessionId;
  const sessionPath = sessionClient.projectLocationAgentSessionPath(
    PROJECT_ID,
    LOCATION_ID,
    AGENT_ID,
    sessionId
  );

  console.log(`🎥 Starting streaming detect intent for session: ${sessionId}`);
  console.log(`📍 Project: ${PROJECT_ID}, Location: ${LOCATION_ID}, Agent: ${AGENT_ID}`);

  return streamingDetectIntentGenerator(sessionPath, streamRequest);
}

async function* streamingDetectIntentGenerator(
  sessionPath: string,
  streamRequest: StreamingDetectIntentRequest
): AsyncGenerator<StreamingDetectIntentResponse, void, unknown> {
  try {
    const detectStream = sessionClient.streamingDetectIntent();
    
    // Configure the initial streaming request
    const initialRequest = {
      session: sessionPath,
      queryInput: {
        audio: {
          config: {
            audioEncoding: 'AUDIO_ENCODING_LINEAR_16' as const,
            sampleRateHertz: streamRequest.sampleRate || 16000,
            enableWordInfo: true,
          },
        },
        languageCode: streamRequest.languageCode || 'el',
        enablePartialResponse: streamRequest.enablePartialResponse || true,
      },
      queryParams: streamRequest.parameters ? {
        parameters: streamRequest.parameters,
        sessionEntityTypes: [],
        analyzeQueryTextSentiment: false
      } : undefined,
    };

    // Send the initial configuration
    detectStream.write(initialRequest);

    // Set up response handling
    detectStream.on('data', (response: any) => {
      try {
        const result = response.queryResult;
        
        if (response.recognitionResult) {
          // Handle partial speech recognition results
          const recognition = response.recognitionResult;
          console.log(`🎤 Recognition result: "${recognition.transcript}" (final: ${recognition.isFinal})`);
          
          const streamingResponse: StreamingDetectIntentResponse = {
            transcript: recognition.transcript,
            sessionId: streamRequest.sessionId,
            isPartial: !recognition.isFinal,
            confidence: recognition.confidence || 0,
            recognition_result: {
              transcript: recognition.transcript,
              is_final: recognition.isFinal,
              confidence: recognition.confidence || 0
            }
          };
          
          // This would be yielded in a real async generator implementation
          // For now, we'll use events to communicate partial results
        }

        if (result) {
          console.log('✅ Dialogflow CX streaming response received');
          console.log('💬 Intent:', result.intent?.displayName || 'No intent');
          console.log('🎯 Confidence:', result.intentDetectionConfidence || 0);
          console.log('📄 Current page:', result.currentPage?.displayName || 'Unknown');

          // Extract text response
          let responseText = '';
          if (result.responseMessages && result.responseMessages.length > 0) {
            for (const message of result.responseMessages) {
              if (message.text && message.text.text && message.text.text.length > 0) {
                responseText += message.text.text.join(' ') + ' ';
              }
            }
          }

          const streamingResponse: StreamingDetectIntentResponse = {
            transcript: result.transcript,
            response: responseText.trim() || 'Συγγνώμη, δε μπόρεσα να καταλάβω.',
            intent: result.intent?.displayName,
            confidence: result.intentDetectionConfidence,
            sessionId: streamRequest.sessionId,
            parameters: result.parameters ? 
              Object.fromEntries(Object.entries(result.parameters).map(([key, value]) => [key, value])) : 
              undefined,
            currentPage: result.currentPage?.displayName,
            isPartial: false
          };

          // This would be yielded in the async generator
        }
      } catch (error) {
        console.error('❌ Error processing streaming response:', error);
      }
    });

    detectStream.on('error', (error: any) => {
      console.error('❌ Streaming detect intent error:', error);
      throw error;
    });

    detectStream.on('end', () => {
      console.log('✅ Streaming detect intent ended');
    });

    // Process audio stream
    const reader = streamRequest.audioStream.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        // Convert Uint8Array to Buffer and send to Dialogflow
        const audioBuffer = Buffer.from(value);
        detectStream.write({
          inputAudio: audioBuffer,
        });
      }
    } finally {
      reader.releaseLock();
      detectStream.end();
    }

  } catch (error: any) {
    console.error('❌ Streaming detect intent error:', error);
    
    // Enhanced error handling based on documentation
    if (error.code === 4 || error.message?.includes('DEADLINE_EXCEEDED')) {
      console.error('🚨 TIMEOUT ERROR: gRPC deadline exceeded');
      throw new Error('Request timeout. The streaming session took too long to complete.');
    } else if (error.code === 14 || error.message?.includes('URL_UNREACHABLE')) {
      console.error('🚨 NETWORK ERROR: Unable to reach Dialogflow service');
      throw new Error('Network error. Unable to connect to Dialogflow streaming service.');
    } else {
      throw error;
    }
  }
}

// Enhanced webhook request handling with debugging info
export function enhanceWebhookRequest(request: WebhookRequest): EnhancedWebhookRequest {
  const enhanced: EnhancedWebhookRequest = {
    ...request,
    detectIntentResponseId: generateUUID(),
    traceId: generateTraceId(),
    requestId: generateUUID()
  };

  // Log enhanced debugging information
  console.log(`🔍 Enhanced webhook request:`);
  console.log(`📋 Detect Intent Response ID: ${enhanced.detectIntentResponseId}`);
  console.log(`🔗 Trace ID: ${enhanced.traceId}`);
  console.log(`🆔 Request ID: ${enhanced.requestId}`);
  console.log(`👤 Session ID: ${enhanced.sessionInfo.session}`);
  console.log(`🏷️ Fulfillment Tag: ${enhanced.fulfillmentInfo.tag}`);
  
  return enhanced;
}

// Utility functions for enhanced debugging
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function generateTraceId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Enhanced session parameter validation and setting
export function validateAndSetSessionParameters(
  parameters: Record<string, any>
): { valid: boolean; errors: string[]; sanitized: Record<string, any> } {
  const errors: string[] = [];
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(parameters)) {
    // Validate parameter key format
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key)) {
      errors.push(`Invalid parameter key format: ${key}`);
      continue;
    }

    // Validate parameter value
    if (value === null || value === undefined) {
      errors.push(`Parameter '${key}' has null or undefined value`);
      continue;
    }

    // Sanitize and add to result
    sanitized[key] = value;
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized
  };
}
