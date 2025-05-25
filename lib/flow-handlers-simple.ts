// lib/flow-handlers-simple.ts - Simplified synchronous flow handlers
import { WebhookRequest, WebhookResponse } from './dialogflow';
import { DatabaseService, Incident, User } from './supabase'; // Updated import
import fs from 'fs';
import path from 'path';

export interface FlowContext { // Ensure FlowContext can hold all necessary parameters from sessionInfo
  sessionId: string;
  caseId?: string; // This will be the database ID (UUID) for an Incident
  // case_number is removed as Incident type doesn't have it, caseId (UUID) will be used.
  step: string;
  parameters: Record<string, any>; // This will hold all session parameters from Dialogflow
}

// Simple synchronous flow orchestrator
export class FlowOrchestrator {
    static async handleWebhookFlow(request: WebhookRequest): Promise<WebhookResponse> {
    const tag = request.fulfillmentInfo.tag;
    const sessionId = request.sessionInfo.session;
    const parameters = request.sessionInfo.parameters || {}; 
    
    const context: FlowContext = {
      sessionId,
      caseId: parameters.case_id, // This is the Incident UUID
      step: tag,
      parameters
    };
    
    console.log(`🎯 Processing flow step: ${tag} with context:`, JSON.stringify(context, null, 2));
    console.log(`📋 Session parameters read from memory:`, JSON.stringify(parameters, null, 2));
    
    try {
      switch (tag) {
        case 'greeting':
          return this.handleGreeting(context); // No async needed for greeting
          
        case 'collect.registration':
          return await this.handleRegistrationNumber(context);
          
        case 'collect.customer_name':
          return await this.handleCustomerName(context);
          
        case 'classify.incident':
          return await this.classifyIncident(context);
          
        case 'collect.location':
          return await this.collectLocation(context);
          
        case 'collect.destination':
          return await this.collectFinalDestination(context);
          
        case 'collect.ac_details':
          return this.collectACDetails(context); // No DB interaction currently, can be made async if needed
          
        case 'collect.ra_details':
          return this.collectRADetails(context); // No DB interaction currently, can be made async if needed
          
        case 'process.rules':
          return await this.processRules(context);
          
        case 'finalize.case':
          return await this.finalizeCase(context);
          
        default:
          return {
            fulfillmentResponse: {
              messages: [{
                text: {
                  text: ['Δεν κατάλαβα το αίτημά σας. Μπορείτε να το επαναλάβετε;']
                }
              }]
            }
          };
      }
    } catch (error) {
      console.error('❌ Flow processing error:', error);
      return {
        fulfillmentResponse: {
          messages: [{
            text: {
              text: ['Υπήρξε ένα εσωτερικό λάθος. Παρακαλώ δοκιμάστε ξανά αργότερα.']
            }
          }]
        }
      };
    }
  }
  private static async handleGreeting(context: FlowContext): Promise<WebhookResponse> {
    console.log(`[FlowHandler] handleGreeting called`);
    
    // Create a new incident when a conversation starts
    // Initially, we only have the session ID
    const newIncident: Partial<Omit<Incident, 'id' | 'created_at'>> & { user_id: string } = {
      // Use a placeholder user_id until we can update it with the actual user
      user_id: '00000000-0000-0000-0000-000000000000', // Placeholder that will be updated later
      registration_number: null,
      location: null,
      description: null,
      case_type: null
    };
    
    try {
      const incident = await DatabaseService.createIncident(newIncident);
      
      if (incident) {
        console.log(`✅ Created new incident with ID: ${incident.id}`);
        
        return {
          fulfillmentResponse: {
            messages: [{
              text: {
                text: ['Καλησπέρα! Είμαι η εικονική βοηθός της Hellas Direct. Πώς μπορώ να σας βοηθήσω σήμερα;']
              }
            }]
          },
          sessionInfo: {
            parameters: {
              ...context.parameters,
              case_id: incident.id // Store the incident ID in the session
            }
          }
        };
      }
    } catch (error) {
      console.error('Error creating incident:', error);
    }
    
    // If there was an error, return the default response without case_id
    return {
      fulfillmentResponse: {
        messages: [{
          text: {
            text: ['Καλησπέρα! Είμαι η εικονική βοηθός της Hellas Direct. Πώς μπορώ να σας βοηθήσω σήμερα;']
          }
        }]
      }
    };
  }
    private static async handleRegistrationNumber(context: FlowContext): Promise<WebhookResponse> { 
    const registrationNumber = context.parameters.registration_number;
    
    console.log(`[FlowHandler] handleRegistrationNumber called with registration_number: ${registrationNumber}`); // Added log

    if (!registrationNumber) {
      return {
        fulfillmentResponse: {
          messages: [{
            text: {
              text: ['Παρακαλώ δώστε μου τον αριθμό κυκλοφορίας του οχήματός σας.']
            }
          }]
        }
      };
    }
    
    let user: User | null = await DatabaseService.getUserByRegistrationNumber(registrationNumber);
    
    if (!user) {
      // Create a new user when license plate is not found
      console.log(`📝 Creating new user for registration number: ${registrationNumber}`);
      
      const newUserData = {
        registration_number: registrationNumber,
        full_name: null, // Will be collected later
        afm: null,
        starting_date: new Date().toISOString(), // Set current date as starting date
        ending_at: null, // Can be updated later
        phone_number: null,
        email: null,
        address: null
      };
      
      user = await DatabaseService.createUser(newUserData);
      
      if (!user) {
        return {
          fulfillmentResponse: {
            messages: [{
              text: {
                text: [`Παρουσιάστηκε πρόβλημα κατά την καταχώρηση του οχήματος με αριθμό κυκλοφορίας ${registrationNumber}. Παρακαλώ δοκιμάστε ξανά.`]
              }
            }]
          }
        };
      }
      
      console.log(`✅ Created new user with ID: ${user.id} for registration: ${registrationNumber}`);
      
      // For new users, we proceed without checking policy dates since they're just registering
      console.log(`📝 Writing parameters to session memory for new user:`, {
        registration_number: user.registration_number,
        policy_holder_name: null, // Will be collected
        policy_id: user.id,
        is_new_user: true
      });      // Update existing incident with registration_number and user_id
      if (context.parameters.case_id) {
        try {
          const incidentId = context.parameters.case_id;
          
          // First, update the registration_number
          const updatedIncident = await DatabaseService.updateIncident(incidentId, {
            registration_number: user.registration_number
          });
          
          // Then, update the user_id with our special method
          const userUpdatedIncident = await DatabaseService.updateIncidentUserId(incidentId, user.id);
          
          if (updatedIncident && userUpdatedIncident) {
            console.log(`✅ Updated incident ${incidentId} with user_id: ${user.id} and registration_number: ${user.registration_number}`);
          } else {
            console.warn(`⚠️ Partial update for incident ${incidentId}. Check if both user_id and registration_number were updated.`);
          }
          
        } catch (error) {
          console.error('Error updating incident with user info:', error);
        }
      }
      
      return {
        fulfillmentResponse: {
          messages: [{
            text: {
              text: [`Καταχώρησα το όχημα με αριθμό κυκλοφορίας ${user.registration_number}. Μπορείτε να μου πείτε το ονοματεπώνυμό σας;`]
            }
          }]
        },
        sessionInfo: {
          parameters: {
            ...context.parameters,
            registration_number: user.registration_number,
            policy_holder_name: null,
            vehicle_info: user.registration_number,
            policy_id: user.id,
            user_id: user.id,
            policy_active: false, // New user, no active policy yet
            is_new_user: true,
            policy_verified_at: new Date().toISOString()
          }
        }
      };
    }
    
    const now = new Date();
    const startDate = user.starting_date ? new Date(user.starting_date) : null;
    const endDate = user.ending_at ? new Date(user.ending_at) : null;
    const isActive = startDate && endDate && startDate <= now && endDate >= now;

    if (!isActive) {
      return {
        fulfillmentResponse: {
          messages: [{
            text: {
              text: [`Το ασφαλιστήριο συμβόλαιο για το όχημα με αριθμό κυκλοφορίας ${user.registration_number} δεν είναι ενεργό. Παρακαλώ επικοινωνήστε με την εξυπηρέτηση πελατών.`]
            }
          }]
        }
      };
    }    // At this point, user is guaranteed to be non-null and active
    console.log(`📝 Writing parameters to session memory:`, {
      registration_number: user.registration_number,
      policy_holder_name: user.full_name,
      policy_id: user.id,
      policy_active: true
    });
    
    return {
      fulfillmentResponse: {
        messages: [{
          text: {
            text: [`Βρήκα το ενεργό ασφαλιστήριό σας για το όχημα με αριθμό κυκλοφορίας ${user.registration_number}. Μπορείτε να μου πείτε το ονοματεπώνυμό σας;`]
          }
        }]
      },
      sessionInfo: {
        parameters: {
          ...context.parameters,
          // Write to session memory - these will be available in future interactions
          registration_number: user.registration_number,
          policy_holder_name: user.full_name,
          vehicle_info: user.registration_number,
          policy_id: user.id,
          user_id: user.id,
          policy_active: true,
          policy_start_date: user.starting_date,
          policy_end_date: user.ending_at,
          // Add timestamp for when policy was verified
          policy_verified_at: new Date().toISOString()
        }
      }
    };
  }
    private static async handleCustomerName(context: FlowContext): Promise<WebhookResponse> { 
    const customerName = context.parameters.customer_name;
    const policyHolderName = context.parameters.policy_holder_name;
    const registrationNumber = context.parameters.registration_number;
    const userId = context.parameters.policy_id; // This is user.id from the previous step
    const isNewUser = context.parameters.is_new_user;
    
    if (!customerName) {
      return {
        fulfillmentResponse: {
          messages: [{
            text: {
              text: ['Παρακαλώ δώστε μου το ονοματεπώνυμό σας.']
            }
          }]
        }
      };
    }
        
    if (!registrationNumber || !userId) {
      return {
        fulfillmentResponse: {
          messages: [{ text: { text: ['Προέκυψε ένα σφάλμα. Απαιτούμενες πληροφορίες (αριθμός κυκλοφορίας ή αναγνωριστικό χρήστη) δεν είναι διαθέσιμες.'] } }]
        }
      };
    }

    // If this is a new user, update their full name
    if (isNewUser) {
      console.log(`📝 Updating new user ${userId} with full name: ${customerName}`);
      const updatedUser = await DatabaseService.updateUser(userId, { full_name: customerName });
      if (!updatedUser) {
        console.warn(`⚠️ Failed to update user ${userId} with name, but continuing with incident creation`);
      }
    }
    
    // Create incident for both existing and new users
    const newIncidentData: Partial<Omit<Incident, 'id' | 'created_at'>> & { user_id: string } = {
      user_id: userId,
      registration_number: registrationNumber,
      location: null,
      description: isNewUser 
        ? `Initial report from new user: ${customerName}. Registration: ${registrationNumber}.`
        : `Initial report from: ${customerName}. Policy holder: ${policyHolderName}.`,
      case_type: 'OTHER', // Default, will be updated by classifyIncident
      final_vehicle_destination: null,
      possible_vehicle_malfunction: null,
      possible_problem_resolution: null,
      recommended_garage: null,
      is_destination_out_perfecture: null,
      delay_voucher_issued: false,
      geolocation_link_sent: null,
      responsible_declaration_required: null,
      is_fast_case: false,
      communication_quality: null,
      case_summary: null,
      images: null,
    };

    const createdIncident = await DatabaseService.createIncident(newIncidentData);

    if (!createdIncident || !createdIncident.id) {
      return {
        fulfillmentResponse: {
          messages: [{ text: { text: ['Παρουσιάστηκε πρόβλημα κατά τη δημιουργία της υπόθεσης. Παρακαλώ δοκιμάστε ξανά.'] } }]
        }
      };
    }
    
    const dbIncidentId = createdIncident.id; 
    
    // Different handling for new vs existing users
    let message: string;
    let isInsuredPerson: boolean;
    
    if (isNewUser) {
      isInsuredPerson = true; // New user is registering themselves
      message = `Ευχαριστώ ${customerName}. Καταχώρησα τα στοιχεία σας και η υπόθεσή σας έχει το αναγνωριστικό ${dbIncidentId}. Μπορείτε να μου περιγράψετε το πρόβλημα που αντιμετωπίζετε;`;
    } else {
      isInsuredPerson = customerName.toLowerCase() === policyHolderName?.toLowerCase();
      message = isInsuredPerson 
        ? `Ευχαριστώ ${customerName}. Η υπόθεσή σας έχει το αναγνωριστικό ${dbIncidentId}. Μπορείτε να μου περιγράψετε το πρόβλημα που αντιμετωπίζετε;`
        : `Ευχαριστώ ${customerName}. Καταλαβαίνω ότι καλείτε για την ασφάλιση του ${policyHolderName}. Η υπόθεσή σας έχει το αναγνωριστικό ${dbIncidentId}. Μπορείτε να μου περιγράψετε το πρόβλημα που αντιμετωπίζετε;`;
    }
      console.log(`📝 Writing parameters to session memory:`, {
      customer_name: customerName,
      case_id: dbIncidentId,
      is_insured_person: isInsuredPerson
    });
    
    return {
      fulfillmentResponse: {
        messages: [{
          text: {
            text: [message]
          }
        }]
      },
      sessionInfo: {
        parameters: {
          ...context.parameters,
          case_id: dbIncidentId, // Storing the Incident UUID as case_id
          is_insured_person: isInsuredPerson
          // case_number is removed as it's not on Incident type
        }
      }
    };
  }
  
