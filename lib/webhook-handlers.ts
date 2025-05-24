// lib/webhook-handlers.ts - Webhook handlers for Hellas Direct insurance cases
import { WebhookRequest, WebhookResponse } from './dialogflow';

// Insurance case handler types
export type CaseType = 'AC' | 'RA' | 'OTHER';

export interface InsuranceCaseData {
  type?: CaseType;
  customerName?: string;
  registrationNumber?: string;
  location?: string;
  description?: string;
  finalDestination?: string;
  fastTrack?: boolean;
  fraud?: boolean;
  possibleMalfunction?: string;
  delayCoupon?: boolean;
  geolocLink?: boolean;
  notAccessible?: boolean;
  injuryAsked?: boolean;
  damageAsked?: boolean;
  insuranceAsked?: boolean;
  photosAsked?: boolean;
  reserveAsked?: boolean;
  directionAsked?: boolean;
  colorAsked?: boolean;
  repairShopAsked?: boolean;
}

// Handler for accident cases (AC)
export function handleAccidentCase(request: WebhookRequest): WebhookResponse {
  const sessionParams = request.sessionInfo.parameters;
  const tag = request.fulfillmentInfo.tag;
  
  console.log(`🚗 Handling accident case with tag: ${tag}`);
  console.log(`📋 Session parameters:`, sessionParams);
  
  let responseMessage = '';
  let updatedParams = { ...sessionParams };
  
  switch (tag) {
    case 'accident.collect.name':
      responseMessage = 'Μπορείτε να μου δώσετε το ονοματεπώνυμό σας;';
      break;
      
    case 'accident.collect.registration':
      responseMessage = 'Ποιος είναι ο αριθμός κυκλοφορίας του οχήματός σας;';
      break;
      
    case 'accident.collect.location':
      responseMessage = 'Πού ακριβώς βρίσκεστε;';
      break;
      
    case 'accident.collect.description':
      responseMessage = 'Πώς ακριβώς συνέβη το περιστατικό;';
      break;
      
    case 'accident.collect.destination':
      responseMessage = 'Σε περίπτωση που το όχημα δεν μπορεί να μετακινηθεί, ποιος θα θέλατε να είναι ο τελικός του προορισμός;';
      break;
      
    case 'accident.check.injury':
      responseMessage = 'Είστε όλοι εντάξει; Υπάρχει κάποιος τραυματισμός;';
      updatedParams.injuryAsked = true;
      break;
      
    case 'accident.check.damage':
      responseMessage = 'Τι υλικές ζημιές έχετε στο όχημά σας; Πού βρίσκονται;';
      updatedParams.damageAsked = true;
      break;
      
    case 'accident.check.insurance':
      responseMessage = 'Ποια είναι η ασφαλιστική εταιρία του εμπλεκόμενου οχήματος;';
      updatedParams.insuranceAsked = true;
      break;
      
    case 'accident.request.photos':
      responseMessage = 'Μπορείτε να στείλετε φωτογραφίες της άδειας κυκλοφορίας, του διπλώματός σας, των ζημιών και του σημείου του συμβάντος;';
      updatedParams.photosAsked = true;
      break;
      
    case 'accident.detect.fasttrack':
      // Check for fast track indicators
      const fastTrackKeywords = ['πίσω', 'σταθμευμένο', 'stop', 'σήμανση', 'ξεπαρκάρισμα', 'όπισθεν', 'άνοιγμα θύρας'];
      const message = request.text?.toLowerCase() || '';
      if (fastTrackKeywords.some(keyword => message.includes(keyword))) {
        updatedParams.fastTrack = true;
        responseMessage = 'Το περιστατικό έχει ταξινομηθεί ως Fast Track. Θα προχωρήσουμε άμεσα.';
      } else {
        responseMessage = 'Παρακαλώ δώστε περισσότερες λεπτομέρειες για το περιστατικό.';
      }
      break;
      
    case 'accident.detect.fraud':
      // Check for fraud indicators
      const fraudKeywords = ['γνωριμία', 'ασυμβατότητα', 'έναρξη συμβολαίου'];
      const fraudMessage = request.text?.toLowerCase() || '';
      if (fraudKeywords.some(keyword => fraudMessage.includes(keyword))) {
        updatedParams.fraud = true;
        responseMessage = 'Το περιστατικό έχει σημανθεί για επιπλέον έλεγχο. Θα επικοινωνήσει μαζί σας εξειδικευμένος σύμβουλος.';
      } else {
        responseMessage = 'Δεν εντοπίστηκαν υποψίες απάτης. Συνεχίζουμε κανονικά.';
      }
      break;
      
    case 'accident.summary':
      responseMessage = generateAccidentSummary(updatedParams);
      break;
      
    default:
      responseMessage = 'Συγγνώμη, δεν κατάλαβα το αίτημά σας για το ατύχημα. Μπορείτε να επαναδιατυπώσετε;';
  }
  
  return {
    fulfillmentResponse: {
      messages: [{
        text: {
          text: [responseMessage]
        }
      }]
    },
    sessionInfo: {
      parameters: updatedParams
    }
  };
}

