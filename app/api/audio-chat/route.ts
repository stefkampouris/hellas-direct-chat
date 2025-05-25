// app/api/audio-chat/route.ts - API route for handling audio input to Dialogflow
import { NextRequest, NextResponse } from 'next/server';
import { detectIntentFromAudio, DialogflowAudioRequest } from '../../../lib/dialogflow';

export async function POST(request: NextRequest) {
  try {
    console.log('🎤 Audio chat API called');
    
    const body = await request.json();
    const { sessionId, inputAudio, sampleRate, languageCode }: DialogflowAudioRequest = body;

    // Validate required fields
    if (!sessionId || !inputAudio) {
      console.error('❌ Missing required fields:', { sessionId: !!sessionId, inputAudio: !!inputAudio });
      return NextResponse.json(
        { error: 'Session ID and input audio are required' },
        { status: 400 }
      );
    }

    console.log('📨 Processing audio request for session:', sessionId);
    console.log('🎵 Audio data length:', inputAudio.length);
    console.log('📊 Sample rate:', sampleRate || 'default (16000)');
    console.log('🌍 Language:', languageCode || 'default (el)');    // Send audio to Dialogflow
    const result = await detectIntentFromAudio({
      sessionId,
      inputAudio,
      sampleRate,
      languageCode
    });

    console.log('✅ Audio chat API response:', {
      intent: result.intent,
      confidence: result.confidence,
      responseLength: result.response.length
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ Audio chat API error:', error);
    
    // Return appropriate error message based on error type
    let errorMessage = 'An error occurred while processing your audio request';
    let statusCode = 500;

    if (error.message?.includes('No DesignTimeAgent found')) {
      errorMessage = 'Dialogflow agent not configured. Please check your setup.';
      statusCode = 503;
    } else if (error.message?.includes('Authentication failed')) {
      errorMessage = 'Authentication failed. Please check your credentials.';
      statusCode = 401;
    } else if (error.message?.includes('Permission denied')) {
      errorMessage = 'Permission denied. Please check your API permissions.';
      statusCode = 403;
    } else if (error.message?.includes('Invalid audio format')) {
      errorMessage = 'Invalid audio format. Please ensure audio is properly encoded.';
      statusCode = 400;
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: error.message || 'Unknown error'
      },
      { status: statusCode }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
