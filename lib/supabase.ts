// lib/supabase.ts - Supabase client configuration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if Supabase is properly configured
const isSupabaseConfigured = supabaseUrl && 
  supabaseKey && 
  supabaseUrl !== 'your_supabase_project_url_here' && 
  supabaseKey !== 'your_supabase_anon_key_here';

// Create Supabase client or mock client for development
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl!, supabaseKey!)
  : createMockSupabaseClient();

// Mock Supabase client for development/testing
function createMockSupabaseClient() {
  console.log('⚠️ Using mock Supabase client - configure real Supabase for production');
  
  // Persistent mock database store
  const mockDatabase: { [table: string]: any[] } = {
    incidents: [],
    users: []
  };
    const createChainableQuery = (table: string, operation: string, data?: any) => {
    return {
      select: (columns = '*') => {
        // For INSERT operations, preserve the INSERT operation but add select columns
        if (operation === 'insert') {
          return createChainableQuery(table, 'insert', { columns, ...data });
        }
        return createChainableQuery(table, 'select', { columns, ...data });
      },
      insert: (insertData: any) => createChainableQuery(table, 'insert', { insertData, ...data }),
      update: (updateData: any) => createChainableQuery(table, 'update', { updateData, ...data }),
      eq: (column: string, value: any) => createChainableQuery(table, operation, { eq: { column, value }, ...data }),
      ilike: (column: string, pattern: any) => createChainableQuery(table, operation, { ilike: { column, pattern }, ...data }),
      order: (column: string, options: any) => createChainableQuery(table, operation, { order: { column, options }, ...data }),
      limit: (count: number) => createChainableQuery(table, operation, { limit: count, ...data }),single: async () => {
        console.log(`🔄 Mock Supabase: ${operation.toUpperCase()} single on ${table}:`, JSON.stringify(data, null, 2));
        
        if (operation === 'insert') {
          // Ensure table exists
          if (!mockDatabase[table]) {
            mockDatabase[table] = [];
          }
          
          if (data.insertData) {
            const id = `incident-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const newRecord = { 
              id, 
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...data.insertData 
            };
            
            mockDatabase[table].push(newRecord);
            console.log(`✅ Mock DB: Inserted record with ID ${id} into ${table}. Total records: ${mockDatabase[table].length}`);
            return { data: newRecord, error: null };
          } else {
            console.error(`❌ Mock DB: No insertData provided for INSERT operation on ${table}`);
            return { data: null, error: { message: 'No data to insert' } };
          }
        }
          if (operation === 'select') {
          // Ensure table exists
          if (!mockDatabase[table]) {
            mockDatabase[table] = [];
          }
          
          let records = [...mockDatabase[table]];
          
          // Apply filters
          if (data.eq) {
            records = records.filter(record => record[data.eq.column] === data.eq.value);
          }
          
          if (data.ilike) {
            const pattern = data.ilike.pattern.replace(/%/g, '');
            records = records.filter(record => {
              const value = record[data.ilike.column];
              return value && value.toString().includes(pattern);
            });
          }
          
          // Apply ordering
          if (data.order) {
            records.sort((a, b) => {
              const aVal = a[data.order.column];
              const bVal = b[data.order.column];
              if (data.order.options.ascending) {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
              } else {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
              }
            });
          }
          
          // Apply limit
          if (data.limit) {
            records = records.slice(0, data.limit);
          }
          
          console.log(`🔍 Mock DB: Found ${records.length} records in ${table} matching criteria`);
          
          // For SELECT operations, return null data when no records found (like real Supabase)
          // Don't return an error for SELECT operations when no data is found
          return { data: records.length > 0 ? records[0] : null, error: null };
        }
        
        return { data: null, error: { message: 'Operation not supported' } };
      },
      execute: async () => {
        console.log(`🔄 Mock Supabase: ${operation.toUpperCase()} execute on ${table}:`, JSON.stringify(data, null, 2));
        
        if (operation === 'update') {
          // Ensure table exists
          if (!mockDatabase[table]) {
            mockDatabase[table] = [];
          }
          
          let updatedRecord = null;
          
          if (data.eq) {
            const recordIndex = mockDatabase[table].findIndex(record => record[data.eq.column] === data.eq.value);
            if (recordIndex !== -1) {
              mockDatabase[table][recordIndex] = {
                ...mockDatabase[table][recordIndex],
                ...data.updateData,
                updated_at: new Date().toISOString()
              };
              updatedRecord = mockDatabase[table][recordIndex];
              console.log(`✅ Mock DB: Updated record ${data.eq.value} in ${table}`);
            }
          }
          
          return { data: updatedRecord, error: updatedRecord ? null : { message: 'Record not found' } };
        }
        
        return { data: null, error: null };
      }
    };
  };
  
  return {
    from: (table: string) => createChainableQuery(table, 'from'),
    // Add method to inspect mock database for debugging
    _mockDB: mockDatabase
  } as any;
}

// Database types for new schema

export interface User {
  id: string; // uuid
  created_at: string; // timestamp with time zone
  full_name: string | null;
  registration_number: string | null;
  afm: string | null;
  starting_date: string | null; // timestamp with time zone
  ending_at: string | null; // timestamp with time zone
  phone_number: string | null;
  email: string | null;
  address: string | null;
}

// Assuming public.caseType is a text type storing values like 'AC', 'RA', 'OTHER'
export type CaseType = 'AC' | 'RA' | 'OTHER' | string; 

export interface Incident {
  id: string; // uuid
  created_at: string; // timestamp with time zone
  user_id: string; // uuid, foreign key to users.id
  registration_number: string | null;
  location: string | null;
  description: string | null;
  case_type: CaseType | null;
  final_vehicle_destination: string | null;
  possible_vehicle_malfunction: string | null;
  possible_problem_resolution: string | null;
  recommended_garage: string | null;
  is_destination_out_perfecture: boolean | null; // Mapped from repatriation_needed
  delay_voucher_issued: boolean | null; // Mapped from delay_voucher_potential
  geolocation_link_sent: string | null; // Mapped from geolocation_link_sent (was boolean, now string)
  responsible_declaration_required: string | null; // Mapped from sworn_declaration_needed
  is_fast_case: boolean | null; // Mapped from fast_track
  is_fraud_case: number | null; // Mapped from fraud_suspected (schema is numeric)
  communication_quality: string | null; // Mapped from summary.communication_quality
  case_summary: string | null; // Mapped from summary.short_summary
  images: string[] | null;
  // Fields that were previously nested and need careful mapping or are new:
  // Consider if these are needed or how they map from old structure:
  // has_injuries?: boolean; (previously ac_data)
  // material_damages_only?: boolean; (previously ac_data)
  // breakdown_type?: string; (previously ra_data, maps to possible_vehicle_malfunction?)
  // spare_tyre_available?: boolean; (previously ra_data)
  // is_second_tow_needed?: boolean; (previously conditions.second_tow)
  // is_underground_garage?: boolean; (previously conditions.underground_garage)
  // is_towing_required?: boolean; (previously conclusions.towing_required)
  // tags?: string[]; (previously summary.tags)
}

/*
// GaragePartner is not in the new schema as per user's statement.
export interface GaragePartner {
  id: string;
  name: string;
  address: string;
  prefecture: string;
  phone: string;
  email?: string;
  specialties: string[]; // e.g., ['mechanical', 'body_work', 'glass', 'tyre']
  is_partner: boolean;
  created_at: string;
}
*/

// Database operations
export class DatabaseService {
  
  // User operations (formerly Policy operations)
  static async getUserByRegistrationNumber(registrationNumber: string): Promise<User | null> {
    console.log(`[Supabase] Attempting to fetch user with registration number: ${registrationNumber}`); // Added log
    const { data, error } = await supabase
      .from('users') // Changed table name
      .select('*')
      .eq('registration_number', registrationNumber)
      .single();
    
    if (error) {
      console.error('[Supabase] Error fetching user by registration number:', error);
      return null;
    }
    
    console.log('[Supabase] Successfully fetched user data:', data); // Added log
    return data;
  }
  
  // Incident operations (formerly Case operations)
  static async createIncident(incidentData: Partial<Omit<Incident, 'id' | 'created_at'>> & { user_id: string }): Promise<Incident | null> {
    // id and created_at are generated by the database
    const newIncident: Partial<Omit<Incident, 'id' | 'created_at'>> = {
      ...incidentData,
      // Default values for any required fields not in incidentData should be handled here
      // or ensure incidentData provides them.
      // Example:
      // case_type: incidentData.case_type || 'OTHER', 
    };
    console.log(`📝 Querying Supabase: createIncident with data:`, newIncident);
    const { data, error } = await supabase
      .from('incidents') // Changed table name
      .insert([newIncident])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating incident:', error);
      return null;
    }
    
    return data;
  }
  
  static async updateIncident(incidentId: string, updates: Partial<Omit<Incident, 'id' | 'created_at' | 'user_id'>>): Promise<Incident | null> {
    // user_id and created_at should generally not be updated this way.
    // id is used for the .eq filter.
    console.log(`🔄 Querying Supabase: updateIncident with incidentId: ${incidentId} and updates:`, updates);
    const { data, error } = await supabase
      .from('incidents') // Changed table name
      .update(updates)
      .eq('id', incidentId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating incident:', error);
      return null;
    }
    
    return data;
  }
  
  static async getIncidentsByRegistrationNumber(registrationNumber: string): Promise<Incident[]> {
    console.log(`🔍 Querying Supabase: getIncidentsByRegistrationNumber with registrationNumber: ${registrationNumber}`);
    const { data, error } = await supabase
      .from('incidents') // Changed table name
      .select('*')
      .eq('registration_number', registrationNumber)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching incidents by registration number:', error);
      return [];
    }
    
    return data || [];
  }
  
  static async getIncidentById(incidentId: string): Promise<Incident | null> {
    console.log(`🔍 Querying Supabase: getIncidentById with incidentId: ${incidentId}`);
    const { data, error } = await supabase
      .from('incidents') // Changed table name
      .select('*')
      .eq('id', incidentId)
      .single();
    
    if (error) {
      console.error('Error fetching incident by ID:', error);
      return null;
    }
    
    return data;
  }
  static async getUserByAfm(afm: string): Promise<User | null> {
    console.log(`🔍 Querying Supabase: getUserByAfm with afm: ${afm}`);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('afm', afm)
      .single();
    
    if (error) {
      console.error('Error fetching user by AFM:', error);
      return null;
    }
    return data;
  }
  static async createUser(userData: Partial<Omit<User, 'id' | 'created_at'>>): Promise<User | null> {
    console.log(`📝 Querying Supabase: createUser with data:`, userData);
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user:', error);
      return null;
    }
    
    return data;
  }

  static async updateUser(userId: string, updates: Partial<Omit<User, 'id' | 'created_at'>>): Promise<User | null> {
    console.log(`🔄 Querying Supabase: updateUser with userId: ${userId} and updates:`, updates);
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user:', error);
      return null;
    }
    
    return data;
  }
  
  /* 
  // Methods related to GaragePartner are commented out as the table is not in the new schema.
  static async findGaragesByLocation(prefecture: string, specialties?: string[]): Promise<GaragePartner[]> {
    // ...
  }
  
  static async checkPreviousTowEvents(registrationNumber: string): Promise<boolean> {
    // This logic needs to be re-evaluated based on the new 'incidents' table structure.
    // For example, to check for previous towing, you might query 'incidents'
    // where 'registration_number' matches and some field like 'is_towing_required' (if added) is true.
    // For now, returning false.
    console.warn('checkPreviousTowEvents logic needs review for new schema');
    return false; 
  }
  */
}
