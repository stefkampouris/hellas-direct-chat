// app/components/VoiceRecorder.tsx - Enhanced voice recorder with direct Dialogflow audio support
'use client';

import React, { useState, useRef, useCallback } from 'react';

interface VoiceRecorderProps {
  onAudioResult: (result: { text: string; source: 'speech-recognition' | 'dialogflow-audio' }) => void;
  sessionId: string;
  disabled?: boolean;
  onRecordingStart?: () => void;
  onRecordingEnd?: () => void;
}

export default function VoiceRecorder({ onAudioResult, sessionId, disabled, onRecordingStart, onRecordingEnd }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition for browser-based voice recognition
  const initializeSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'el-GR'; // Greek language
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log('🗣️ Speech Recognition Result:', transcript);
      onAudioResult({ text: transcript, source: 'speech-recognition' });
      setIsRecording(false);
      setIsProcessing(false);
      if (onRecordingEnd) onRecordingEnd();
    };

    recognition.onerror = (event: any) => {
      console.error('❌ Speech Recognition Error:', event.error);
      setIsRecording(false);
      setIsProcessing(false);
      if (onRecordingEnd) onRecordingEnd();
    };

    recognition.onend = () => {
      setIsRecording(false);
      setIsProcessing(false);
      if (onRecordingEnd) onRecordingEnd();
    };

    return recognition;
  }, [onAudioResult, onRecordingEnd]);

  // Handle start recording
  const handleStartRecording = async () => {
    if (isRecording || disabled) return;
    setIsRecording(true);
    setIsProcessing(true);
    if (onRecordingStart) onRecordingStart();

    // Use browser speech recognition
    recognitionRef.current = initializeSpeechRecognition();
    if (recognitionRef.current) {
      recognitionRef.current.start();
      console.log('🎤 Started Speech Recognition');
    } else {
      throw new Error('Speech recognition not supported');
    }
  };

  // Stop recording
  const handleStopRecording = () => {
    if (!isRecording) return;
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    // onRecordingEnd is called by the respective handlers
  };

  return (
    <button
      onMouseDown={handleStartRecording}
      onMouseUp={handleStopRecording}
      onTouchStart={handleStartRecording}
      onTouchEnd={handleStopRecording}
      disabled={disabled || isProcessing}
      className={`
        p-4 rounded-xl flex items-center justify-center transition-all duration-200 shadow-md
        ${isRecording 
          ? 'bg-red-500 hover:bg-red-600 animate-pulse scale-105' 
          : isProcessing
          ? 'bg-yellow-500 hover:bg-yellow-600'
          : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 hover:scale-105'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
      `}
      title="Ηχογράφηση μηνύματος"
    >
      {isProcessing ? (
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      ) : isRecording ? (
        <div className="w-4 h-4 bg-white rounded-sm"></div>
      ) : (
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
}
