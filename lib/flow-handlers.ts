// lib/flow-handlers.ts - Comprehensive flow handlers for Hellas Direct insurance cases
import { WebhookRequest, WebhookResponse } from './dialogflow';
import { DatabaseService, Incident, User } from './supabase'; // UPDATED: InsuranceCase -> Incident, InsurancePolicy -> User

export interface FlowContext {
  sessionId: string;
  caseId?: string;
  currentCase?: Incident; // UPDATED: InsuranceCase -> Incident
  policy?: User; // UPDATED: InsurancePolicy -> User
  step: string;
  parameters: Record<string, any>;
}

// Flow 1: Initial Greeting & Customer Identification
export class CustomerIdentificationFlow {
  
  static handleGreeting(context: FlowContext): WebhookResponse {
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
  
  static async handleRegistrationNumber(context: FlowContext): Promise<WebhookResponse> {
    const registrationNumber = context.parameters.registration_number;
    
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
    
    // Query Supabase for policy information
    const policy = await DatabaseService.getUserByRegistrationNumber(registrationNumber); // UPDATED: getPolicyByRegistration -> getUserByRegistrationNumber
    
    if (!policy) {
      return {
        fulfillmentResponse: {
          messages: [{
            text: {
              text: ['Δεν βρήκα ενεργή ασφάλιση για αυτόν τον αριθμό κυκλοφορίας. Παρακαλώ ελέγξτε τον αριθμό και δοκιμάστε ξανά.']
            }
          }]
        }
      };
    }
    
    context.policy = policy;
    
    return {
      fulfillmentResponse: {
        messages: [{
          text: {
            text: [`Βρήκα την ασφάλισή σας για το όχημα ${policy.registration_number}. Μπορείτε να μου πείτε το ονοματεπώνυμό σας;`] // Assuming vehicle_make and vehicle_model are not on User, using registration_number
          }
        }]
      },
      sessionInfo: {
        parameters: {
          ...context.parameters,
          policy_holder_name: policy.full_name, // Assuming policy_holder_name is full_name
          vehicle_info: `${policy.registration_number}`, // Assuming vehicle_make and vehicle_model are not on User
          coverages: [] // Assuming coverages are not directly on User or need different handling
        }
      }
    };
  }
  
  static async handleCustomerName(context: FlowContext): Promise<WebhookResponse> {
    const customerName = context.parameters.customer_name as string;
    const policyHolderName = context.parameters.policy_holder_name as string; // This comes from the previous step's sessionInfo
    const registrationNumber = context.parameters.registration_number as string;
    const userId = context.policy?.id; // Get user_id from the policy (User object) stored in context

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
    // It's good practice to also check for registrationNumber and policyHolderName if they are critical
    // and not guaranteed to be present by this point in the flow.
    // For now, we assume they are present and are strings based on the flow.

    if (!userId) {
      return {
        fulfillmentResponse: {
          messages: [{
            text: {
              text: ['Σφάλμα: Δεν βρέθηκε το αναγνωριστικό χρήστη. Παρακαλώ δοκιμάστε ξανά την διαδικασία ταυτοποίησης.']
            }
          }]
        }
      };
    }

    // Create new case
    const caseData: Partial<Omit<Incident, 'id' | 'created_at'>> & { user_id: string } = {
      user_id: userId, // Add user_id
      registration_number: registrationNumber,
      description: `Caller: ${customerName}, Policy Holder: ${policyHolderName}, Registration: ${registrationNumber}. Initial problem description pending.`, // Example of storing info
    };

    const newCase = await DatabaseService.createIncident(caseData); // UPDATED: createCase -> createIncident
    
    if (!newCase) {
      return {
        fulfillmentResponse: {
          messages: [{
            text: {
              text: ['Υπήρξε ένα πρόβλημα με τη δημιουργία της υπόθεσης. Παρακαλώ δοκιμάστε ξανά.']
            }
          }]
        }
      };
    }
    
    context.caseId = newCase.id;
    context.currentCase = newCase;
    
    const isInsuredPerson = customerName.toLowerCase() === policyHolderName.toLowerCase();
    const message = isInsuredPerson 
      ? `Ευχαριστώ ${customerName}. Μπορείτε να μου περιγράψετε το πρόβλημα που αντιμετωπίζετε;`
      : `Ευχαριστώ ${customerName}. Καταλαβαίνω ότι καλείτε για την ασφάλιση του ${policyHolderName}. Μπορείτε να μου περιγράψετε το πρόβλημα που αντιμετωπίζετε;`;
    
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
          case_id: newCase.id,
          is_insured_person: isInsuredPerson
        }
      }
    };
  }
}

