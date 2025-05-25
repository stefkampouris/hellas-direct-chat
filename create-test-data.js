// Create test incidents for dashboard testing
const { DatabaseService } = require('./lib/supabase.ts');

async function createTestData() {
  console.log('🧪 Creating test data for dashboard...\n');
  
  try {
    // Create test users first
    const testUsers = [
      {
        full_name: 'Maria Papadopoulos',
        registration_number: 'ABC1234',
        phone_number: '+30210123456',
        email: 'maria.papadopoulos@example.com',
        address: 'Athens, Greece'
      },
      {
        full_name: 'Nikos Stavros',
        registration_number: 'XYZ5678',
        phone_number: '+30231098765',
        email: 'nikos.stavros@example.com',
        address: 'Thessaloniki, Greece'
      },
      {
        full_name: 'Elena Kostas',
        registration_number: 'DEF9876',
        phone_number: '+30694123456',
        email: 'elena.kostas@example.com',
        address: 'Patras, Greece'
      }
    ];

    const createdUsers = [];
    for (const userData of testUsers) {
      console.log(`📝 Creating user: ${userData.full_name}`);
      const user = await DatabaseService.createUser(userData);
      if (user) {
        console.log(`✅ Created user: ${user.full_name} (ID: ${user.id})`);
        createdUsers.push(user);
      } else {
        console.log(`❌ Failed to create user: ${userData.full_name}`);
      }
    }

    // Create test incidents
    const testIncidents = [
      {
        user_id: createdUsers[0]?.id,
        registration_number: 'ABC1234',
        location: 'Εθνική Οδός Αθηνών-Θεσσαλονίκης, κοντά στη Λαμία',
        description: 'Το αυτοκίνητό μου χάλασε στον αυτοκινητόδρομο. Χρειάζομαι άμεση βοήθεια.',
        case_type: 'RA',
        possible_vehicle_malfunction: 'Πρόβλημα μηχανής - καπνοί από το καπό',
        is_fast_case: false,
        is_fraud_case: 0
      },
      {
        user_id: createdUsers[1]?.id,
        registration_number: 'XYZ5678',
        location: 'Κέντρο Αθηνών, οδός Πανεπιστημίου',
        description: 'Είχα ένα μικρό ατύχημα στην Αθήνα. Θέλω να κάνω αίτηση αποζημίωσης.',
        case_type: 'AC',
        final_vehicle_destination: 'Εξουσιοδοτημένο συνεργείο BMW, Αθήνα',
        is_fast_case: false,
        is_fraud_case: 0
      },
      {
        user_id: createdUsers[2]?.id,
        registration_number: 'DEF9876',
        location: 'Πάτρα, κοντά στο λιμάνι',
        description: 'Ερώτηση για την κάλυψη της ασφάλειάς μου για διεθνή ταξίδια.',
        case_type: 'OTHER',
        is_fast_case: true,
        is_fraud_case: 0
      }
    ];

    for (const incidentData of testIncidents) {
      if (incidentData.user_id) {
        console.log(`📝 Creating incident for user: ${incidentData.registration_number}`);
        const incident = await DatabaseService.createIncident(incidentData);
        if (incident) {
          console.log(`✅ Created incident: ${incident.id}`);
        } else {
          console.log(`❌ Failed to create incident for: ${incidentData.registration_number}`);
        }
      }
    }

    console.log('\n✅ Test data creation completed!');
    console.log('🌐 Visit http://localhost:3001/dashboard to see the results');

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  }
}

// Run the test
createTestData();