  private static async classifyIncident(context: FlowContext): Promise<WebhookResponse> {
    const description = context.parameters.incident_description;
    const caseId = context.caseId; // This is Incident UUID
    
    if (!description) {
      return {
        fulfillmentResponse: {
          messages: [{
            text: {
              text: ['Παρακαλώ περιγράψτε μου το πρόβλημα που αντιμετωπίζετε.']
            }
          }]
        }
      };
    }
    
    const incidentType = this.classifyIncidentType(description); // AC, RA, or OTHER
    
    if (caseId && incidentType !== 'OTHER') {
      try {
        await DatabaseService.updateIncident(caseId, { case_type: incidentType, description: description });
      } catch (dbError) {
        console.error('Failed to update incident with type and description:', dbError);
      }
    } else if (caseId) { // Update description even if OTHER
        try {
            await DatabaseService.updateIncident(caseId, { description: description });
        } catch (dbError) {
            console.error('Failed to update incident with description:', dbError);
        }
    }
    
    if (incidentType === 'OTHER') {
      return {
        fulfillmentResponse: {
          messages: [{
            text: {
              text: ['Λυπάμαι, αλλά μπορώ να βοηθήσω μόνο με ατυχήματα και οδική βοήθεια. Για άλλα θέματα, παρακαλώ επικοινωνήστε με το τμήμα εξυπηρέτησης πελατών στο 210-1234567.']
            }
          }]
        }
      };
    }
    
    const message = incidentType === 'AC' 
      ? 'Καταλαβαίνω ότι έχετε ατύχημα. Θα συλλέξω τις απαραίτητες πληροφορίες για να σας βοηθήσω.'
      : 'Καταλαβαίνω ότι χρειάζεστε οδική βοήθεια. Θα συλλέξω τις απαραίτητες πληροφορίες για να σας βοηθήσω.';
      console.log(`📝 Writing parameters to session memory:`, {
      incident_type: incidentType,
      incident_description: description
    });
    
    return {
      fulfillmentResponse: {
        messages: [{
          text: {
            text: [message]
          }
        }]
      },
      sessionInfo: {
        parameters: {
          ...context.parameters,
          incident_type: incidentType
        }
      }
    };
  }
  