// Handler for roadside assistance cases (RA)
export function handleRoadsideAssistance(request: WebhookRequest): WebhookResponse {
  const sessionParams = request.sessionInfo.parameters;
  const tag = request.fulfillmentInfo.tag;
  
  console.log(`🛠️ Handling roadside assistance with tag: ${tag}`);
  console.log(`📋 Session parameters:`, sessionParams);
  
  let responseMessage = '';
  let updatedParams = { ...sessionParams };
  
  switch (tag) {
    case 'roadside.collect.name':
      responseMessage = 'Μπορείτε να μου δώσετε το ονοματεπώνυμό σας;';
      break;
      
    case 'roadside.collect.registration':
      responseMessage = 'Ποιος είναι ο αριθμός κυκλοφορίας του οχήματός σας;';
      break;
      
    case 'roadside.collect.location':
      responseMessage = 'Πού ακριβώς βρίσκεστε;';
      break;
      
    case 'roadside.collect.description':
      responseMessage = 'Τι συνέβη στο όχημα;';
      break;
      
    case 'roadside.check.spare':
      responseMessage = 'Υπάρχει ρεζέρβα στο όχημα;';
      updatedParams.reserveAsked = true;
      break;
      
    case 'roadside.check.direction':
      responseMessage = 'Προς τα πού είχατε κατεύθυνση;';
      updatedParams.directionAsked = true;
      break;
      
    case 'roadside.check.color':
      responseMessage = 'Τι χρώμα είναι το αυτοκίνητο;';
      updatedParams.colorAsked = true;
      break;
      
    case 'roadside.check.repair_shop':
      responseMessage = 'Υπάρχει κάποιο συγκεκριμένο βουλκανιζατέρ/συνεργείο που θα θέλατε να πάμε;';
      updatedParams.repairShopAsked = true;
      break;
      
    case 'roadside.collect.destination':
      responseMessage = 'Σε περίπτωση που το όχημα δεν μπορεί να μετακινηθεί, ποιος θα θέλατε να είναι ο τελικός του προορισμός;';
      break;
      
    case 'roadside.detect.malfunction':
      // Detect possible malfunction type
      const message = request.text?.toLowerCase() || '';
      const malfunctionKeywords = {
        'battery': ['μπαταρία', 'δεν ξεκινάει', 'ρεύμα'],
        'tire': ['λάστιχο', 'πάντα', 'ρεζέρβα'],
        'fuel': ['βενζίνη', 'καύσιμο', 'πετρέλαιο'],
        'engine': ['μηχανή', 'βλάβη', 'σταμάτησε']
      };
      
      let detectedMalfunction = 'unknown';
      for (const [type, keywords] of Object.entries(malfunctionKeywords)) {
        if (keywords.some(keyword => message.includes(keyword))) {
          detectedMalfunction = type;
          break;
        }
      }
      
      updatedParams.possibleMalfunction = detectedMalfunction;
      responseMessage = `Έχω εντοπίσει πιθανό πρόβλημα: ${detectedMalfunction}. Θα στείλουμε κατάλληλη βοήθεια.`;
      break;
      
    case 'roadside.check.delay':
      // Check for delay compensation
      const delayKeywords = ['ώρα αναμονής', 'περίμενα πάνω από μία ώρα', 'καθυστέρηση'];
      const delayMessage = request.text?.toLowerCase() || '';
      if (delayKeywords.some(keyword => delayMessage.includes(keyword))) {
        updatedParams.delayCoupon = true;
        responseMessage = 'Λόγω καθυστέρησης, θα λάβετε κουπόνι αποζημίωσης.';
      } else {
        responseMessage = 'Δεν εντοπίστηκε σημαντική καθυστέρηση.';
      }
      break;
      
    case 'roadside.check.accessibility':
      // Check if location is accessible
      const accessKeywords = ['υπόγειο γκαράζ', 'μη προσβάσιμο'];
      const accessMessage = request.text?.toLowerCase() || '';
      if (accessKeywords.some(keyword => accessMessage.includes(keyword))) {
        updatedParams.notAccessible = true;
        responseMessage = 'Η τοποθεσία δεν είναι εύκολα προσβάσιμη. Θα στείλουμε εξειδικευμένο συνεργείο.';
      } else {
        responseMessage = 'Η τοποθεσία είναι προσβάσιμη για το συνεργείο.';
      }
      break;
      
    case 'roadside.summary':
      responseMessage = generateRoadsideSummary(updatedParams);
      break;
      
    default:
      responseMessage = 'Συγγνώμη, δεν κατάλαβα το αίτημά σας για οδική βοήθεια. Μπορείτε να επαναδιατυπώσετε;';
  }
  
  return {
    fulfillmentResponse: {
      messages: [{
        text: {
          text: [responseMessage]
        }
      }]
    },
    sessionInfo: {
      parameters: updatedParams
    }
  };
}

