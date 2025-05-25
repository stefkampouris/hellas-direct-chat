// Test script for incident integration
// Run with: node test-incident-integration.js

async function testIncidentIntegration() {
  console.log('🧪 Testing Incident Integration...\n');
    // Test the webhook endpoint with a sample request
  const webhookUrl = 'http://localhost:3001/api/webhook';
  
  const sampleWebhookRequest = {
    detectIntentResponseId: 'test-response-123',
    fulfillmentInfo: {
      tag: 'greeting'
    },
    intentInfo: {
      displayName: 'Default Welcome Intent',
      confidence: 0.8
    },
    pageInfo: {
      displayName: 'Start Page'
    },
    sessionInfo: {
      session: 'projects/test-project/locations/global/agents/test-agent/sessions/test-session-123',
      parameters: {
        user_id: '00000000-0000-0000-0000-000000000000'
      }
    },
    languageCode: 'el',
    text: 'Γεια σας, είχα ένα ατύχημα με το αυτοκίνητό μου ABC1234 στην Εθνική Οδό. Χρειάζομαι βοήθεια.'
  };
  
  try {
    console.log('📤 Sending webhook request...');
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sampleWebhookRequest)
    });
    
    const result = await response.json();
    console.log('📥 Webhook response status:', response.status);
    console.log('📋 Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Webhook test successful!');
      
      // Check if incident_id was added to session parameters
      if (result.sessionInfo?.parameters?.incident_id) {
        console.log(`✅ Incident created with ID: ${result.sessionInfo.parameters.incident_id}`);
      } else {
        console.log('⚠️ No incident_id found in response parameters');
      }
    } else {
      console.log('❌ Webhook test failed');
    }
    
  } catch (error) {
    console.error('❌ Error testing webhook:', error.message);
  }
  
  console.log('\n🧪 Testing follow-up message...\n');
  
  // Test with follow-up message that should update the incident
  const followUpRequest = {
    ...sampleWebhookRequest,
    detectIntentResponseId: 'test-response-124',
    text: 'Βρίσκομαι στον Κηφισό και το αυτοκίνητό μου έχει ζημιά στο εμπρός μέρος. Θέλω να πάω στο συνεργείο.',
    sessionInfo: {
      ...sampleWebhookRequest.sessionInfo,
      parameters: {
        ...sampleWebhookRequest.sessionInfo.parameters,
        // Include incident_id if we got one from the first request
      }
    }
  };
  
  try {
    console.log('📤 Sending follow-up webhook request...');
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(followUpRequest)
    });
    
    const result = await response.json();
    console.log('📥 Follow-up response status:', response.status);
    console.log('📋 Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Follow-up webhook test successful!');
    } else {
      console.log('❌ Follow-up webhook test failed');
    }
    
  } catch (error) {
    console.error('❌ Error testing follow-up webhook:', error.message);
  }
}

// Run the test
testIncidentIntegration().catch(console.error);