  private static async collectLocation(context: FlowContext): Promise<WebhookResponse> {
    const location = context.parameters.location;
    const caseId = context.caseId; // Incident UUID
    
    if (!location) {
      return {
        fulfillmentResponse: {
          messages: [{
            text: {
              text: ['Πού ακριβώς βρίσκεστε; Παρακαλώ δώστε μου όσο το δυνατόν πιο ακριβή τοποθεσία.']
            }
          }]
        }
      };
    }
    
    const needsGeolocation = this.needsGeolocationLink(location);
    
    if (caseId) {
      try {        const updates: Partial<Omit<Incident, 'id' | 'created_at' | 'user_id'>> = {
            location: location,
            geolocation_link_sent: needsGeolocation ? "https://geolocation.hellasdirect.gr/" : null 
        };
        await DatabaseService.updateIncident(caseId, updates);
      } catch (dbError) {
        console.error('Failed to update incident with location:', dbError);
      }
    }
      const message = needsGeolocation 
      ? `Καταλαβαίνω τη τοποθεσία. Για να είμαι πιο ακριβής, μπορείτε να μου στείλετε την ακριβή τοποθεσία σας μέσω αυτού του συνδέσμου: https://geolocation.hellasdirect.gr/\n\nΤώρα, πού θα θέλατε να μεταφερθεί το όχημά σας;`
      : 'Καταλαβαίνω τη τοποθεσία. Πού θα θέλατε να μεταφερθεί το όχημά σας;';
      console.log(`📝 Writing parameters to session memory:`, {
      location: location,
      needs_geolocation: needsGeolocation
    });
    
    return {
      fulfillmentResponse: {
        messages: [{
          text: {
            text: [message]
          }
        }]
      },
      sessionInfo: {
        parameters: {
          ...context.parameters,
          needs_geolocation: needsGeolocation
        }
      }
    };
  }
  