// Handler for geolocation assistance
export function handleGeoLocation(request: WebhookRequest): WebhookResponse {
  const sessionParams = request.sessionInfo.parameters;
  const tag = request.fulfillmentInfo.tag;
  
  console.log(`📍 Handling geolocation with tag: ${tag}`);
  
  let responseMessage = '';
  let updatedParams = { ...sessionParams };
  
  switch (tag) {
    case 'geolocation.highway':
      updatedParams.geolocLink = true;
      responseMessage = 'Θα σας στείλω έναν σύνδεσμο για να μοιραστείτε την ακριβή τοποθεσία σας.';
      break;
      
    case 'geolocation.unknown':
      updatedParams.geolocLink = true;
      responseMessage = 'Για άγνωστη τοποθεσία, θα χρειαστώ την ακριβή γεωγραφική σας θέση. Θα σας στείλω σύνδεσμο.';
      break;
      
    case 'geolocation.duplicate':
      updatedParams.geolocLink = true;
      responseMessage = 'Υπάρχουν πολλές περιοχές με αυτό το όνομα. Θα σας στείλω σύνδεσμο για να μοιραστείτε την ακριβή θέση σας.';
      break;
      
    default:
      responseMessage = 'Θα σας βοηθήσω με την τοποθεσία σας.';
  }
  
  return {
    fulfillmentResponse: {
      messages: [{
        text: {
          text: [responseMessage]
        }
      }]
    },
    sessionInfo: {
      parameters: updatedParams
    }
  };
}

// Generate accident case summary
function generateAccidentSummary(params: Record<string, any>): string {
  const summary = {
    'Αριθμός Κυκλοφορίας': params.registrationNumber || '-',
    'Ονοματεπώνυμο': params.customerName || '-',
    'Περιγραφή': params.description || '-',
    'Τοποθεσία': params.location || '-',
    'Τελικός Προορισμός': params.finalDestination || '-',
    'Fast Track': params.fastTrack ? 'Ναι' : 'Όχι',
    'Υποψία Απάτης': params.fraud ? 'Ναι' : 'Όχι'
  };
  
  let summaryText = 'Σας ευχαριστούμε. Ακολουθεί σύνοψη του περιστατικού ατυχήματος:\n\n';
  for (const [key, value] of Object.entries(summary)) {
    summaryText += `${key}: ${value}\n`;
  }
  summaryText += '\nΘα επικοινωνήσουμε μαζί σας σύντομα για τα επόμενα βήματα.';
  
  return summaryText;
}

// Generate roadside assistance summary
function generateRoadsideSummary(params: Record<string, any>): string {
  const summary = {
    'Αριθμός Κυκλοφορίας': params.registrationNumber || '-',
    'Ονοματεπώνυμο': params.customerName || '-',
    'Περιγραφή': params.description || '-',
    'Τοποθεσία': params.location || '-',
    'Τελικός Προορισμός': params.finalDestination || '-',
    'Πιθανή Βλάβη': params.possibleMalfunction || '-',
    'Κουπόνι Καθυστέρησης': params.delayCoupon ? 'Ναι' : 'Όχι',
    'Σύνδεσμος Γεωεντοπισμού': params.geolocLink ? 'Ναι' : 'Όχι',
    'Μη Προσβάσιμη Τοποθεσία': params.notAccessible ? 'Ναι' : 'Όχι'
  };
  
  let summaryText = 'Σας ευχαριστούμε. Ακολουθεί σύνοψη του περιστατικού οδικής βοήθειας:\n\n';
  for (const [key, value] of Object.entries(summary)) {
    summaryText += `${key}: ${value}\n`;
  }
  summaryText += '\nΘα στείλουμε βοήθεια στην τοποθεσία σας το συντομότερο δυνατό.';
  
  return summaryText;
}

// Main webhook handler that routes to appropriate case handler
export function handleWebhookRequest(request: WebhookRequest): WebhookResponse {
  const tag = request.fulfillmentInfo.tag;
  
  console.log(`🎯 Webhook called with tag: ${tag}`);
  console.log(`📥 Request:`, JSON.stringify(request, null, 2));
  
  try {
    // Route to appropriate handler based on tag prefix
    if (tag.startsWith('accident.')) {
      return handleAccidentCase(request);
    } else if (tag.startsWith('roadside.')) {
      return handleRoadsideAssistance(request);
    } else if (tag.startsWith('geolocation.')) {
      return handleGeoLocation(request);
    } else {
      // Default handler for unknown tags
      return {
        fulfillmentResponse: {
          messages: [{
            text: {
              text: ['Συγγνώμη, δεν μπορώ να βοηθήσω με αυτό το αίτημα. Παρακαλώ επικοινωνήστε με έναν εκπρόσωπό μας.']
            }
          }]
        },
        sessionInfo: {
          parameters: request.sessionInfo.parameters
        }
      };
    }
  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    
    return {
      fulfillmentResponse: {
        messages: [{
          text: {
            text: ['Υπήρξε ένα πρόβλημα κατά την επεξεργασία του αιτήματός σας. Παρακαλώ δοκιμάστε ξανά.']
          }
        }]
      },
      sessionInfo: {
        parameters: request.sessionInfo.parameters
      }
    };
  }
}
