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

interface ChatMessage {
  id: string;
  customerName: string;
  message: string;
  timestamp: string;
  urgency: 'low' | 'medium' | 'high';
  status: 'active' | 'waiting' | 'resolved';
}

const Dashboard = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      customerName: 'Maria Papadopoulos',
      message: 'My car broke down on the highway near Thessaloniki. I need immediate assistance.',
      timestamp: '2 minutes ago',
      urgency: 'high',
      status: 'active'
    },
    {
      id: '2',
      customerName: 'Nikos Stavros',
      message: 'I had a minor accident in Athens. Need to file a claim.',
      timestamp: '5 minutes ago',
      urgency: 'medium',
      status: 'waiting'
    },
    {
      id: '3',
      customerName: 'Elena Kostas',
      message: 'Question about my policy coverage for international travel.',
      timestamp: '8 minutes ago',
      urgency: 'low',
      status: 'active'
    }
  ]);

  const [newMessageCount, setNewMessageCount] = useState(0);

  useEffect(() => {
    // Simulate new messages arriving
    const interval = setInterval(() => {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        customerName: `Customer ${Math.floor(Math.random() * 1000)}`,
        message: 'New message from customer...',
        timestamp: 'Just now',
        urgency: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high',
        status: 'active'
      };
      
      setMessages(prev => [newMessage, ...prev]);
      setNewMessageCount(prev => prev + 1);
      
      // Reset counter after 3 seconds
      setTimeout(() => setNewMessageCount(0), 3000);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

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
                <p className="text-2xl font-bold text-blue-600">24</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-orange-600">8</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-red-600">3</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response</p>
                <p className="text-2xl font-bold text-green-600">2.3m</p>
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
            {messages.map((message, index) => (
              <div 
                key={message.id}
                className={`p-4 rounded-lg border transition-all duration-500 hover:shadow-md ${
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
                  </div>
                  <span className="text-sm text-gray-500">{message.timestamp}</span>
                </div>
                <p className="text-gray-700">{message.message}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