  private static async collectFinalDestination(context: FlowContext): Promise<WebhookResponse> {
    const finalDestination = context.parameters.final_destination;
    const caseId = context.caseId; // Incident UUID
    
    if (!finalDestination) {
      return {
        fulfillmentResponse: {
          messages: [{
            text: {
              text: ['Πού θα θέλατε να μεταφερθεί το όχημά σας;']
            }
          }]
        }
      };
    }
    
    if (caseId) {
      try {
        await DatabaseService.updateIncident(caseId, { final_vehicle_destination: finalDestination });
      } catch (dbError) {
        console.error('Failed to update incident with final destination:', dbError);
      }
    }
      console.log(`📝 Writing parameters to session memory:`, {
      final_destination: finalDestination
    });
    
    return {
      fulfillmentResponse: {
        messages: [{
          text: {
            text: ['Ευχαριστώ για τις πληροφορίες. Τώρα θα χρειαστώ μερικές επιπλέον λεπτομέρειες.']
          }
        }]
      },
      sessionInfo: {
        parameters: {
          ...context.parameters,
          final_destination: finalDestination
        }
      }
    };
  }
    private static collectACDetails(context: FlowContext): WebhookResponse {
    const incidentType = context.parameters.incident_type;
    
    console.log(`[FlowHandler] collectACDetails called for incident_type: ${incidentType}`);
    
    if (incidentType !== 'AC') {
      return this.collectRADetails(context);
    }
    
    return {
      fulfillmentResponse: {
        messages: [{
          text: {
            text: ['Υπάρχουν τραυματισμοί ή μόνο υλικές ζημίες;']
          }
        }]
      }
    };
  }
  
