// app/api/webhook/route.ts - Dialogflow CX Webhook endpoint
import { NextRequest, NextResponse } from 'next/server';
import { WebhookRequest, WebhookResponse } from '@/lib/dialogflow';
import { handleWebhookRequest } from '@/lib/webhook-handlers';

// Allow webhook to be called from Dialogflow
export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Webhook endpoint called');
    
    // Parse the webhook request from Dialogflow CX
    const body: WebhookRequest = await request.json();
    
    console.log('📥 Webhook request:', JSON.stringify(body, null, 2));
    
    // Validate required fields
    if (!body.fulfillmentInfo?.tag) {
      console.error('❌ Missing fulfillment tag in webhook request');
      return NextResponse.json({
        fulfillmentResponse: {
          messages: [{
            text: {
              text: ['Λάθος αίτημα. Δεν βρέθηκε το tag του fulfillment.']
            }
          }]
        }
      }, { status: 400 });
    }
    
    if (!body.sessionInfo?.session) {
      console.error('❌ Missing session info in webhook request');
      return NextResponse.json({
        fulfillmentResponse: {
          messages: [{
            text: {
              text: ['Λάθος αίτημα. Δεν βρέθηκαν πληροφορίες session.']
            }
          }]
        }
      }, { status: 400 });
    }
    
    // Process the webhook request
    const response: WebhookResponse = handleWebhookRequest(body);
    
    console.log('📤 Webhook response:', JSON.stringify(response, null, 2));
    
    // Return the response to Dialogflow CX
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
  } catch (error: any) {
    console.error('❌ Webhook endpoint error:', error);
    
    // Return error response to Dialogflow CX
    const errorResponse: WebhookResponse = {
      fulfillmentResponse: {
        messages: [{
          text: {
            text: ['Υπήρξε ένα εσωτερικό λάθος. Παρακαλώ δοκιμάστε ξανά αργότερα.']
          }
        }]
      }
    };
    
    return NextResponse.json(errorResponse, {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

// Handle GET requests for webhook validation
export async function GET(request: NextRequest) {
  console.log('🔍 Webhook endpoint GET request for validation');
  
  return NextResponse.json({
    message: 'Hellas Direct Dialogflow CX Webhook is active',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
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
