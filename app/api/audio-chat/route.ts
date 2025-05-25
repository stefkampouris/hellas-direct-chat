// app/api/audio-chat/route.ts - API route for handling audio input to Dialogflow
import { NextRequest, NextResponse } from 'next/server';
import { detectIntentFromAudio, DialogflowAudioRequest } from '../../../lib/dialogflow';
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import "dotenv/config";

// Helper function to convert ReadableStream to Buffer
async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (value) {
      chunks.push(value);
    }
  }
  return Buffer.concat(chunks);
}

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
    const dialogflowResult = await detectIntentFromAudio({
      sessionId,
      inputAudio,
      sampleRate,
      languageCode
    });

    console.log('✅ Dialogflow response received:', {
      intent: dialogflowResult.intent,
      confidence: dialogflowResult.confidence,
      responseLength: dialogflowResult.response.length
    });

    let audioBase64: string | null = null;
    if (dialogflowResult.response) {
      try {
        console.log('🎙️ Converting Dialogflow text response to speech using ElevenLabs...');
        const elevenlabs = new ElevenLabsClient({
          apiKey: process.env.ELEVENLABS_API_KEY, // Ensure API key is explicitly passed or configured
        });
        const audioStream = await elevenlabs.textToSpeech.convert(
          "0oYUKTNPbymIKVAkDQqh", // This is the voice_id
          {
            text: dialogflowResult.response,
            modelId: "eleven_multilingual_v2", // Corrected property name to camelCase
            outputFormat: "mp3_44100_128", // Corrected property name to camelCase
          }
        );

        if (!(audioStream instanceof ReadableStream)) {
          throw new Error("ElevenLabs SDK did not return a ReadableStream.");
        }
        
        const audioBuffer = await streamToBuffer(audioStream as ReadableStream<Uint8Array>);
        audioBase64 = audioBuffer.toString('base64');
        console.log('🔊 ElevenLabs audio generated and converted to base64.');
      } catch (elevenLabsError: any) {
        console.error('❌ ElevenLabs TTS error:', elevenLabsError);
        // Optionally, you might want to return the Dialogflow response even if TTS fails
        // For now, we'll just log the error and the response won't include audio.
      }
    }

    const finalResponse = {
      ...dialogflowResult,
      audioResponse: audioBase64, // Add base64 audio string to the response
    };

    console.log('✅ Audio chat API response (with ElevenLabs audio):', {
      intent: finalResponse.intent,
      confidence: finalResponse.confidence,
      responseLength: finalResponse.response.length,
      hasAudio: !!finalResponse.audioResponse,
    });

    return NextResponse.json(finalResponse);
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