  private static collectRADetails(context: FlowContext): WebhookResponse {
    console.log(`[FlowHandler] collectRADetails called`);
    
    return {
      fulfillmentResponse: {
        messages: [{
          text: {
            text: ['Τι είδους βλάβη αντιμετωπίζετε; (π.χ. σκασμένο λάστιχο, μπαταρία, μηχανικό πρόβλημα)']
          }
        }]
      }
    };
  }
  
  private static async processRules(context: FlowContext): Promise<WebhookResponse> {
    const location = context.parameters.location?.toLowerCase() || '';
    const finalDestination = context.parameters.final_destination?.toLowerCase() || '';
    const caseId = context.caseId; // Incident UUID
    
    let specialConditionsText: string[] = [];
    let dbIncidentUpdates: Partial<Omit<Incident, 'id' | 'created_at' | 'user_id'>> = {};
    
    // Example: is_underground_garage is not in Incident schema, so this rule is removed/adapted
    // if (location.includes('υπόγεια') || location.includes('γκαράζ')) {
    //   specialConditionsText.push('Αφού το όχημα βρίσκεται σε υπόγειο χώρο, θα χρειαστείτε ιδιωτική υπηρεσία για να το μετακινήσετε στο δρόμο.');
    //   // dbIncidentUpdates.is_underground_garage = true; // Assuming this field does not exist
    // }
    
    const repatriationNeeded = this.isDifferentPrefecture(location, finalDestination);
    if (repatriationNeeded) {
      specialConditionsText.push('Η μεταφορά σε διαφορετικό νομό θα χρειαστεί 3-5 εργάσιμες ημέρες μετά την αρχική μεταφορά.');
      dbIncidentUpdates.is_destination_out_perfecture = true;
    }
      const geolocationLinkNeeded = location.includes('εθνική') || location.includes('αττική οδό'); // More specific for Attiki Odos
    if (geolocationLinkNeeded) { // Check if already sent from collectLocation step
        const currentIncident = caseId ? await DatabaseService.getIncidentById(caseId) : null;
        if (!currentIncident?.geolocation_link_sent) { // Send only if not already marked as sent
            specialConditionsText.push('Θα σας στείλω σύνδεσμο γεωεντοπισμού: https://geolocation.hellasdirect.gr/');
            dbIncidentUpdates.geolocation_link_sent = "https://geolocation.hellasdirect.gr/";
        }
    }

    if (caseId && Object.keys(dbIncidentUpdates).length > 0) {
        try {
            await DatabaseService.updateIncident(caseId, dbIncidentUpdates);
        } catch (dbError) {
            console.error('Failed to update incident with rule conditions:', dbError);
        }
    }
    
    const message = specialConditionsText.length > 0 
      ? specialConditionsText.join('\n\n') + '\n\nΣυνεχίζουμε με την επεξεργασία της υπόθεσης...'
      : 'Όλες οι συνθήκες ελέγχθηκαν. Συνεχίζουμε με την επεξεργασία της υπόθεσης...';
      console.log(`📝 Writing parameters to session memory:`, {
      is_destination_out_perfecture: dbIncidentUpdates.is_destination_out_perfecture,
      geolocation_link_sent: dbIncidentUpdates.geolocation_link_sent
    });
    
    return {
      fulfillmentResponse: {
        messages: [{
          text: {
            text: [message]
          }
        }]
      },
      sessionInfo: { 
        parameters: {
            ...context.parameters,
            // Pass updated fields back to Dialogflow if needed
            ...(caseId && dbIncidentUpdates.is_destination_out_perfecture !== undefined && { is_destination_out_perfecture: dbIncidentUpdates.is_destination_out_perfecture }),
            ...(caseId && dbIncidentUpdates.geolocation_link_sent !== undefined && { geolocation_link_sent: dbIncidentUpdates.geolocation_link_sent })
        }
      }
    };
  }
  
