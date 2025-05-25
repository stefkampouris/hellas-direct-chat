// app/api/debug/incidents/route.ts - Debug endpoint to view mock database contents
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Check if we're using the mock client
    const mockDB = (supabase as any)._mockDB;
    
    if (mockDB) {
      return NextResponse.json({
        message: 'Mock Database Contents',
        tables: mockDB,
        incidents: mockDB.incidents || [],
        totalIncidents: (mockDB.incidents || []).length
      }, { status: 200 });
    } else {
      // Real Supabase - just return the count
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false });
      
      return NextResponse.json({
        message: 'Real Supabase Database',
        incidents: data || [],
        error: error
      }, { status: 200 });
    }
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to fetch incidents',
      details: error.message
    }, { status: 500 });
  }
}
