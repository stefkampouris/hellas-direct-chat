// app/api/webhook/route.ts - Enhanced Dialogflow CX Webhook endpoint with debugging
import { NextRequest, NextResponse } from 'next/server';
import { WebhookRequest, WebhookResponse } from '@/lib/dialogflow';
import { handleWebhookRequest } from '@/lib/webhook-handlers';

// Allow webhook to be called from Dialogflow
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  try {
    console.log(`🎯 Webhook endpoint called (Request ID: ${requestId})`);
    
    // Parse the webhook request from Dialogflow CX
    const body: WebhookRequest = await request.json();
    
    console.log(`📥 Webhook request (${requestId}):`, JSON.stringify(body, null, 2));
    
    // Enhanced validation with detailed error messages
    const validation = validateWebhookRequest(body);
    if (!validation.valid) {
      console.error(`❌ Webhook validation failed (${requestId}):`, validation.errors);
      
      return NextResponse.json({
        fulfillmentResponse: {
          messages: [{
            text: {
              text: [`Λάθος αίτημα: ${validation.errors.join(', ')}`]
            }
          }]
        },
        sessionInfo: {
          parameters: {
            'webhook-error': true,
            'error-type': 'validation',
            'error-details': validation.errors,
            'request-id': requestId
          }
        }
      }, { status: 400 });
    }
    
    // Log webhook call for debugging (following Google Cloud documentation best practices)
    logWebhookCall(body, requestId);
    
    // Process the webhook request
    const response: WebhookResponse = await handleWebhookRequest(body);
    
    const processingTime = Date.now() - startTime;
    console.log(`📤 Webhook response (${requestId}, ${processingTime}ms):`, JSON.stringify(response, null, 2));
    
    // Add debugging headers
    const responseHeaders = {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      'X-Processing-Time': processingTime.toString(),
      'X-Dialogflow-Session': extractSessionId(body.sessionInfo.session),
      'X-Webhook-Tag': body.fulfillmentInfo.tag
    };
    
    // Return the response to Dialogflow CX
    return NextResponse.json(response, {
      status: 200,
      headers: responseHeaders
    });
    
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    console.error(`❌ Webhook endpoint error (${requestId}, ${processingTime}ms):`, error);
    
    // Log detailed error information for debugging
    logWebhookError(error, requestId, processingTime);
    
    // Return error response following Dialogflow CX webhook format
    return NextResponse.json({
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
          'error-type': 'internal',
          'error-message': error.message,
          'request-id': requestId,
          'processing-time-ms': processingTime
        }
      }
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        'X-Error-Type': error.name || 'Unknown',
        'X-Processing-Time': processingTime.toString()
      }
    });
  }
}

// Enhanced webhook request validation
function validateWebhookRequest(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check required fields
  if (!body.fulfillmentInfo?.tag) {
    errors.push('Missing fulfillment tag');
  }
  
  if (!body.sessionInfo?.session) {
    errors.push('Missing session info');
  }
  
  // Validate session path format
  if (body.sessionInfo?.session && !isValidSessionPath(body.sessionInfo.session)) {
    errors.push('Invalid session path format');
  }
  
  // Validate fulfillment tag format
  if (body.fulfillmentInfo?.tag && !isValidFulfillmentTag(body.fulfillmentInfo.tag)) {
    errors.push('Invalid fulfillment tag format');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Validate session path format
function isValidSessionPath(sessionPath: string): boolean {
  // Expected format: projects/.../locations/.../agents/.../sessions/...
  const sessionPathRegex = /^projects\/[^\/]+\/locations\/[^\/]+\/agents\/[^\/]+\/sessions\/[^\/]+$/;
  return sessionPathRegex.test(sessionPath);
}

// Validate fulfillment tag format
function isValidFulfillmentTag(tag: string): boolean {
  // Fulfillment tags should be alphanumeric with hyphens/underscores
  const tagRegex = /^[a-zA-Z0-9_-]+$/;
  return tagRegex.test(tag) && tag.length > 0 && tag.length <= 100;
}

// Log webhook call for debugging (following Google Cloud documentation)
function logWebhookCall(request: WebhookRequest, requestId: string): void {
  const sessionId = extractSessionId(request.sessionInfo.session);
  
  console.log(`📋 Webhook Debug Info (${requestId}):`);
  console.log(`🔗 Session ID: ${sessionId}`);
  console.log(`🏷️ Fulfillment Tag: ${request.fulfillmentInfo.tag}`);
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
  const parts = sessionPath.split('/');
  return parts[parts.length - 1] || sessionPath;
}

// Log webhook errors with detailed information
function logWebhookError(error: any, requestId: string, processingTime: number): void {
  console.error(`🚨 Webhook Error Details (${requestId}):`);
  console.error(`⏱️ Processing Time: ${processingTime}ms`);
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

// Generate unique request ID for correlation
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Health check endpoint for Dialogflow CX webhook
export async function GET(request: NextRequest) {
  console.log('🔍 Webhook endpoint GET request for health check');
  
  return NextResponse.json({
    status: 'healthy',
    endpoint: 'Dialogflow CX Webhook',
    timestamp: new Date().toISOString(),
    capabilities: [
      'Webhook request processing',
      'Enhanced error handling',
      'Debugging and logging',
      'Request correlation'
    ]
  }, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