  private static async finalizeCase(context: FlowContext): Promise<WebhookResponse> { 
    const incidentType = context.parameters.incident_type; // AC or RA
    const caseId = context.caseId; // Incident UUID
    const customerName = context.parameters.customer_name;
    
    if (!caseId) {
      return {
        fulfillmentResponse: {
          messages: [{ text: { text: ['Δεν βρέθηκε αναγνωριστικό υπόθεσης για την οριστικοποίηση.'] } }]
        }
      };
    }
    
    const description = context.parameters.incident_description?.toLowerCase() || '';
    const location = context.parameters.location || '';
    const finalDestination = context.parameters.final_destination || '';

    const malfunction = this.determineMalfunction(context);
    const towingRequired = this.determineTowingNeed(context); // This function needs to be reviewed if it relies on old structure
    const garage = this.recommendGarage(context);
    const isFastTrack = incidentType === 'AC' && this.isFastTrackCase(description);

    const currentIncident = await DatabaseService.getIncidentById(caseId);
    if (!currentIncident) {
        return {
            fulfillmentResponse: {
                messages: [{ text: { text: ['Δεν ήταν δυνατή η εύρεση της υπόθεσης για οριστικοποίηση.'] } }]
            }
        };
    }

    const incidentUpdates: Partial<Omit<Incident, 'id' | 'created_at' | 'user_id'>> = {
        // status: 'ready_for_review', // No status field in Incident
        possible_vehicle_malfunction: malfunction,
        // recommended_garage is set if towing is required
        is_destination_out_perfecture: this.isDifferentPrefecture(location, finalDestination),
        case_summary: `Case ${incidentType} for ${customerName}. Location: ${location}. Destination: ${finalDestination}. Full Description: ${currentIncident.description}. Malfunction: ${malfunction}.`,
        // tags: [...] // No tags field in Incident
        is_fast_case: isFastTrack,
        // communication_quality could be set here if assessed
    };

    if (towingRequired) {
        incidentUpdates.recommended_garage = garage;
        // if there was an 'is_towing_required' field in Incident, it would be set here.
    }
    
    const updatedIncident = await DatabaseService.updateIncident(caseId, incidentUpdates);

    if (!updatedIncident) {
      return {
        fulfillmentResponse: {
          messages: [{ text: { text: ['Παρουσιάστηκε πρόβλημα κατά την οριστικοποίηση της υπόθεσης. Παρακαλώ δοκιμάστε ξανά.'] } }]
        }
      };
    }
    
    let finalMessage = `Ευχαριστώ ${customerName}. Η υπόθεσή σας (ID: ${caseId}) έχει ενημερωθεί. `;
    
    if (incidentType === 'AC') {
      finalMessage += `Το τμήμα ατυχημάτων θα επικοινωνήσει μαζί σας σύντομα.`;
      if (isFastTrack) {
        finalMessage += ` Αφού πρόκειται για fast-track περίπτωση, η διαδικασία θα ολοκληρωθεί εντός 24 ωρών.`;
      }
    } else { // RA
      finalMessage += `Η οδική βοήθεια θα φτάσει στην τοποθεσία σας σύντομα.`;
      if (towingRequired) {
        finalMessage += ` Προτείνουμε το συνεργείο: ${garage}`;
      }
    }
      console.log(`📝 Writing final parameters to session memory (clearing case_id):`, {
      case_id: undefined,
      finalized_at: new Date().toISOString()
    });
    
    return {
      fulfillmentResponse: {
        messages: [{
          text: {
            text: [finalMessage]
          }
        }]
      },
      sessionInfo: { 
        parameters: {
          ...context.parameters,
          // Optionally clear other parameters or add final ones
          case_id: undefined, // Clear case_id as flow is ending for this case
          finalized_at: new Date().toISOString()
          // case_number is not set as it's not on Incident type
        }
      }
    };
  }
  
