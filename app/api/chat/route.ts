import { NextRequest, NextResponse } from 'next/server';
import { sendMessageToDialogflow, type DialogflowResponse } from '../../../lib/dialogflow';

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId, parameters } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    console.log(`Received message: "${message}"`);
    console.log(`Session ID: ${sessionId || 'new session'}`);
    if (parameters) {
      console.log(`📋 Incoming parameters:`, JSON.stringify(parameters, null, 2));
    }
    
    // Send message to Dialogflow with any provided parameters
    const dialogflowResponse: DialogflowResponse = await sendMessageToDialogflow(message, sessionId, parameters);
    console.log('Dialogflow response received successfully');
      // Check if the message looks like a registration number and manually trigger our handler
    const registrationNumberPattern = /^[A-Z]{3}\d{4}$/i; // Pattern like ΒΤΜ3402
    if (registrationNumberPattern.test(message.trim())) {
      console.log('🚗 Detected registration number pattern, manually triggering handler');
      
      // Import the flow orchestrator
      const { FlowOrchestrator } = await import('../../../lib/flow-handlers-simple');
      
      // Merge existing parameters with registration number
      const mergedParameters = {
        ...dialogflowResponse.parameters,
        registration_number: message.trim()
      };
      
      // Create a mock webhook request for registration collection
      const mockRequest = {
        fulfillmentInfo: { tag: 'collect.registration' },
        sessionInfo: {
          session: dialogflowResponse.sessionId,
          parameters: mergedParameters
        }
      };
      
      try {
        const manualResponse = await FlowOrchestrator.handleWebhookFlow(mockRequest);
        if (manualResponse.fulfillmentResponse?.messages?.[0]?.text?.text?.[0]) {
          // Override the Dialogflow response with our manual handler response
          dialogflowResponse.response = manualResponse.fulfillmentResponse.messages[0].text.text[0];
          
          // Update session parameters if provided
          if (manualResponse.sessionInfo?.parameters) {
            dialogflowResponse.parameters = {
              ...dialogflowResponse.parameters,
              ...manualResponse.sessionInfo.parameters
            };
            console.log('🔄 Updated session parameters:', JSON.stringify(dialogflowResponse.parameters, null, 2));
          }
        }
      } catch (error) {
        console.error('❌ Error in manual registration handler:', error);
      }
    }
    
    console.log('📥 Dialogflow Response Details:');
    console.log('  💬 Response Message:', dialogflowResponse.response);
    console.log('  🎯 Intent:', dialogflowResponse.intent || 'No intent detected');
    console.log('  📊 Confidence:', dialogflowResponse.confidence || 'No confidence score');
    console.log('  📄 Current Page:', dialogflowResponse.currentPage || 'No page info');
    console.log('  🔗 Session ID:', dialogflowResponse.sessionId);
    if (dialogflowResponse.parameters) {
      console.log('  📋 Parameters:', JSON.stringify(dialogflowResponse.parameters, null, 2));
    }    return NextResponse.json({
      response: dialogflowResponse.response,
      sessionId: dialogflowResponse.sessionId,
      intent: dialogflowResponse.intent,
      confidence: dialogflowResponse.confidence,
      parameters: dialogflowResponse.parameters, // Include parameters in response
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
