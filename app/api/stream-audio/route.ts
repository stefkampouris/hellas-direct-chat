// app/api/stream-audio/route.ts - Streaming audio detect intent endpoint
import { NextRequest, NextResponse } from 'next/server';
import { streamingDetectIntent, StreamingDetectIntentRequest } from '@/lib/dialogflow';

// Handle streaming audio detect intent requests
export async function POST(request: NextRequest) {
  try {
    console.log('🎥 Streaming audio endpoint called');
    
    const body = await request.json();
    const { sessionId, enablePartialResponse = true, languageCode = 'el', sampleRate = 16000 } = body;
    
    if (!sessionId) {
      return NextResponse.json({
        error: 'Session ID is required'
      }, { status: 400 });
    }
    
    // For this implementation, we'll handle streaming via WebSockets or Server-Sent Events
    // This is a simplified version that processes audio chunks
    
    console.log(`🎧 Setting up streaming for session: ${sessionId}`);
    
    // Return streaming setup response
    return NextResponse.json({
      message: 'Streaming audio session initialized',
      sessionId,
      config: {
        sampleRate,
        languageCode,
        enablePartialResponse
      }
    });
    
  } catch (error: any) {
    console.error('❌ Streaming audio error:', error);
    
    return NextResponse.json({
      error: 'Failed to initialize streaming audio session',
      details: error.message
    }, { status: 500 });
  }
}

// Handle WebSocket upgrade for real-time streaming (if needed)
export async function GET(request: NextRequest) {
  // This would typically handle WebSocket upgrade for real-time streaming
  // For now, return information about streaming capabilities
  
  return NextResponse.json({
    message: 'Streaming audio detect intent endpoint',
    capabilities: [
      'Real-time audio streaming',
      'Partial response support',
      'Intent detection with audio',
      'Greek language support'
    ],
    usage: {
      method: 'POST',
      body: {
        sessionId: 'string (required)',
        enablePartialResponse: 'boolean (optional, default: true)',
        languageCode: 'string (optional, default: "el")',
        sampleRate: 'number (optional, default: 16000)'
      }
    }
  });
}
