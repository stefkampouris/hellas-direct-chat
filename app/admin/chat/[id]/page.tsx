"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

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

// Message interface for chat messages
interface Message {
  id: string;
  incident_id: string;
  sender: string;
  content: string;
  timestamp: string;
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [incidentId, setIncidentId] = useState<string | null>(null);

  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params;
      setIncidentId(resolvedParams.id);
    };
    
    initializeParams();
  }, [params]);

  useEffect(() => {
    if (!incidentId) return;

    const fetchIncidentData = async () => {
      try {
        setLoading(true);
        // Fetch the incident with related user data
        const { data: incidentData, error: incidentError } = await supabase
          .from('incidents')
          .select('*, users (*)')
          .eq('id', incidentId)
          .single();

        if (incidentError) {
          throw incidentError;
        }

        setIncident(incidentData);

        // Mock messages for now - in a real app these would come from a chat table
        // This is just for demonstration
        const mockMessages = [
          {
            id: '1',
            incident_id: incidentId,
            sender: 'system',
            content: 'Η συνομιλία ξεκίνησε. Παρακαλώ περιμένετε για έναν εκπρόσωπο.',
            timestamp: new Date(Date.now() - 180000).toISOString()
          },
          {
            id: '2',
            incident_id: incidentId,
            sender: 'agent',
            content: 'Καλημέρα σας! Είμαι ο βοηθός σας από την Hellas Direct. Για να σας εξυπηρετήσω καλύτερα, θα ήθελα το ονοματεπώνυμό σας και τον αριθμό κυκλοφορίας του οχήματός σας, παρακαλώ.',
            timestamp: new Date(Date.now() - 170000).toISOString()
          },
          {
            id: '3',
            incident_id: incidentId,
            sender: 'user',
            content: 'Γεια σας. Με λένε Γιώργος Παπαδόπουλος και ο αριθμός κυκλοφορίας είναι ΑΒΖ-1234.',
            timestamp: new Date(Date.now() - 150000).toISOString()
          },
          {
            id: '4',
            incident_id: incidentId,
            sender: 'agent',
            content: 'Ευχαριστώ, κύριε Παπαδόπουλε. Μπορείτε να μου περιγράψετε τι ακριβώς συνέβη και πού βρίσκεστε αυτή τη στιγμή;',
            timestamp: new Date(Date.now() - 140000).toISOString()
          },
          {
            id: '5',
            incident_id: incidentId,
            sender: 'user',
            content: 'Το αυτοκίνητο σταμάτησε ξαφνικά ενώ οδηγούσα. Δεν παίρνει μπρος. Είμαι στην Εθνική Οδό Αθηνών-Λαμίας, στο ρεύμα προς Λαμία, κοντά στη έξοδο για Θήβα.',
            timestamp: new Date(Date.now() - 120000).toISOString()
          },
          {
            id: '6',
            incident_id: incidentId,
            sender: 'agent',
            content: 'Κατανοητό. Και πού θα θέλατε να μεταφερθεί το όχημά σας, σε περίπτωση που δεν μπορεί να επισκευαστεί επί τόπου;',
            timestamp: new Date(Date.now() - 100000).toISOString()
          },
          {
            id: '7',
            incident_id: incidentId,
            sender: 'user',
            content: 'Θα ήθελα να πάει στο συνεργείο μου στην Αθήνα, στην οδό Πειραιώς 100.',
            timestamp: new Date(Date.now() - 80000).toISOString()
          },
          {
            id: '8',
            incident_id: incidentId,
            sender: 'agent',
            content: 'Μάλιστα. Από την περιγραφή σας, πιθανολογώ ότι μπορεί να υπάρχει κάποιο πρόβλημα με την μπαταρία ή το σύστημα τροφοδοσίας καυσίμου. Θα στείλουμε άμεσα τεχνικό για έναν έλεγχο και πιθανή επιτόπου εκκίνηση. Ο τελικός προορισμός που μου είπατε (Αθήνα) είναι εντός του νομού Αττικής, σωστά;',
            timestamp: new Date(Date.now() - 60000).toISOString()
          },
          {
            id: '9',
            incident_id: incidentId,
            sender: 'user',
            content: 'Ναι, η Αθήνα είναι εντός Αττικής. Ελπίζω να φτιαχτεί γρήγορα.',
            timestamp: new Date(Date.now() - 50000).toISOString()
          },
          {
            id: '10',
            incident_id: incidentId,
            sender: 'agent',
            content: 'Θα κάνουμε ό,τι καλύτερο μπορούμε. Σε περίπτωση που χρειαστεί μεταφορά σε συνεργείο, το προτεινόμενο συνεργαζόμενο συνεργείο μας κοντά στην τρέχουσα τοποθεσία σας που εξειδικεύεται σε τέτοιες βλάβες είναι το "AutoFix Experts" στη Θήβα. Εναλλακτικά, μπορούμε να το μεταφέρουμε στο συνεργείο σας στην Αθήνα όπως είπατε. Τι προτιμάτε;',
            timestamp: new Date(Date.now() - 30000).toISOString()
          },
           {
            id: '11',
            incident_id: incidentId,
            sender: 'user',
            content: 'Ας έρθει πρώτα ο τεχνικός και βλέπουμε. Αν δεν φτιάχνεται, τότε στο δικό μου συνεργείο στην Αθήνα.',
            timestamp: new Date(Date.now() - 10000).toISOString()
          }
        ];
        
        setMessages(mockMessages);
        setLoading(false);
      } catch (err: any) {
        console.error("Error fetching incident data:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchIncidentData();

    // Set up realtime subscription for incident updates
    const subscription = supabase
      .channel(`incident-${incidentId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'incidents', filter: `id=eq.${incidentId}` },
        (payload: RealtimePostgresChangesPayload<Incident>) => {
          console.log('Incident updated:', payload);
          // Fetch the complete incident with user data
          supabase
            .from('incidents')
            .select('*, users (*)')
            .eq('id', incidentId)
            .single()
            .then(({ data }: { data: Incident | null }) => {
              if (data) {
                setIncident(data);
              }
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [incidentId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !incidentId) return;

    // In a real app, you would send this to your backend/database
    const newMsg: Message = {
      id: `temp-${Date.now()}`,
      incident_id: incidentId,
      sender: 'agent',
      content: newMessage,
      timestamp: new Date().toISOString()
    };

    // Optimistically add to UI
    setMessages([...messages, newMsg]);
    setNewMessage('');

    // In a real implementation, you would save to database here
    // For now, we're just simulating the UI experience
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading incident data...</p>
        </div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-2xl text-red-600 mb-2">Error Loading Chat</h2>
            <p className="text-red-700">{error || "Incident not found"}</p>
            <Link href="/admin" className="mt-4 inline-block text-blue-600 hover:underline">
              Return to Admin Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <Link href="/admin" className="flex items-center text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span className="text-sm text-gray-600">Chat Active</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Incident Details Panel */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h2 className="text-xl font-medium text-gray-900 mb-4">Incident Details</h2>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-semibold text-gray-700">ID</p>
                  <p className="text-sm text-gray-600">{incident.id}</p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-semibold text-gray-700">Customer</p>
                  <p className="text-sm text-gray-600">{incident.users?.full_name || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">{incident.users?.email || 'No email'}</p>
                  <p className="text-xs text-gray-500">Phone: {incident.users?.phone_number || 'Not provided'}</p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-semibold text-gray-700">Vehicle</p>
                  <p className="text-sm text-gray-600">Reg: {incident.registration_number || 'Not provided'}</p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-semibold text-gray-700">Location</p>
                  <p className="text-sm text-gray-600">{incident.location || 'Unknown'}</p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-semibold text-gray-700">Problem</p>
                  <p className="text-sm text-gray-600">{incident.description || 'No description provided'}</p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-semibold text-gray-700">Case Type</p>
                  <p className="text-sm text-gray-600">{incident.case_type || 'Not categorized'}</p>
                </div>
                
                {incident.is_fraud_case ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm font-semibold text-red-700">⚠️ Potential Fraud Case</p>
                    <p className="text-sm text-red-600">Fraud score: {incident.is_fraud_case}</p>
                  </div>
                ) : null}
                
                {incident.final_vehicle_destination && (
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="text-sm font-semibold text-gray-700">Vehicle Destination</p>
                    <p className="text-sm text-gray-600">{incident.final_vehicle_destination}</p>
                  </div>
                )}

                {/* Display images if available */}
                {incident.images && incident.images.length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-md mt-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Incident Images</p>
                    <div className="grid grid-cols-2 gap-2">
                      {incident.images.map((imageUrl, index) => (
                        <div key={index} className="relative aspect-square overflow-hidden rounded-md border border-gray-200">
                          <img 
                            src={imageUrl} 
                            alt={`Incident image ${index + 1}`}
                            className="object-cover w-full h-full hover:scale-105 transition-transform cursor-pointer"
                            onClick={() => window.open(imageUrl, '_blank')}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Chat Panel */}
          <div className="lg:w-2/3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col h-[70vh]">
              <div className="p-4 border-b border-gray-100">
                <h2 className="text-xl font-medium text-gray-900">Live Chat</h2>
              </div>
              
              {/* Chat messages area */}
              <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div 
                    key={message.id}
                    className={`flex ${message.sender === 'agent' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[70%] p-3 rounded-lg ${
                        message.sender === 'agent' 
                          ? 'bg-blue-500 text-white' 
                          : message.sender === 'system' 
                            ? 'bg-gray-200 text-gray-700 text-center w-full text-sm italic' 
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {message.content}
                      <div className="text-xs mt-1 opacity-70">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Message input area */}
              <div className="p-4 border-t border-gray-100">
                <form onSubmit={sendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-grow border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Type your message..."
                  />
                  <button 
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2 flex items-center"
                  >
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
