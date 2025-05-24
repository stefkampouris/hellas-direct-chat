"use client";

import React, { useState, useRef, useCallback } from "react";
import { CaseData, analyzeMessageForInsurance } from "../lib/dialogflow";
import type { Message, DialogflowResponse } from "../types/hellas-direct";
import VoiceRecorder from "./components/VoiceRecorder";

// Enhanced Dialogflow integration using our API route
async function sendToDialogflow(message: string, sessionId?: string): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, sessionId }),
  });

  if (!response.ok) {
    throw new Error('Failed to send message to Dialogflow');
  }

  const data: DialogflowResponse = await response.json();
  return data.response;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      from: "bot",
      text: "👋 Καλώς ήρθατε στη Hellas Direct! Εξυπηρετώ μόνο Ατυχήματα (AC) και Οδική Βοήθεια (RA). Περιγράψτε το περιστατικό σας για να ξεκινήσουμε."
    }
  ]);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const [caseData, setCaseData] = useState<CaseData>({});
  const [sessionId] = useState<string>(() => `session-${Date.now()}-${Math.random().toString(36).substring(2)}`);

  // Scroll to bottom whenever messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle voice input results from VoiceRecorder
  const handleVoiceResult = useCallback((result: { text: string; source: 'speech-recognition' | 'dialogflow-audio' }) => {
    if (result.source === 'speech-recognition') {
      // For speech recognition, set the input text for user to review
      setInput(result.text);
    } else {
      // For Dialogflow audio, add the response directly as a bot message
      setMessages(msgs => [...msgs, { 
        from: "bot", 
        text: result.text
      }]);
    }
  }, []);

  async function handleUserMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userMsg = input.trim();
    setInput("");
    setIsLoading(true);
    
    console.log(`📤 User message: "${userMsg}"`);
    
    // Add user message immediately
    setMessages(msgs => [...msgs, { from: "user", text: userMsg }]);
    
    try {
      // Send to Dialogflow through our API
      const botReply = await sendToDialogflow(userMsg, sessionId);
      
      console.log(`📥 Bot reply: "${botReply}"`);
      
      // Add bot response with natural delay
      setTimeout(() => {
        setMessages(msgs => [...msgs, { 
          from: "bot", 
          text: botReply || "Συγγνώμη, δε μπόρεσα να καταλάβω. Μπορείτε να επαναδιατυπώσετε την ερώτησή σας;"
        }]);
        setIsLoading(false);
      }, 800);
      
    } catch (error) {
      console.error('Error sending message:', error);
      setTimeout(() => {
        setMessages(msgs => [...msgs, { 
          from: "bot", 
          text: "Παρουσιάστηκε πρόβλημα σύνδεσης. Παρακαλώ δοκιμάστε ξανά σε λίγο." 
        }]);
        setIsLoading(false);
      }, 500);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Chat container */}
      <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto p-4">
        {/* Header */}
        <div className="py-4 border-b border-gray-200 mb-4">
          <h1 className="text-xl font-medium text-gray-800">Hellas Direct Assistant</h1>
        </div>
        
        {/* Message area */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 px-1">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] px-4 py-3 rounded-lg ${
                message.from === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-white border border-gray-200 text-gray-700 rounded-bl-none shadow-sm'
              }`}>
                {message.text}
              </div>
            </div>
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 text-gray-500 rounded-lg rounded-bl-none px-4 py-3 shadow-sm max-w-[80%]">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          {/* Auto-scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input area */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 rounded-t-lg shadow-lg">
          <form onSubmit={handleUserMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Γράψτε το μήνυμά σας..."
              className="flex-1 p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
              autoFocus
            />
            
            <button
              type="submit"
              disabled={isLoading}
              className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
              </svg>
            </button>
          </form>
          
          {/* Enhanced Voice Recorder */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <VoiceRecorder 
              onAudioResult={handleVoiceResult}
              sessionId={sessionId}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}