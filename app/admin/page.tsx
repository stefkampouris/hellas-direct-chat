"use client";

import React from 'react';
import Link from 'next/link';
import { BarChart3, MessageSquare, AlertTriangle, Users } from 'lucide-react';

const AdminIndex = () => {
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
                <Users className="w-6 h-6 text-white" />
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
      </main>
    </div>
  );
};

export default AdminIndex;