  // Helper methods
  private static classifyIncidentType(description: string): 'AC' | 'RA' | 'OTHER' {
    const lowerDesc = description.toLowerCase();
    
    const accidentKeywords = ['ατύχημα', 'τρακάρισμα', 'σύγκρουση', 'τράκαρα', 'χτύπημα', 'ζημιά', 'κρύσταλλο', 'τζάμι'];
    const roadAssistanceKeywords = ['λάστιχο', 'μπαταρία', 'βλάβη', 'δεν παίρνει', 'κολλημένο', 'κλειδί', 'καύσιμα'];
    
    const hasAccidentKeywords = accidentKeywords.some(keyword => lowerDesc.includes(keyword));
    const hasRAKeywords = roadAssistanceKeywords.some(keyword => lowerDesc.includes(keyword));
    
    if (hasAccidentKeywords) return 'AC';
    if (hasRAKeywords) return 'RA';
    return 'OTHER';
  }
  
  private static needsGeolocationLink(location: string): boolean {
    const lowerLoc = location.toLowerCase();
    const indicators = ['εθνική', 'αττική', 'δεν ξέρω', 'κάπου', 'περίπου'];
    return indicators.some(indicator => lowerLoc.includes(indicator));
  }
  
  private static isDifferentPrefecture(location: string, destination: string): boolean {
    const prefectures = ['αθήνα', 'θεσσαλονίκη', 'πάτρα', 'ηράκλειο', 'λάρισα'];
    
    const locationPref = prefectures.find(p => location.toLowerCase().includes(p));
    const destPref = prefectures.find(p => destination.toLowerCase().includes(p));
    
    return !!(locationPref && destPref && locationPref !== destPref);
  }
  
