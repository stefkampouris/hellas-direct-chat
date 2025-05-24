// types/hellas-direct.d.ts - TypeScript types for Hellas Direct chat application

export interface Message {
  from: "user" | "bot";
  text: string;
  timestamp?: Date;
}

export interface DialogflowResponse {
  response: string;
  sessionId?: string;
  intent?: string;
  confidence?: number;
}

export interface DialogflowRequest {
  message: string;
  sessionId?: string;
}

export interface CaseData {
  type?: 'AC' | 'RA' | 'OTHER';
  customerName?: string;
  registrationNumber?: string;
  location?: string;
  description?: string;
  finalDestination?: string;
  
  // AC (Accident) specific fields
  fastTrack?: boolean;
  fraud?: boolean;
  injuryAsked?: boolean;
  damageAsked?: boolean;
  insuranceAsked?: boolean;
  photosAsked?: boolean;
  
  // RA (Roadside Assistance) specific fields
  possibleMalfunction?: string;
  reserveAsked?: boolean;
  directionAsked?: boolean;
  colorAsked?: boolean;
  repairShopAsked?: boolean;
  
  // Common additional fields
  delayCoupon?: boolean;
  geolocLink?: boolean;
  notAccessible?: boolean;
}

export interface VoiceRecognitionConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  isListening: boolean;
  sessionId: string;
  caseData: CaseData;
}

// Extend the Window interface for Speech Recognition
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export {};
