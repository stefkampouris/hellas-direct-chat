"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  MessageSquare, 
  Clock, 
  AlertCircle, 
  CheckCircle 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

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
  case_type?: string | null;
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
  users?: User; // For joined user data
}

interface ChatMessage {
  id: string;
  customerName: string;
  message: string;
  timestamp: string;
  urgency: 'low' | 'medium' | 'high';
  status: 'active' | 'waiting' | 'resolved';
}

const Dashboard = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessageCount, setNewMessageCount] = useState(0);

  // Function to create test data
  const createTestData = async () => {
    try {
      const response = await fetch('/api/create-test-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      if (result.success) {
        alert('Test data created successfully! Refresh the page to see new conversations.');
        // Refresh the incidents
        window.location.reload();
      } else {
        alert('Failed to create test data: ' + result.details);
      }
    } catch (error) {
      console.error('Error creating test data:', error);
      alert('Error creating test data. Check console for details.');
    }
  };

  useEffect(() => {
    // Fetch real incidents from database
    const fetchIncidents = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data: incidentsData, error: incidentsError } = await supabase
          .from('incidents')
          .select('*, users (full_name, email, phone_number)')
          .order('created_at', { ascending: false });
        
        if (incidentsError) throw incidentsError;
        setIncidents(incidentsData || []);
        
      } catch (err: any) {
        console.error("Error fetching incidents:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchIncidents();

    // Set up real-time subscription for new incidents
    const incidentsSubscription: RealtimeChannel = supabase
      .channel('dashboard-incidents')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        (payload: RealtimePostgresChangesPayload<Incident>) => {
          console.log('Dashboard: Incident change received!', payload);
          
          if (payload.eventType === 'INSERT') {
            // Fetch the complete data with user info for new incident
            supabase
              .from('incidents')
              .select('*, users (full_name, email, phone_number)')
              .eq('id', payload.new.id)
              .single()
              .then(({ data }: { data: Incident | null }) => {
                if (data) {
                  setIncidents(current => [data, ...current]);
                  setNewMessageCount(prev => prev + 1);
                  
                  // Reset counter after 5 seconds
                  setTimeout(() => setNewMessageCount(0), 5000);
                }
              });
          } else if (payload.eventType === 'UPDATE') {
            // Update existing incident in the list
            supabase
              .from('incidents')
              .select('*, users (full_name, email, phone_number)')
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
            // Remove from the list
            setIncidents(current => 
              current.filter(inc => inc.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status: string, err?: Error) => {
        if (err) {
          console.error('Error subscribing to incident updates:', err);
          setError('Failed to subscribe to incident updates: ' + err.message);
        }
      });

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(incidentsSubscription);
    };
  }, []);

  // Convert incident to message format for display
  const convertIncidentToMessage = (incident: Incident): ChatMessage => {
    const getUrgencyFromIncident = (incident: Incident): 'low' | 'medium' | 'high' => {
      if (incident.is_fraud_case && incident.is_fraud_case > 0) return 'high';
      if (incident.case_type === 'AC') return 'high';
      if (incident.is_fast_case) return 'medium';
      return 'low';
    };

    const getStatusFromIncident = (incident: Incident): 'active' | 'waiting' | 'resolved' => {
      if (incident.case_summary?.includes('resolved') || incident.case_summary?.includes('completed')) return 'resolved';
      if (incident.final_vehicle_destination) return 'waiting';
      return 'active';
    };

    return {
      id: incident.id,
      customerName: incident.users?.full_name || 'Unknown Customer',
      message: incident.description || incident.possible_vehicle_malfunction || 'New incident reported',
      timestamp: new Date(incident.created_at).toLocaleString(),
      urgency: getUrgencyFromIncident(incident),
      status: getStatusFromIncident(incident)
    };
  };

  const messages = incidents.map(convertIncidentToMessage);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 border-red-300 text-red-800';
      case 'medium': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'low': return 'bg-green-100 border-green-300 text-green-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case 'waiting': return <Clock className="w-4 h-4 text-orange-600" />;
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center text-blue-600 hover:text-blue-800 transition-colors">
                <ArrowLeft className="w-5 h-5 mr-2" />
                <span>Back to Home</span>
              </Link>
              <div className="w-px h-6 bg-gray-300"></div>
              <h1 className="text-xl font-bold text-gray-900">Live Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              {newMessageCount > 0 && (
                <div className="animate-bounce bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {newMessageCount} new
                </div>
              )}
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Live</span>
              </div>
              {/* Test Data Button */}
              {(!loading && incidents.length === 0) && (
                <button
                  onClick={createTestData}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Create Test Data
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Chats</p>
                <p className="text-2xl font-bold text-blue-600">
                  {loading ? '...' : messages.filter(m => m.status === 'active').length}
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-orange-600">
                  {loading ? '...' : messages.filter(m => m.status === 'waiting').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-red-600">
                  {loading ? '...' : messages.filter(m => m.urgency === 'high').length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cases</p>
                <p className="text-2xl font-bold text-green-600">
                  {loading ? '...' : incidents.length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Live Chat Feed */}
        <div className="bg-white rounded-xl shadow-lg border border-blue-100">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Live Customer Interactions</h2>
            <p className="text-gray-600">Real-time feed of customer-chatbot conversations</p>
          </div>
          
          <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
            {loading && (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-600">Loading conversations...</p>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
                <p className="text-red-700">Error loading conversations: {error}</p>
              </div>
            )}
            
            {!loading && !error && messages.length === 0 && (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No conversations yet. Start chatting with customers!</p>
              </div>
            )}
            
            {!loading && !error && messages.map((message, index) => (
              <Link 
                key={message.id}
                href={`/admin/chat/${message.id}`}
                className={`block p-4 rounded-lg border transition-all duration-500 hover:shadow-md hover:border-blue-300 cursor-pointer ${
                  index === 0 ? 'animate-pulse' : ''
                }`}
                style={{
                  animationDelay: `${index * 100}ms`
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(message.status)}
                    <span className="font-medium text-gray-900">{message.customerName}</span>
                    <span className={`px-2 py-1 text-xs rounded-full border ${getUrgencyColor(message.urgency)}`}>
                      {message.urgency}
                    </span>
                    {incidents.find(i => i.id === message.id)?.case_type && (
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 border-blue-300 text-blue-800">
                        {incidents.find(i => i.id === message.id)?.case_type}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">{message.timestamp}</span>
                </div>
                <p className="text-gray-700">{message.message}</p>
                {incidents.find(i => i.id === message.id)?.location && (
                  <p className="text-sm text-gray-500 mt-1">
                    📍 {incidents.find(i => i.id === message.id)?.location}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
