"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart3, MessageSquare, AlertTriangle, Users as UsersIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Define types for the data based on the schema provided
interface User {
  id: string;
  created_at: string;
  full_name?: string | null;
  registration_number?: string | null;
  afm?: string | null;
  starting_date?: string | null;
  ending_at?: string | null;
  phone_number?: string | null;
  email?: string | null;
  address?: string | null;
}

interface Incident {
  id: string;
  created_at: string;
  user_id: string;
  registration_number?: string | null;
  location?: string | null;
  description?: string | null;
  case_type?: string | null; // Assuming caseType is a string enum in the DB
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
  users?: Partial<User> | null; // For joined user data
}

const AdminIndex = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch initial data
    const fetchInitialData = async () => {
      setError(null);
      try {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });
        if (usersError) throw usersError;
        setUsers(usersData || []);

        const { data: incidentsData, error: incidentsError } = await supabase
          .from('incidents')
          .select('*, users (full_name, email)') // Fetch related user data
          .order('created_at', { ascending: false });
        if (incidentsError) throw incidentsError;
        setIncidents(incidentsData || []);

      } catch (err: any) {
        console.error("Error fetching initial data:", err);
        setError(err.message);
      }
    };

    fetchInitialData();

    // Set up real-time subscriptions
    const usersSubscription: RealtimeChannel = supabase
      .channel('public-users-admin') // Unique channel name
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload: RealtimePostgresChangesPayload<User>) => { // Added type for payload
          console.log('Users change received!', payload);
          
          // Process user changes efficiently without full refetch
          if (payload.eventType === 'INSERT') {
            setUsers(current => [payload.new as User, ...current]);
            
            // Also refetch incidents since they might be affected by new user data
            fetchInitialData();
          } else if (payload.eventType === 'UPDATE') {
            // Update user in the users list
            setUsers(current => 
              current.map(user => user.id === payload.new.id ? payload.new as User : user)
            );
            
            // For incidents with this updated user, we need to refetch
            fetchInitialData();
          } else if (payload.eventType === 'DELETE') {
            setUsers(current => 
              current.filter(user => user.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status: string, err?: Error) => { // Added type for err and status
        if (err) {
          console.error('Error subscribing to users changes:', err);
          setError('Failed to subscribe to user updates: ' + err.message);
        }
      });

    const incidentsSubscription: RealtimeChannel = supabase
      .channel('public-incidents-admin') // Unique channel name
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        (payload: RealtimePostgresChangesPayload<Incident>) => { // Added type for payload
          console.log('Incidents change received!', payload);
          
          // More efficient handling of real-time updates
          if (payload.eventType === 'INSERT') {
            // For new incidents, fetch the complete data with user info
            supabase
              .from('incidents')
              .select('*, users (full_name, email)')
              .eq('id', payload.new.id)
              .single()
              .then(({ data }: { data: Incident | null }) => {
                if (data) {
                  setIncidents(current => [data, ...current]);
                }
              });
          } else if (payload.eventType === 'UPDATE') {
            // For updates, fetch the updated incident and replace in the list
            supabase
              .from('incidents')
              .select('*, users (full_name, email)')
              .eq('id', payload.new.id)
              .single()
              .then(({ data }: { data: Incident | null }) => {
                if (data) {
                  setIncidents(current => 
                    current.map(inc => inc.id === data.id ? data : inc)
                  );
                }
              });
          } else if (payload.eventType === 'DELETE') {
            // For deletions, remove from the list
            setIncidents(current => 
              current.filter(inc => inc.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status: string, err?: Error) => { // Added type for err and status
        if (err) {
          console.error('Error subscribing to incidents changes:', err);
          setError('Failed to subscribe to incident updates: ' + err.message);
        }
      });
    // Cleanup subscriptions on component unmount
    return () => {
      supabase.removeChannel(usersSubscription);
      supabase.removeChannel(incidentsSubscription);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <img 
                src="/lovable-uploads/e890560a-2ca6-4602-bf77-f7d595cb105f.png" 
                alt="Hellas Direct" 
                className="h-12 w-auto"
              />
              <div className="hidden sm:block">
                <p className="text-sm text-gray-500">Internal Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">System Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-5xl font-light text-gray-900 mb-6">
            Control Center
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto font-light">
            Monitor real-time customer interactions, manage cases, and ensure exceptional service delivery across Greece.
          </p>
        </div>

        {/* Quick Access Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Link 
            href="/dashboard" 
            className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 p-8 border border-gray-100 hover:border-gray-200"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl">📊</div>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Live Dashboard</h3>
            <p className="text-gray-600 font-light">Monitor real-time customer conversations and system metrics</p>
            <div className="mt-4 flex items-center text-black font-medium">
              Enter Dashboard
              <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300">→</span>
            </div>
          </Link>

          <Link 
            href="/cases" 
            className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 p-8 border border-gray-100 hover:border-gray-200"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl">🚗</div>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Active Cases</h3>
            <p className="text-gray-600 font-light">View and manage customer incident reports and road assistance</p>
            <div className="mt-4 flex items-center text-gray-800 font-medium">
              Manage Cases
              <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300">→</span>
            </div>
          </Link>

          <div className="group bg-white rounded-lg shadow-sm p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                <UsersIcon className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl">👥</div>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">System Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-light">Active Agents</span>
                <span className="text-green-600 font-medium">12</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-light">Pending Cases</span>
                <span className="text-orange-600 font-medium">8</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-light">Response Time</span>
                <span className="text-gray-800 font-medium">2.3min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-100">
          <h3 className="text-2xl font-light text-gray-900 mb-8 text-center">Platform Features</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-4">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-gray-700" />
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Real-time Chat</h4>
              <p className="text-sm text-gray-600 font-light">Monitor live customer interactions</p>
            </div>
            <div className="text-center p-4">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-gray-700" />
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Fraud Detection</h4>
              <p className="text-sm text-gray-600 font-light">AI-powered risk assessment</p>
            </div>
            <div className="text-center p-4">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🏍️</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Agent Tracking</h4>
              <p className="text-sm text-gray-600 font-light">Live agent location updates</p>
            </div>
            <div className="text-center p-4">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📍</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Geolocation</h4>
              <p className="text-sm text-gray-600 font-light">Precise incident mapping</p>
            </div>
          </div>
        </div>

        {/* Real-time Data Display Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-light text-gray-900 mb-8 text-center">Real-time Data Overview</h2>
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 border border-red-400 rounded-md">
              <p className="font-semibold">Error:</p>
              <p>{error}</p>
            </div>
          )}
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Users List */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-xl font-medium text-gray-900 mb-4">Registered Users ({users.length})</h3>
              {users.length === 0 && !error && <p className="text-gray-500">No users found or still loading...</p>}
              <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {users.map(user => (
                  <li key={user.id} className="text-sm text-gray-700 p-3 border rounded-md shadow-xs hover:shadow-sm transition-shadow">
                    <p className="font-semibold text-gray-800">{user.full_name || 'N/A'}</p>
                    <p className="text-xs text-gray-500">Email: {user.email || 'No email'}</p>
                    <p className="text-xs text-gray-500">Phone: {user.phone_number || 'No phone'}</p>
                    <p className="text-xs text-gray-500">AFM: {user.afm || 'N/A'} | Reg. No: {user.registration_number || 'N/A'}</p>
                    <p className="text-xs text-gray-400">Joined: {new Date(user.created_at).toLocaleDateString()}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Incidents List */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-xl font-medium text-gray-900 mb-4">Live Customer Interactions ({incidents.length})</h3>
              {incidents.length === 0 && !error && <p className="text-gray-500">No interactions found or still loading...</p>}
              <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {incidents.map(incident => (
                  <li key={incident.id} className="text-sm text-gray-700 border rounded-md shadow-xs hover:bg-gray-50 hover:shadow-md transition-all duration-200">
                    <Link href={`/admin/chat/${incident.id}`} className="block p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded mr-2">
                            {incident.case_type || 'N/A'}
                          </span>
                          {incident.is_fast_case && 
                            <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                              Fast Case
                            </span>
                          }
                          {incident.is_fraud_case && 
                            <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded ml-2">
                              Fraud Risk: {incident.is_fraud_case}
                            </span>
                          }
                        </div>
                        <span className="text-xs text-gray-400">{new Date(incident.created_at).toLocaleString()}</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3 mb-2">
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Customer</p>
                          <p className="text-sm">{incident.users?.full_name || 'Unknown'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Registration</p>
                          <p className="text-sm">{incident.registration_number || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Location</p>
                          <p className="text-sm truncate">{incident.location || 'N/A'}</p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Description</p>
                        <p className="text-sm line-clamp-2">{incident.description || 'No description'}</p>
                      </div>
                      
                      {incident.possible_vehicle_malfunction && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 font-medium">Possible Malfunction</p>
                          <p className="text-sm line-clamp-1">{incident.possible_vehicle_malfunction}</p>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center text-blue-600">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          <span className="text-xs font-medium">View Chat</span>
                        </div>
                        
                        <div className="flex space-x-2">
                          {incident.delay_voucher_issued && (
                            <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                              Voucher Issued
                            </span>
                          )}
                          {incident.final_vehicle_destination && (
                            <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                              Destination Set
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminIndex;
