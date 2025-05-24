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
  keyFilename: KEY_FILE || './hellas-direct-chat-312292c9e88c.json',
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
  );
  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: message,
      },
      languageCode: 'el', // Greek language
    },
    queryParams: parameters ? {
      parameters: parameters
    } : undefined,
  };

  try {
    console.log(`🤖 Sending to Dialogflow CX: "${message}"`);
    console.log(`📍 Project: ${PROJECT_ID}`);
    console.log(`📍 Location: ${LOCATION_ID}`);
    console.log(`📍 Agent: ${AGENT_ID}`);
    console.log(`🔗 Session: ${sessionId}`);
    
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
      parameters: result.parameters ? 
        Object.fromEntries(Object.entries(result.parameters).map(([key, value]) => [key, value])) : 
        undefined,
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

// Function to send audio to Dialogflow for voice recognition (Dialogflow CX)
export async function sendAudioToDialogflow(
  audioRequest: DialogflowAudioRequest
): Promise<DialogflowResponse> {
  // Use the existing detectIntentFromAudio function for consistency
  return await detectIntentFromAudio(audioRequest);
}

// Utility function to convert audio blob to base64 for Dialogflow
export function audioToBase64(audioBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix to get just the base64 data
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to convert audio to base64'));
    reader.readAsDataURL(audioBlob);
  });
}
