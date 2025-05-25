// lib/webhook-handlers.ts - Enhanced webhook handlers for Hellas Direct insurance cases
import { WebhookRequest, WebhookResponse, EnhancedWebhookRequest, enhanceWebhookRequest, validateAndSetSessionParameters } from './dialogflow';
import { FlowOrchestrator } from './flow-handlers-simple';

// Insurance case handler types
export type CaseType = 'AC' | 'RA' | 'OTHER';

export interface InsuranceCaseData {
  type?: CaseType;
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

// Enhanced main webhook handler with debugging and error handling
export async function handleWebhookRequest(request: WebhookRequest): Promise<WebhookResponse> {
  const startTime = Date.now();
  
  try {
    // Enhance request with debugging information
    const enhancedRequest = enhanceWebhookRequest(request);
    const tag = enhancedRequest.fulfillmentInfo.tag;
    
    console.log(`🎯 Webhook called with tag: ${tag}`);
    console.log(`📥 Enhanced Request:`, JSON.stringify(enhancedRequest, null, 2));
    
    // Log session information for debugging
    logSessionInfo(enhancedRequest);
    
    // Validate session parameters if present
    if (enhancedRequest.sessionInfo.parameters) {
      const validation = validateAndSetSessionParameters(enhancedRequest.sessionInfo.parameters);
      if (!validation.valid) {
        console.warn(`⚠️ Parameter validation warnings:`, validation.errors);
      }
    }
    
    // Process the webhook request
    const response = await FlowOrchestrator.handleWebhookFlow(enhancedRequest);
    
    // Log processing time and response
    const processingTime = Date.now() - startTime;
    console.log(`✅ Webhook processed in ${processingTime}ms`);
    console.log(`📤 Response:`, JSON.stringify(response, null, 2));
    
    // Add debugging info to response for correlation
    const enhancedResponse = enhanceWebhookResponse(response, enhancedRequest, processingTime);
    
    return enhancedResponse;
    
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    console.error('❌ Webhook handler error:', error);
    console.error(`⏱️ Error occurred after ${processingTime}ms`);
    
    // Log error with correlation IDs for debugging
    logWebhookError(error, request, processingTime);
    
    return {
      fulfillmentResponse: {
        messages: [{
          text: {
            text: ['Υπήρξε ένα εσωτερικό λάθος. Παρακαλώ δοκιμάστε ξανά αργότερα.']
          }
        }]
      },
      sessionInfo: {
        parameters: {
          'webhook-error': true,
          'error-timestamp': new Date().toISOString(),
          'error-type': error.name || 'UnknownError'
        }
      }
    };
  }
}

// Log session information for debugging (following Google Cloud documentation best practices)
function logSessionInfo(request: EnhancedWebhookRequest): void {
  const sessionId = extractSessionId(request.sessionInfo.session);
  
  console.log(`📋 Session Debug Info:`);
  console.log(`🔗 Session ID: ${sessionId}`);
  console.log(`🎯 Detect Intent Response ID: ${request.detectIntentResponseId}`);
  console.log(`🔍 Trace ID: ${request.traceId}`);
  console.log(`🆔 Request ID: ${request.requestId}`);
  console.log(`📄 Current Page: ${request.pageInfo?.displayName || 'Unknown'}`);
  console.log(`💬 Intent: ${request.intentInfo?.displayName || 'No intent'}`);
  console.log(`🎯 Confidence: ${request.intentInfo?.confidence || 0}`);
  console.log(`🗣️ Text Input: ${request.text || 'No text'}`);
  console.log(`🌐 Language: ${request.languageCode || 'Unknown'}`);
  
  // Log parameters for debugging
  if (request.sessionInfo.parameters) {
    console.log(`📋 Session Parameters:`, JSON.stringify(request.sessionInfo.parameters, null, 2));
  }
}

// Extract session ID from session path (for correlation with Cloud Logging)
function extractSessionId(sessionPath: string): string {
  // Session path format: projects/.../locations/.../agents/.../sessions/SESSION_ID
  const parts = sessionPath.split('/');
  return parts[parts.length - 1] || sessionPath;
}

// Enhanced webhook response with debugging information
function enhanceWebhookResponse(
  response: WebhookResponse, 
  request: EnhancedWebhookRequest, 
  processingTime: number
): WebhookResponse {
  // Add debugging parameters to session for correlation
  const debuggingParams = {
    'webhook-processing-time-ms': processingTime,
    'webhook-detect-intent-response-id': request.detectIntentResponseId,
    'webhook-trace-id': request.traceId,
    'webhook-request-id': request.requestId,
    'webhook-timestamp': new Date().toISOString()
  };
  
  return {
    ...response,
    sessionInfo: {
      ...response.sessionInfo,
      parameters: {
        ...response.sessionInfo?.parameters,
        ...debuggingParams
      }
    }
  };
}

// Log webhook errors with correlation information (following Google Cloud documentation)
function logWebhookError(error: any, request: WebhookRequest, processingTime: number): void {
  const sessionId = extractSessionId(request.sessionInfo.session);
  
  console.error(`🚨 Webhook Error Details:`);
  console.error(`🔗 Session ID: ${sessionId}`);
  console.error(`⏱️ Processing Time: ${processingTime}ms`);
  console.error(`🏷️ Fulfillment Tag: ${request.fulfillmentInfo.tag}`);
  console.error(`📄 Current Page: ${request.pageInfo?.displayName || 'Unknown'}`);
  console.error(`💬 Intent: ${request.intentInfo?.displayName || 'No intent'}`);
  console.error(`🔍 Error Type: ${error.name || 'Unknown'}`);
  console.error(`📝 Error Message: ${error.message || 'No message'}`);
  console.error(`📊 Error Stack:`, error.stack);
  
  // Additional debugging context
  if (error.code) {
    console.error(`🔢 Error Code: ${error.code}`);
  }
  
  if (error.details) {
    console.error(`📋 Error Details:`, error.details);
  }
}
