import { NextRequest, NextResponse } from 'next/server';
import { sendMessageToDialogflow, type DialogflowResponse } from '../../../lib/dialogflow';

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    console.log(`Received message: "${message}"`);
    console.log(`Session ID: ${sessionId || 'new session'}`);    // Send message to Dialogflow
    const dialogflowResponse: DialogflowResponse = await sendMessageToDialogflow(message, sessionId);

    console.log('Dialogflow response received successfully');
    console.log('📥 Dialogflow Response Details:');
    console.log('  💬 Response Message:', dialogflowResponse.response);
    console.log('  🎯 Intent:', dialogflowResponse.intent || 'No intent detected');
    console.log('  📊 Confidence:', dialogflowResponse.confidence || 'No confidence score');
    console.log('  📄 Current Page:', dialogflowResponse.currentPage || 'No page info');
    console.log('  🔗 Session ID:', dialogflowResponse.sessionId);
    if (dialogflowResponse.parameters) {
      console.log('  📋 Parameters:', JSON.stringify(dialogflowResponse.parameters, null, 2));
    }

    return NextResponse.json({
      response: dialogflowResponse.response,
      sessionId: dialogflowResponse.sessionId,
      intent: dialogflowResponse.intent,
      confidence: dialogflowResponse.confidence,
    });

  } catch (error: unknown) {
    console.error('API Error:', error);
    
    // Provide more specific error messages based on the error type
    let userMessage = 'Παρουσιάστηκε πρόβλημα σύνδεσης. Παρακαλώ δοκιμάστε ξανά σε λίγο.';
    
    if (error instanceof Error) {
      if (error.message.includes('agent not found') || error.message.includes('DesignTimeAgent')) {
        console.error('🚨 Dialogflow Setup Required:');
        console.error('1. Go to https://dialogflow.cloud.google.com/');
        console.error('2. Create a new Dialogflow ES agent');
        console.error('3. Link it to your Google Cloud project: hellas-direct-chat');
        console.error('4. Create some intents and training phrases');
        console.error('5. Follow the guide in DIALOGFLOW_AGENT_SETUP.md');
        userMessage = 'Η υπηρεσία chatbot δεν είναι διαθέσιμη αυτή τη στιγμή. Παρακαλώ δοκιμάστε αργότερα.';
      } else if (error.message.includes('Authentication failed')) {
        console.error('🚨 Authentication Error: Check your service account credentials');
        userMessage = 'Σφάλμα πιστοποίησης. Παρακαλώ επικοινωνήστε με την υποστήριξη.';
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to process message',
        response: userMessage
      }, 
      { status: 500 }
    );
  }
}
