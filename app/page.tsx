"use client";

import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { CaseData, analyzeMessageForInsurance } from "../lib/dialogflow";
import type { Message, DialogflowResponse } from "../types/hellas-direct";
import VoiceRecorder from "./components/VoiceRecorder";
import ImageAttachment from "./components/ImageAttachment";
import ImageMessage from "./components/ImageMessage";
import { Settings, X } from "lucide-react";

// Enhanced Dialogflow integration using our API route
async function sendToDialogflow(
  message: string, 
  sessionId?: string, 
  parameters?: Record<string, any>
): Promise<{ response: string; parameters?: Record<string, any> }> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, sessionId, parameters }),
  });

  if (!response.ok) {
    throw new Error('Failed to send message to Dialogflow');
  }

  const data: DialogflowResponse & { parameters?: Record<string, any> } = await response.json();
  return { 
    response: data.response, 
    parameters: data.parameters 
  };
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      from: "bot",
      text: "👋 Καλώς ήρθατε στη Hellas Direct! Περιγράψτε το περιστατικό σας για να ξεκινήσουμε."
    }
  ]);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState<boolean>(false);
  const [attachedImage, setAttachedImage] = useState<Message['image'] | null>(null); // Added state for attached image
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const [caseData, setCaseData] = useState<CaseData>({});
  const [sessionId] = useState<string>(() => `session-${Date.now()}-${Math.random().toString(36).substring(2)}`);
  const [sessionParameters, setSessionParameters] = useState<Record<string, any>>({}); // Add session parameters state
  const inputRef = useRef<HTMLInputElement>(null); // Added ref for input element

  // Scroll to bottom whenever messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initial focus and re-focus when loading states end
  React.useEffect(() => {
    if (!isLoading && !isAnalyzingImage && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading, isAnalyzingImage]);

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

  // Handle image attachment and analysis
  const handleImageAttachment = useCallback(async (file: File) => {
    setIsAnalyzingImage(true);
    setAttachedImage(null); // Clear previous image

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }

      const data = await response.json();

      const imageDetails = {
        url: data.imageUrl,
        analysis: data.analysis.analysis,
        filename: data.analysis.filename,
        size: data.analysis.size,
      };
      setAttachedImage(imageDetails); // Store attached image details for preview

    } catch (error) {
      console.error('Error analyzing image:', error);
      const imageDetails = {
        url: URL.createObjectURL(file),
        filename: file.name,
        size: file.size,
      };
      setAttachedImage(imageDetails); // Store attached image details even if analysis fails
    } finally {
      setIsAnalyzingImage(false);
    }
  }, []);

  // Handle removing attached image
  const handleRemoveImage = useCallback(() => {
    setAttachedImage(null);
    inputRef.current?.focus();
  }, []);

  async function handleUserMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if ((!input.trim() && !attachedImage) || isLoading) return;

    let userMsg = input.trim();
    let messageToSendToDialogflow = userMsg;
    
    const currentMessages: Message[] = [];

    if (attachedImage) {
      let imageText = `[Εικόνα: ${attachedImage.filename || 'άγνωστη εικόνα'}]`;
      if (attachedImage.analysis) {
        imageText += `\nΑνάλυση: ${attachedImage.analysis}`;
      }
      messageToSendToDialogflow = `${imageText}\n\n${userMsg}`;

      // Add a consolidated user message to the chat
      currentMessages.push({ 
        from: "user", 
        text: userMsg || "📎 Εικόνα", // Show image indicator if no text
        image: attachedImage // The attached image
      });
      setAttachedImage(null); // Clear the attached image after preparing it for sending
    } else {
      currentMessages.push({ from: "user", text: userMsg });
    }
    
    setInput("");
    setIsLoading(true);

    console.log(`📤 User message to Dialogflow: \"${messageToSendToDialogflow}\"`);

    // Add user message(s) to the UI
    setMessages(msgs => [...msgs, ...currentMessages]);

    try {
      // Send to Dialogflow through our API with current session parameters
      const result = await sendToDialogflow(messageToSendToDialogflow, sessionId, sessionParameters);

      console.log(`📥 Bot reply: "${result.response}"`);
      if (result.parameters) {
        console.log(`📋 Updated parameters:`, result.parameters);
        setSessionParameters(result.parameters); // Update session parameters
      }

      // Add bot response with natural delay
      setTimeout(() => {
        setMessages(msgs => [...msgs, {
          from: "bot",
          text: result.response || "Συγγνώμη, δε μπόρεσα να καταλάβω. Μπορείτε να επαναδιατυπώσετε την ερώτησή σας;"
        }]);
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 0); // Re-focus the input after state update & render
      }, 800);

    } catch (error) {
      console.error('Error sending message:', error);
      setTimeout(() => {
        setMessages(msgs => [...msgs, { 
          from: "bot", 
          text: "Παρουσιάστηκε πρόβλημα σύνδεσης. Παρακαλώ δοκιμάστε ξανά σε λίγο." 
        }]);
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 0); // Re-focus the input after state update & render
      }, 500);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Chat container */}
      <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-lg font-bold">H</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Hellas Direct</h1>
                <p className="text-xs text-gray-500">AI Assistant</p>
              </div>
            </div>
            
            {/* Admin navigation - Settings */}
            <Link href="/admin" className="p-2.5 rounded-xl hover:bg-gray-100 transition-all duration-200 hover:scale-105">
              <Settings className="w-5 h-5 text-gray-600" />
            </Link>
          </div>
        </div>
        
        {/* Message area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'} group ${
                message.from === 'user' ? 'message-user' : 'message-bot'
              }`}
            >
              {message.from === 'bot' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                  <span className="text-white text-sm font-medium">H</span>
                </div>
              )}
              
              <div className="max-w-[75%] space-y-3">
                {/* Text message */}
                {message.text && (
                  <div className={`relative ${
                    message.from === 'user' 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-3xl rounded-br-lg px-5 py-3 shadow-lg' 
                      : 'bg-white text-gray-800 rounded-3xl rounded-bl-lg px-5 py-3 shadow-sm border border-gray-100'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                    
                    {/* Message timestamp */}
                    <div className={`text-xs mt-2 ${
                      message.from === 'user' ? 'text-blue-100' : 'text-gray-400'
                    } opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
                      {new Date().toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )}
                
                {/* Image message */}
                {message.image && (
                  <ImageMessage 
                    image={message.image} 
                    isUser={message.from === 'user'} 
                  />
                )}
              </div>
              
              {message.from === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center ml-3 mt-1 flex-shrink-0">
                  <span className="text-gray-600 text-sm font-medium">You</span>
                </div>
              )}
            </div>
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start group">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                <span className="text-white text-sm font-medium">H</span>
              </div>
              
              <div className="bg-white text-gray-500 rounded-3xl rounded-bl-lg px-5 py-3 shadow-sm border border-gray-100">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <span className="text-xs text-gray-400 ml-2">Typing...</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Auto-scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Debug panel for session parameters */}
        {Object.keys(sessionParameters).length > 0 && (
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-3">
            <details className="group">
              <summary className="cursor-pointer text-sm text-gray-600 font-medium hover:text-gray-800">
                📋 Session Parameters ({Object.keys(sessionParameters).length})
              </summary>
              <div className="mt-2 p-3 bg-white rounded-lg border border-gray-200">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(sessionParameters, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        )}
        
        {/* Input area */}
        <div className="bg-white/80 backdrop-blur-sm border-t border-gray-100 p-6">
          {/* Image preview */}
          {attachedImage && (
            <div className="mb-4 flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="relative">
                <img 
                  src={attachedImage.url} 
                  alt={attachedImage.filename || 'Attached image'} 
                  className="w-12 h-12 object-cover rounded-lg"
                />
                {isAnalyzingImage && (
                  <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {attachedImage.filename || 'Εικόνα'}
                </div>
                <div className="text-xs text-gray-500">
                  {attachedImage.size ? `${(attachedImage.size / 1024).toFixed(1)} KB` : 'Επεξεργασία...'}
                  {attachedImage.analysis && ' • Αναλυμένη'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveImage}
                disabled={isLoading}
                className="p-1.5 rounded-md hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                title="Αφαίρεση εικόνας"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form onSubmit={handleUserMessage} className="flex items-end gap-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef} // Added ref to input element
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Γράψτε το μήνυμά σας..."
                className="w-full p-4 pr-12 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all duration-200 text-sm placeholder-gray-400"
                disabled={isLoading || isAnalyzingImage}
                // autoFocus // Removed autoFocus, will manage focus manually
              />
              
              {input.trim() && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
            
            {/* Image attachment */}
            <ImageAttachment 
              onImageSelect={handleImageAttachment}
              disabled={isLoading}
              isAnalyzing={isAnalyzingImage}
            />
            
            <button
              type="submit"
              disabled={isLoading || (!input.trim() && !attachedImage) || isAnalyzingImage}
              className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
              </svg>
            </button>
          </form>
          
          {/* Enhanced Voice Recorder */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <VoiceRecorder 
              onAudioResult={handleVoiceResult}
              sessionId={sessionId}
              disabled={isLoading || isAnalyzingImage}
              onRecordingStart={() => inputRef.current?.blur()} // Blur input when recording starts
              onRecordingEnd={() => inputRef.current?.focus()} // Focus input when recording ends or text is set
            />
          </div>
        </div>
      </div>
    </div>
  );
}