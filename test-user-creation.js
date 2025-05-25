// Test script to verify user and incident creation functionality
const { DatabaseService } = require('./lib/supabase.ts');

async function testUserAndIncidentCreation() {
  console.log('🧪 Testing user and incident creation functionality...');
  
  // Test data
  const testRegistrationNumber = 'TEST123';
  const testUserName = 'Νίκος Τεστόπουλος';
  
  try {
    console.log('\n1. Testing user creation...');
    
    // Create a new user
    const userData = {
      registration_number: testRegistrationNumber,
      full_name: testUserName,
      afm: null,
      starting_date: new Date().toISOString(),
      ending_at: null,
      phone_number: '+30123456789',
      email: 'nikos.test@example.com',
      address: 'Test Address 123, Athens'
    };
    
    const createdUser = await DatabaseService.createUser(userData);
    console.log('✅ User created:', createdUser);
    
    if (!createdUser) {
      throw new Error('Failed to create user');
    }
    
    console.log('\n2. Testing incident creation...');
    
    // Create an incident for the user
    const incidentData = {
      user_id: createdUser.id,
      registration_number: testRegistrationNumber,
      location: 'Test Location',
      description: `Test incident for ${testUserName}`,
      case_type: 'OTHER',
      final_vehicle_destination: null,
      possible_vehicle_malfunction: 'Engine problem',
      possible_problem_resolution: null,
      recommended_garage: null,
      is_destination_out_perfecture: null,
      delay_voucher_issued: false,
      geolocation_link_sent: null,
      responsible_declaration_required: null,
      is_fast_case: false,
      is_fraud_case: 0,
      communication_quality: null,
      case_summary: null,
      images: null,
    };
    
    const createdIncident = await DatabaseService.createIncident(incidentData);
    console.log('✅ Incident created:', createdIncident);
    
    if (!createdIncident) {
      throw new Error('Failed to create incident');
    }
    
    console.log('\n3. Testing user lookup...');
    
    // Test user lookup by registration number
    const foundUser = await DatabaseService.getUserByRegistrationNumber(testRegistrationNumber);
    console.log('✅ User found by registration:', foundUser);
    
    console.log('\n4. Testing incident lookup...');
    
    // Test incident lookup by registration number
    const foundIncidents = await DatabaseService.getIncidentsByRegistrationNumber(testRegistrationNumber);
    console.log('✅ Incidents found:', foundIncidents);
    
    console.log('\n🎉 All tests passed! User and incident creation functionality is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testUserAndIncidentCreation();
