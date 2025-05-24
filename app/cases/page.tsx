"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Filter, AlertTriangle, MapPin, Phone, Mail, Car } from 'lucide-react';

interface CaseData {
  id: string;
  customerName: string;
  caseType: 'accident_care' | 'road_assistance' | 'other';
  description: string;
  location: string;
  fraudScore: number;
  isFastCase: boolean;
  waitedOverHour: boolean;
  status: 'active' | 'pending' | 'resolved';
  timestamp: string;
  urgency: 'low' | 'medium' | 'high';
}

interface CustomerInfo {
  fullName: string;
  vehicleRegistration: string;
  afm: string;
  contractStart: string;
  contractEnd: string;
  phone: string;
  email: string;
  address: string;
}

const Cases = () => {
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  
  const mockCases: CaseData[] = [
    {
      id: '1',
      customerName: 'Maria Papadopoulos',
      caseType: 'accident_care',
      description: 'Collision with another vehicle on Kifisias Avenue',
      location: 'Athens, Kifisias Avenue',
      fraudScore: 85,
      isFastCase: false,
      waitedOverHour: true,
      status: 'active',
      timestamp: '2024-01-15 14:30',
      urgency: 'high'
    },
    {
      id: '2',
      customerName: 'Nikos Stavros',
      caseType: 'road_assistance',
      description: 'Engine breakdown on highway A1',
      location: 'Thessaloniki, A1 Highway',
      fraudScore: 15,
      isFastCase: true,
      waitedOverHour: false,
      status: 'pending',
      timestamp: '2024-01-15 16:45',
      urgency: 'medium'
    },
    {
      id: '3',
      customerName: 'Elena Georgiou',
      caseType: 'accident_care',
      description: 'Minor collision in parking lot',
      location: 'Patras, City Center',
      fraudScore: 45,
      isFastCase: true,
      waitedOverHour: false,
      status: 'resolved',
      timestamp: '2024-01-14 10:20',
      urgency: 'low'
    },
    {
      id: '4',
      customerName: 'Dimitris Kokkos',
      caseType: 'road_assistance',
      description: 'Flat tire on rural road',
      location: 'Crete, Rural Road',
      fraudScore: 10,
      isFastCase: false,
      waitedOverHour: true,
      status: 'active',
      timestamp: '2024-01-15 18:15',
      urgency: 'high'
    },
    {
      id: '5',
      customerName: 'Sofia Dimitriou',
      caseType: 'other',
      description: 'General inquiry about insurance coverage',
      location: 'Rhodes, City Center',
      fraudScore: 5,
      isFastCase: true,
      waitedOverHour: false,
      status: 'resolved',
      timestamp: '2024-01-13 09:30',
      urgency: 'low'
    }
  ];

  const mockCustomerInfo: CustomerInfo = {
    fullName: 'Maria Papadopoulos',
    vehicleRegistration: 'ΑΒΓ-1234',
    afm: '123456789',
    contractStart: '2023-01-15',
    contractEnd: '2024-01-15',
    phone: '+30 210 1234567',
    email: 'maria.papadopoulos@email.com',
    address: 'Kifisias Avenue 123, Athens, 11523'
  };

  const filteredCases = mockCases.filter(caseItem => {
    const matchesSearch = caseItem.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         caseItem.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         caseItem.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || caseItem.caseType === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getCaseTypeLabel = (type: string) => {
    switch (type) {
      case 'accident_care': return 'Accident Care (AC)';
      case 'road_assistance': return 'Road Assistance (RA)';
      case 'other': return 'Other';
      default: return type;
    }
  };

  const getFraudRiskLevel = (score: number) => {
    if (score >= 70) return { level: 'High', color: 'text-red-600', bgColor: 'bg-red-100' };
    if (score >= 40) return { level: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { level: 'Low', color: 'text-green-600', bgColor: 'bg-green-100' };
  };

  if (selectedCase) {
    const caseDetails = mockCases.find(c => c.id === selectedCase);
    if (!caseDetails) return null;

    const fraudRisk = getFraudRiskLevel(caseDetails.fraudScore);

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <button
                onClick={() => setSelectedCase(null)}
                className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Cases
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                Case #{caseDetails.id} - {caseDetails.customerName}
              </h1>
            </div>
          </div>
        </header>

        {/* Case Details */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Case Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Case Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Case Type</label>
                  <p className="text-gray-900">{getCaseTypeLabel(caseDetails.caseType)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-gray-900">{caseDetails.description}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Location</label>
                  <div className="flex items-center text-gray-900">
                    <MapPin className="w-4 h-4 mr-2" />
                    {caseDetails.location}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(caseDetails.status)}`}>
                    {caseDetails.status.charAt(0).toUpperCase() + caseDetails.status.slice(1)}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Urgency</label>
                  <p className={`font-medium ${getUrgencyColor(caseDetails.urgency)}`}>
                    {caseDetails.urgency.charAt(0).toUpperCase() + caseDetails.urgency.slice(1)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Timestamp</label>
                  <p className="text-gray-900">{caseDetails.timestamp}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Fraud Risk Score</label>
                  <div className="flex items-center">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${fraudRisk.bgColor} ${fraudRisk.color}`}>
                      {fraudRisk.level} ({caseDetails.fraudScore}%)
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  {caseDetails.isFastCase && (
                    <span className="text-green-600">✓ Fast Case</span>
                  )}
                  {caseDetails.waitedOverHour && (
                    <span className="text-red-600">⚠ Waited Over 1 Hour</span>
                  )}
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Full Name</label>
                  <p className="text-gray-900">{mockCustomerInfo.fullName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Vehicle Registration</label>
                  <div className="flex items-center text-gray-900">
                    <Car className="w-4 h-4 mr-2" />
                    {mockCustomerInfo.vehicleRegistration}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">AFM</label>
                  <p className="text-gray-900">{mockCustomerInfo.afm}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Contract Period</label>
                  <p className="text-gray-900">
                    {mockCustomerInfo.contractStart} - {mockCustomerInfo.contractEnd}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <div className="flex items-center text-gray-900">
                    <Phone className="w-4 h-4 mr-2" />
                    {mockCustomerInfo.phone}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <div className="flex items-center text-gray-900">
                    <Mail className="w-4 h-4 mr-2" />
                    {mockCustomerInfo.email}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Address</label>
                  <p className="text-gray-900">{mockCustomerInfo.address}</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link
                href="/"
                className="flex items-center text-gray-600 hover:text-gray-900 mr-6"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Home
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Cases Management</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search cases..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="accident_care">Accident Care</option>
                  <option value="road_assistance">Road Assistance</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Cases List */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Active Cases ({filteredCases.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredCases.map((caseItem) => {
              const fraudRisk = getFraudRiskLevel(caseItem.fraudScore);
              
              return (
                <div
                  key={caseItem.id}
                  className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedCase(caseItem.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {caseItem.customerName}
                        </h3>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(caseItem.status)}`}>
                          {caseItem.status.charAt(0).toUpperCase() + caseItem.status.slice(1)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {getCaseTypeLabel(caseItem.caseType)}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">{caseItem.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {caseItem.location}
                        </div>
                        <span>{caseItem.timestamp}</span>
                        {caseItem.isFastCase && (
                          <span className="text-green-600">Fast Case</span>
                        )}
                        {caseItem.waitedOverHour && (
                          <span className="text-red-600 flex items-center">
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            Over 1 Hour
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className={`text-sm font-medium ${getUrgencyColor(caseItem.urgency)}`}>
                          {caseItem.urgency.charAt(0).toUpperCase() + caseItem.urgency.slice(1)} Priority
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full ${fraudRisk.bgColor} ${fraudRisk.color}`}>
                          Fraud Risk: {fraudRisk.level}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Cases;
