// lib/incident-service.ts - Service for managing incidents in Supabase
import { supabase } from './supabase';
import { CaseType } from './webhook-handlers';

export interface IncidentData {
  id?: string;
  user_id: string;
  registration_number?: string | null;
  location?: string | null;
  description?: string | null;
  case_type?: CaseType | null;
  final_vehicle_destination?: string | null;
  possible_vehicle_malfunction?: string | null;
  possible_problem_resolution?: string | null;
  recommended_garage?: string | null;
  is_destination_out_perfecture?: boolean | null;
  delay_voucher_issued?: boolean | null;
  geolocation_link_sent?: string | null;
  responsible_declaration_required?: string | null;
  is_fast_case?: boolean | null;
  is_fraud_case?: number | null;
  communication_quality?: string | null;
  case_summary?: string | null;
  images?: string[] | null;
}

// Create a new incident when a chat session starts
export async function createNewIncident(sessionId: string, userId?: string): Promise<IncidentData | null> {
  try {
    console.log(`📝 Creating new incident for session: ${sessionId}`);
    
    // For now, we'll use a default user_id if none provided
    // In a real app, you'd get this from authentication
    const defaultUserId = userId || '00000000-0000-0000-0000-000000000000';
    
    const incidentData: Partial<IncidentData> = {
      user_id: defaultUserId,
      case_summary: `Chat session started: ${sessionId}`,
      communication_quality: 'ongoing'
    };
    
    const { data, error } = await supabase
      .from('incidents')
      .insert(incidentData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating incident:', error);
      return null;
    }
    
    console.log(`✅ Created incident with ID: ${data.id}`);
    return data;
    
  } catch (error) {
    console.error('❌ Error in createNewIncident:', error);
    return null;
  }
}

// Update an existing incident with new information
export async function updateIncident(incidentId: string, updates: Partial<IncidentData>): Promise<IncidentData | null> {
  try {
    console.log(`📝 Updating incident ${incidentId} with:`, updates);
    
    const { data, error } = await supabase
      .from('incidents')
      .update(updates)
      .eq('id', incidentId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error updating incident:', error);
      return null;
    }
    
    console.log(`✅ Updated incident: ${data.id}`);
    return data;
    
  } catch (error) {
    console.error('❌ Error in updateIncident:', error);
    return null;
  }
}