  private static determineMalfunction(context: FlowContext): string {
    const incidentType = context.parameters.incident_type;
    const description = context.parameters.incident_description?.toLowerCase() || '';
    
    if (incidentType === 'RA') {
      if (description.includes('λάστιχο')) return 'Σκασμένο λάστιχο';
      if (description.includes('μπαταρία')) return 'Εκφορτισμένη μπαταρία';
      if (description.includes('κλειδί')) return 'Κλειδωμένο όχημα';
      return 'Μηχανική βλάβη';
    }
    
    return 'Ατύχημα οδικής κυκλοφορίας';
  }
  
  private static determineTowingNeed(context: FlowContext): boolean {
    const incidentType = context.parameters.incident_type;
    const description = context.parameters.incident_description?.toLowerCase() || '';
    
    if (incidentType === 'AC') return true;
    
    // For RA, check if it can be fixed on-spot
    const onSpotRepairs = ['λάστιχο', 'μπαταρία', 'κλειδί'];
    return !onSpotRepairs.some(repair => description.includes(repair));
  }
  
  private static recommendGarage(context: FlowContext): string {
    const location = context.parameters.location || '';
    const garagesFilePath = path.join(process.cwd(), 'public', 'garages.md');
    try {
      const markdownContent = fs.readFileSync(garagesFilePath, 'utf-8');
      const lines = markdownContent.split('\\n');
      const garages = lines.slice(2) // Skip header and separator
        .map(line => {
          const parts = line.split('|').map(part => part.trim());
          if (parts.length >= 4) {
            return {
              type: parts[1],
              name: parts[2],
              location: parts[3]
            };
          }
          return null;
        })
        .filter(garage => garage !== null && garage.name && garage.location);

      if (garages.length > 0) {
        // Simple logic: return the first garage that somewhat matches the location
        // More sophisticated matching could be implemented here (e.g., by city, district)
        const lowerLocation = location.toLowerCase();
        for (const garage of garages) {
          if (garage && garage.location.toLowerCase().includes(lowerLocation)) {
            return `${garage.name} - ${garage.location}`;
          }
        }
        // If no specific match, return the first one from the list as a generic suggestion
        if (garages[0]) {
          return `${garages[0].name} - ${garages[0].location}`;
        }
      }
    } catch (error) {
      console.error('Error reading or parsing garages.md:', error);
      // Fallback to generic message if file reading fails
    }
    
    // Fallback to original simple garage recommendation if file is empty or parsing fails
    if (location.toLowerCase().includes('αθήνα')) {
      return 'Συνεργείο Αθήνας - Λ. Αθηνών 123 (210-1234567)';
    } else if (location.toLowerCase().includes('θεσσαλονίκη')) {
      return 'Συνεργείο Θεσσαλονίκης - Μ. Αλεξάνδρου 456 (2310-987654)';
    }
    
    return 'Συνεργείο της περιοχής σας';
  }
  
  private static isFastTrackCase(description: string): boolean {
    const fastTrackKeywords = ['πίσω', 'παρκαρισμένο', 'στάθμευση', 'κρύσταλλο', 'τζάμι'];
    return fastTrackKeywords.some(keyword => description.includes(keyword));
  }
}