// Flow 2: Classify Incident Type
export class IncidentClassificationFlow {
  
  static async classifyIncident(context: FlowContext): Promise<WebhookResponse> {
    const descriptionFromParams = context.parameters.incident_description as string;

    if (!descriptionFromParams) {
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
    
    // Simple incident classification logic
    const incidentType = this.classifyIncidentType(descriptionFromParams);
    
    // Update case with incident type
    if (context.caseId && context.currentCase) {
      // Append new description to existing, if any
      const existingDescription = context.currentCase.description || '';
      const updatedDescription = `${existingDescription} User described: ${descriptionFromParams}`.trim();

      await DatabaseService.updateIncident(context.caseId, { // UPDATED: updateCase -> updateIncident
        case_type: incidentType, // Use case_type for AC/RA/OTHER
        description: updatedDescription,
      });
      // Update context.currentCase if necessary after DB update
      context.currentCase = { ...context.currentCase, case_type: incidentType, description: updatedDescription };
    }

    if (incidentType === 'OTHER') {
      return this.handleOtherIncident(context);
    }
    
    const message = incidentType === 'AC' 
      ? 'Καταλαβαίνω ότι έχετε ατύχημα. Θα συλλέξω τις απαραίτητες πληροφορίες για να σας βοηθήσω.'
      : 'Καταλαβαίνω ότι χρειάζεστε οδική βοήθεια. Θα συλλέξω τις απαραίτητες πληροφορίες για να σας βοηθήσω.';
    
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
  
  private static classifyIncidentType(description: string): 'AC' | 'RA' | 'OTHER' {
    const lowerDesc = description.toLowerCase();
    
    // Accident indicators
    const accidentKeywords = ['ατύχημα', 'τρακάρισμα', 'σύγκρουση', 'τράκαρα', 'χτύπημα', 'ζημιά', 'κρύσταλλο', 'τζάμι'];
    
    // Road assistance indicators  
    const roadAssistanceKeywords = ['λάστιχο', 'μπαταρία', 'βλάβη', 'δεν παίρνει', 'κολλημένο', 'κλειδί', 'καύσιμα'];
    
    const hasAccidentKeywords = accidentKeywords.some(keyword => lowerDesc.includes(keyword));
    const hasRAKeywords = roadAssistanceKeywords.some(keyword => lowerDesc.includes(keyword));
    
    if (hasAccidentKeywords) return 'AC';
    if (hasRAKeywords) return 'RA';
    
    return 'OTHER';
  }
  
  private static async handleOtherIncident(context: FlowContext): Promise<WebhookResponse> {
    // Update case status to closed
    if (context.caseId && context.currentCase) {
      await DatabaseService.updateIncident(context.caseId, { // UPDATED: updateCase -> updateIncident
        case_summary: 'Αίτημα εκτός κάλυψης - Μόνο ατυχήματα και οδική βοήθεια υποστηρίζονται' // Use case_summary
      });
      context.currentCase.case_summary = 'Αίτημα εκτός κάλυψης - Μόνο ατυχήματα και οδική βοήθεια υποστηρίζονται';
    }
    
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
}

// Flow 3: Gather Detailed Case Data
export class DataCollectionFlow {
  
  static async collectLocation(context: FlowContext): Promise<WebhookResponse> {
    const location = context.parameters.location as string;

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
    
    // Update case with location
    if (context.caseId && context.currentCase) {
      await DatabaseService.updateIncident(context.caseId, { // UPDATED: updateCase -> updateIncident
        location: location,
      });
      context.currentCase.location = location;
    }
    
    // Check if geolocation link is needed
    const needsGeolocation = this.needsGeolocationLink(location);
    
    if (needsGeolocation && context.caseId && context.currentCase) {
      const geoLocationLink = `https://geolocation.hellasdirect.gr/${context.caseId}`; // Example link construction
      await DatabaseService.updateIncident(context.caseId, { // UPDATED: updateCase -> updateIncident
        geolocation_link_sent: geoLocationLink 
      });
      context.currentCase.geolocation_link_sent = geoLocationLink;
    }
    
    const message = needsGeolocation 
      ? `Καταλαβαίνω τη τοποθεσία. Για να είμαι πιο ακριβής, μπορείτε να μου στείλετε την ακριβή τοποθεσία σας μέσω αυτού του συνδέσμου: https://geolocation.hellasdirect.gr\n\nΤώρα, πού θα θέλατε να μεταφερθεί το όχημά σας;`
      : 'Καταλαβαίνω τη τοποθεσία. Πού θα θέλατε να μεταφερθεί το όχημά σας;';
    
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
  
  static async collectFinalDestination(context: FlowContext): Promise<WebhookResponse> {
    const finalDestination = context.parameters.final_destination as string;

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

  // Update case with final destination
  if (context.caseId && context.currentCase) {
    await DatabaseService.updateIncident(context.caseId, { // UPDATED: updateCase -> updateIncident
      final_vehicle_destination: finalDestination,
    });
    context.currentCase.final_vehicle_destination = finalDestination;
  }

  return {
    fulfillmentResponse: {
      messages: [{
        text: {
          text: ['Ευχαριστώ για τις πληροφορίες. Τώρα θα χρειαστώ μερικές επιπλέον λεπτομέρειες.']
        }
      }]
    }
  };
}

static async collectACDetails(context: FlowContext): Promise<WebhookResponse> {
  const incidentType = context.parameters.incident_type;
  
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

static async collectRADetails(context: FlowContext): Promise<WebhookResponse> {
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

private static needsGeolocationLink(location: string): boolean {
  const lowerLoc = location.toLowerCase();
  const indicators = ['εθνική', 'αττική', 'δεν ξέρω', 'κάπου', 'περίπου'];
  return indicators.some(indicator => lowerLoc.includes(indicator));
}
}

// Flow 4: Apply Rules and Identify Critical Conditions
export class RulesEngineFlow {

static async checkSecondTowRule(context: FlowContext): Promise<boolean> {
  if (!context.parameters.registration_number) return false;
  
  console.warn('checkPreviousTowEvents logic needs review for new schema in supabase.ts. Returning false for now.');
  const hasPreviousTow = false; 
  
  if (hasPreviousTow && context.caseId && context.currentCase) {
    const updatedDescription = (context.currentCase.description || '') + ' Potential second tow identified.';
    await DatabaseService.updateIncident(context.caseId, { // UPDATED: updateCase -> updateIncident
      description: updatedDescription
    });
    context.currentCase.description = updatedDescription;
  }
  
  return hasPreviousTow;
}

static async checkRepatriationRule(context: FlowContext): Promise<WebhookResponse | null> {
  const location = context.parameters.location;
  const finalDestination = context.parameters.final_destination;
  
  if (!location || !finalDestination) return null;
  
  const isDifferentPrefecture = this.isDifferentPrefecture(location, finalDestination);
  
  if (isDifferentPrefecture && context.caseId && context.currentCase) {
    await DatabaseService.updateIncident(context.caseId, { // UPDATED: updateCase -> updateIncident
      is_destination_out_perfecture: true,
    });
    context.currentCase.is_destination_out_perfecture = true; // Ensure context is updated
    
    return {
      fulfillmentResponse: {
        messages: [{
          text: {
            text: ['Η μεταφορά σε διαφορετικό νομό θα χρειαστεί 3-5 εργάσιμες ημέρες μετά την αρχική μεταφορά σε αποθήκη του τρέχοντος νομού. Σημειώστε ότι η επαναπατρισμός ΔΕΝ είναι δυνατή για αλλαγή λαστίχου.']
          }
        }]
      }
    };
  }
  
  return null;
}

static async checkUndergroundGarageRule(context: FlowContext): Promise<WebhookResponse | null> {
  const location = context.parameters.location;
  
  if (!location) return null;
  
  const isUnderground = location.toLowerCase().includes('υπόγεια') || 
                       location.toLowerCase().includes('γκαράζ') ||
                       location.toLowerCase().includes('υπόγειο');
  
  if (isUnderground && context.caseId && context.currentCase) {
    const updatedDescription = (context.currentCase.description || '') + ' Vehicle in underground garage.';
    await DatabaseService.updateIncident(context.caseId, { // UPDATED: updateCase -> updateIncident
      description: updatedDescription
    });
    context.currentCase.description = updatedDescription;
    
    return {
      fulfillmentResponse: {
        messages: [{
          text: {
            text: ['Αφού το όχημα βρίσκεται σε υπόγειο χώρο, θα χρειαστείτε ιδιωτική υπηρεσία για να το μετακινήσετε στο δρόμο. Μπορώ να σας δώσω στοιχεία επικοινωνίας ιδιωτικών υπηρεσιών.']
          }
        }]
      }
    };
  }
  
  return null;
}

static async checkSwornDeclarationNeed(context: FlowContext): Promise<WebhookResponse | null> {
  const needsDeclaration = this.needsSwornDeclaration(context);
  
  if (needsDeclaration && context.caseId && context.currentCase) {
    const declarationLink = `https://sign.hellasdirect.gr/${context.caseId}`; // Example link
    await DatabaseService.updateIncident(context.caseId, { // UPDATED: updateCase -> updateIncident
      responsible_declaration_required: declarationLink
    });
    context.currentCase.responsible_declaration_required = declarationLink; // Ensure context is updated
    
    return {
      fulfillmentResponse: {
        messages: [{
          text: {
            text: ['Για αυτήν την περίπτωση θα χρειαστείτε υπεύθυνη δήλωση. Μπορείτε να τη συμπληρώσετε εδώ: https://sign.hellasdirect.gr']
          }
        }]
      }
    };
  }
  
  return null;
}

static async checkFastTrackEligibility(context: FlowContext): Promise<void> {
  const incidentType = context.parameters.incident_type;
  
  if (incidentType !== 'AC') return;
  
  const description = context.parameters.incident_description?.toLowerCase() || '';
  const isFastTrack = this.isFastTrackCase(description);
  
  if (context.caseId && context.currentCase) {
    await DatabaseService.updateIncident(context.caseId, { // UPDATED: updateCase -> updateIncident
      is_fast_case: isFastTrack
    });
    context.currentCase.is_fast_case = isFastTrack;
  }
}

static async checkFraudIndicators(context: FlowContext): Promise<void> {
  const fraudSuspected = this.hasFraudIndicators(context);
  
  if (context.caseId && context.currentCase) {
    await DatabaseService.updateIncident(context.caseId, { // UPDATED: updateCase -> updateIncident
      is_fraud_case: fraudSuspected ? 1 : 0
    });
    context.currentCase.is_fraud_case = fraudSuspected ? 1 : 0;
  }
}

private static isDifferentPrefecture(location: string, destination: string): boolean {
  // Simple prefecture checking - in real implementation, you'd use a proper mapping
  const prefectures = ['αθήνα', 'θεσσαλονίκη', 'πάτρα', 'ηράκλειο', 'λάρισα'];

  const locationPref = prefectures.find(p => location.toLowerCase().includes(p));
  const destPref = prefectures.find(p => destination.toLowerCase().includes(p));

  return !!(locationPref && destPref && locationPref !== destPref);
}

private static needsSwornDeclaration(context: FlowContext): boolean {
  const description = context.currentCase?.description?.toLowerCase() || '';
  const location = context.parameters.location?.toLowerCase() || '';
  
  // Check various conditions that require sworn declaration
  return !!(
    description.includes('χαμηλωμένο') || 
    location.includes('άμμο') ||
    location.includes('λάσπη') ||
    location.includes('ασταθές')
  );
}

private static isFastTrackCase(description: string): boolean {
  const fastTrackKeywords = [
    'πίσω', 'παρκαρισμένο', 'στάθμευση', 'κρύσταλλο', 'τζάμι'
  ];
  
  return fastTrackKeywords.some(keyword => description.includes(keyword));
}

private static hasFraudIndicators(context: FlowContext): boolean {
  // Simple fraud detection logic
  const description = context.parameters.incident_description?.toLowerCase() || '';
  const callerName = context.parameters.customer_name;
  const policyHolderName = context.parameters.policy_holder_name;
  
  return callerName !== policyHolderName && description.includes('φίλος');
}
}

// Flow 5: Generate Conclusions and Summary
export class ConclusionFlow {

static async generateConclusions(context: FlowContext): Promise<WebhookResponse> {
  if (!context.caseId || !context.currentCase) {
    return {
      fulfillmentResponse: {
        messages: [{
          text: {
            text: ['Υπήρξε ένα πρόβλημα με την επεξεργασία της υπόθεσης.']
          }
        }]
      }
    };
  }
  
  const malfunction = this.determineMalfunction(context);
  const resolution = this.determineResolution(context);
  const garage = await this.recommendGarage(context);
  const towingRequired = this.determineTowingNeed(context);
  
  // Update case with conclusions
  if (context.caseId && context.currentCase) { // Added null check for currentCase
    await DatabaseService.updateIncident(context.caseId, { // UPDATED: updateCase -> updateIncident
      possible_vehicle_malfunction: malfunction,
      possible_problem_resolution: resolution,
      recommended_garage: garage,
    });
    // Update context.currentCase
    context.currentCase.possible_vehicle_malfunction = malfunction;
    context.currentCase.possible_problem_resolution = resolution;
    context.currentCase.recommended_garage = garage;
  }
  
  // Generate summary
  const summary = this.generateSummary(context);
  const tags = this.generateTags(context);
  
  if (context.caseId && context.currentCase) { // Added null check for currentCase
    await DatabaseService.updateIncident(context.caseId, { // UPDATED: updateCase -> updateIncident
      communication_quality: 'Άριστη συνεργασία',
      case_summary: summary + (tags.length > 0 ? ` Tags: ${tags.join(', ')}` : ''),
    });
    context.currentCase.communication_quality = 'Άριστη συνεργασία';
    context.currentCase.case_summary = summary + (tags.length > 0 ? ` Tags: ${tags.join(', ')}` : '');
  }
  
  const finalMessage = this.generateFinalMessage(context, towingRequired, garage);
  
  return {
    fulfillmentResponse: {
      messages: [{
        text: {
          text: [finalMessage],
        }
      }]
    }
  }
}

private static determineMalfunction(context: FlowContext): string {
  const incidentType = context.parameters.incident_type;
  const description = context.currentCase?.description?.toLowerCase() || context.parameters.incident_description?.toLowerCase() || '';
  
  if (incidentType === 'RA') {
    if (description.includes('λάστιχο')) return 'Σκασμένο λάστιχο';
    if (description.includes('μπαταρία')) return 'Εκφορτισμένη μπαταρία';
    if (description.includes('κλειδί')) return 'Κλειδωμένο όχημα';
    return 'Μηχανική βλάβη';
  }
  
  return 'Ατύχημα οδικής κυκλοφορίας';
}

private static determineResolution(context: FlowContext): string {
  const incidentType = context.parameters.incident_type;
  const malfunction = this.determineMalfunction(context);
  
  if (incidentType === 'RA') {
    if (malfunction.includes('λάστιχο')) return 'Αλλαγή λαστίχου επί τόπου';
    if (malfunction.includes('μπαταρία')) return 'Jump start επί τόπου';
    if (malfunction.includes('κλειδί')) return 'Άνοιγμα κλειδαριάς';
    return 'Μεταφορά σε συνεργείο';
  }
  
  return 'Επιθεώρηση και επισκευή ζημιών';
}

private static async recommendGarage(context: FlowContext): Promise<string> {
  console.warn('findGaragesByLocation logic needs review for new schema in supabase.ts. Returning generic message.');
  return 'Συνεργείο της περιοχής σας (θα λάβετε λεπτομέρειες σύντομα)'; // Generic message
}

private static determineTowingNeed(context: FlowContext): boolean {
  const incidentType = context.parameters.incident_type;
  const description = context.currentCase?.description?.toLowerCase() || context.parameters.incident_description?.toLowerCase() || '';
  
  if (incidentType === 'AC') return true;
  
  // For RA, check if it can be fixed on-spot
  const onSpotRepairs = ['λάστιχο', 'μπαταρία', 'κλειδί'];
  return !onSpotRepairs.some(repair => description.includes(repair));
}

private static generateSummary(context: FlowContext): string {
  const incidentType = context.parameters.incident_type;
  const customerName = context.parameters.customer_name;
  const registrationNumber = context.parameters.registration_number;
  const location = context.parameters.location;
  const description = context.parameters.incident_description;
  
  return `${incidentType === 'AC' ? 'Ατύχημα' : 'Οδική Βοήθεια'} - Πελάτης: ${customerName}, Όχημα: ${registrationNumber}, Τοποθεσία: ${location}. ${description}`;
}

private static generateTags(context: FlowContext): string[] {
  const tags: string[] = [];
  if (!context.currentCase) return tags; // Add null check

  if (context.currentCase.case_type === 'AC') tags.push('accident');
  if (context.currentCase.case_type === 'RA') tags.push('road-assistance');
  // if (context.currentCase.conditions.fast_track) tags.push('fast-track'); // 'conditions' does not exist
  if (context.currentCase.is_fast_case) tags.push('fast-track'); // Use direct property
  // if (context.currentCase.conditions.repatriation_needed) tags.push('repatriation');
  if (context.currentCase.is_destination_out_perfecture) tags.push('repatriation'); // Use direct property
  // if (context.currentCase.conditions.second_tow) tags.push('second-tow');
  // Add logic for second tow if a corresponding field exists or is added to Incident, e.g., context.currentCase.description.includes('second tow')
  // if (context.currentCase.conditions.underground_garage) tags.push('underground-garage');
  // Add logic for underground garage, e.g., context.currentCase.description.includes('underground garage')
  // if (context.currentCase.conditions.fraud_suspected) tags.push('fraud-suspected');
  if (context.currentCase.is_fraud_case) tags.push('fraud-suspected'); // Use direct property
  return tags;
}

private static generateFinalMessage(
  context: FlowContext, 
  towingRequired: boolean, 
  garage: string
): string {
  if (!context.currentCase) return 'Υπήρξε ένα πρόβλημα με την επεξεργασία της υπόθεσης.'; // Add null check

  // const caseNumber = context.currentCase?.case_number; // 'case_number' does not exist, use id
  const caseId = context.currentCase?.id;
  const incidentType = context.currentCase.case_type;
  let message = `Η υπόθεσή σας (${caseId}) έχει καταχωρηθεί. `;

  if (incidentType === 'AC') {
    message += 'Ένας εκπρόσωπος θα επικοινωνήσει μαζί σας σύντομα. ';
    // if (context.currentCase.conditions.fast_track) { // 'conditions' does not exist
    if (context.currentCase.is_fast_case) { // Use direct property
      message += 'Αναγνωρίσαμε την υπόθεσή σας ως κατάλληλη για γρήγορη εξυπηρέτηση. ';
    }
  } else if (incidentType === 'RA') {
    message += 'Η οδική βοήθεια θα φτάσει στην τοποθεσία σας σύντομα. ';
    if (towingRequired) {
      message += `Προτείνουμε το συνεργείο: ${garage}`;
    }
  }
  
  return message;
}

private static extractPrefecture(location: string): string {
  const lowerLoc = location.toLowerCase();
  if (lowerLoc.includes('αθήνα') || lowerLoc.includes('αττική')) return 'Αττική';
  if (lowerLoc.includes('θεσσαλονίκη')) return 'Θεσσαλονίκη';
  if (lowerLoc.includes('πάτρα')) return 'Αχαΐα';
  return 'Αττική'; // Default
}
}

// Main flow orchestrator
export class FlowOrchestrator {

static async handleWebhookFlow(request: WebhookRequest): Promise<WebhookResponse> {
  const tag = request.fulfillmentInfo.tag;
  const sessionId = request.sessionInfo.session;
  const parameters = request.sessionInfo.parameters || {};
  
  const context: FlowContext = {
    sessionId,
    caseId: parameters.case_id,
    step: tag,
    parameters
  };
  
  console.log(`🎯 Processing flow step: ${tag}`);
  
  try {
    switch (tag) {
      case 'greeting':
        return CustomerIdentificationFlow.handleGreeting(context);
        
      case 'collect.registration':
        return await CustomerIdentificationFlow.handleRegistrationNumber(context);
        
      case 'collect.customer_name':
        return await CustomerIdentificationFlow.handleCustomerName(context);
        
      case 'classify.incident':
        return await IncidentClassificationFlow.classifyIncident(context);
        
      case 'collect.location':
        return await DataCollectionFlow.collectLocation(context);
        
      case 'collect.destination':
        return await DataCollectionFlow.collectFinalDestination(context);
        
      case 'collect.ac_details':
        return await DataCollectionFlow.collectACDetails(context);
        
      case 'collect.ra_details':
        return await DataCollectionFlow.collectRADetails(context);
        
      case 'process.rules':
        // For now, return simple response - async operations will be handled separately
        return {
          fulfillmentResponse: {
            messages: [{
              text: {
                text: ['Επεξεργάζονται οι κανόνες και οι συνθήκες της υπόθεσης...']
              }
            }]
          }
        };
        
      case 'finalize.case':
        return await ConclusionFlow.generateConclusions(context);
        
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
}