// Get incident by ID
export async function getIncident(incidentId: string): Promise<IncidentData | null> {
  try {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', incidentId)
      .single();
    
    if (error) {
      console.error('❌ Error fetching incident:', error);
      return null;
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ Error in getIncident:', error);
    return null;
  }
}

// Get incident by session ID (stored in case_summary or add a session_id field)
export async function getIncidentBySession(sessionId: string): Promise<IncidentData | null> {
  try {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .ilike('case_summary', `%${sessionId}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      console.error('❌ Error fetching incident by session:', error);
      return null;
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ Error in getIncidentBySession:', error);
    return null;
  }
}

// Extract information from user input and map to incident fields
export function extractIncidentDataFromInput(text: string, currentData: Partial<IncidentData> = {}): Partial<IncidentData> {
  const updates: Partial<IncidentData> = {};
  const lowerText = text.toLowerCase();
  
  // Extract registration number patterns
  const regNumberMatch = text.match(/([A-Z]{2,3}[\s-]?\d{3,4}|[A-Z]{3}[\s-]?\d{4})/i);
  if (regNumberMatch && !currentData.registration_number) {
    updates.registration_number = regNumberMatch[0].replace(/[\s-]/g, '');
    console.log(`🚗 Extracted registration number: ${updates.registration_number}`);
  }
  
  // Extract location information
  const locationKeywords = ['βρίσκομαι', 'είμαι στο', 'είμαι στην', 'είμαι στον', 'τοποθεσία'];
  if (locationKeywords.some(keyword => lowerText.includes(keyword)) && !currentData.location) {
    updates.location = text;
    console.log(`📍 Extracted location info: ${updates.location}`);
  }
  
  // Determine case type
  const acKeywords = ['τρακάρισμα', 'ατύχημα', 'χτύπημα', 'ζημιά', 'τροχαίο', 'collision'];
  const raKeywords = ['λάστιχο', 'βενζίνη', 'μπαταρία', 'βλάβη', 'δεν ξεκινάει', 'οδική βοήθεια'];
  
  if (!currentData.case_type) {
    if (acKeywords.some(keyword => lowerText.includes(keyword))) {
      updates.case_type = 'AC';
      console.log(`🚨 Detected case type: AC (Accident)`);
    } else if (raKeywords.some(keyword => lowerText.includes(keyword))) {
      updates.case_type = 'RA';
      console.log(`🔧 Detected case type: RA (Roadside Assistance)`);
    }
  }
  
  // Extract description if it seems descriptive
  const descriptiveKeywords = ['συνέβη', 'έγινε', 'περιστατικό', 'πρόβλημα'];
  if (descriptiveKeywords.some(keyword => lowerText.includes(keyword)) && !currentData.description) {
    updates.description = text;
    console.log(`📝 Extracted description: ${updates.description}`);
  }
  
  // Extract possible malfunction for RA cases
  if (currentData.case_type === 'RA' || updates.case_type === 'RA') {
    if (raKeywords.some(keyword => lowerText.includes(keyword)) && !currentData.possible_vehicle_malfunction) {
      updates.possible_vehicle_malfunction = text;
      console.log(`🔧 Extracted malfunction info: ${updates.possible_vehicle_malfunction}`);
    }
  }
  
  // Extract destination information
  const destinationKeywords = ['συνεργείο', 'οικία', 'προορισμός', 'θέλω να πάω'];
  if (destinationKeywords.some(keyword => lowerText.includes(keyword)) && !currentData.final_vehicle_destination) {
    updates.final_vehicle_destination = text;
    console.log(`🎯 Extracted destination: ${updates.final_vehicle_destination}`);
  }
  
  // Detect fast track indicators
  const fastTrackKeywords = ['πίσω', 'σταθμευμένο', 'όπισθεν', 'άνοιγμα θύρας'];
  if (fastTrackKeywords.some(keyword => lowerText.includes(keyword))) {
    updates.is_fast_case = true;
    console.log(`⚡ Detected fast track case`);
  }
  
  // Detect fraud indicators
  const fraudKeywords = ['γνωριμία', 'ασυμβατότητα', 'έναρξη συμβολαίου'];
  if (fraudKeywords.some(keyword => lowerText.includes(keyword))) {
    updates.is_fraud_case = 1; // Numeric field in schema
    console.log(`🚨 Detected potential fraud case`);
  }
  
  return updates;
}

// Get or create incident for a session
export async function getOrCreateIncidentForSession(sessionId: string, userId?: string): Promise<IncidentData | null> {
  // First try to get existing incident
  let incident = await getIncidentBySession(sessionId);
  
  if (!incident) {
    // Create new incident if none exists
    incident = await createNewIncident(sessionId, userId);
  }
  
  return incident;
}

// Update incident based on user message
export async function updateIncidentFromMessage(
  sessionId: string, 
  userMessage: string, 
  userId?: string
): Promise<IncidentData | null> {
  try {
    // Get or create incident for this session
    let incident = await getOrCreateIncidentForSession(sessionId, userId);
    
    if (!incident) {
      console.error('❌ Failed to get or create incident');
      return null;
    }
    
    // Extract information from the message
    const extractedData = extractIncidentDataFromInput(userMessage, incident);
    
    // Only update if we have new information
    if (Object.keys(extractedData).length > 0) {
      incident = await updateIncident(incident.id!, extractedData);
    }
    
    return incident;
    
  } catch (error) {
    console.error('❌ Error in updateIncidentFromMessage:', error);
    return null;
  }
}
