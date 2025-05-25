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
  const [recordingMethod, setRecordingMethod] = useState<'speech-recognition' | 'dialogflow-audio'>('speech-recognition');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
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

  // Convert audio blob to base64
  const audioToBase64 = (audioBlob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to convert audio to base64'));
      reader.readAsDataURL(audioBlob);
    });
  };

  // Send audio directly to Dialogflow
  const sendAudioToDialogflow = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);
      console.log('🎤 Sending audio to Dialogflow...');

      const base64Audio = await audioToBase64(audioBlob);
      
      const response = await fetch('/api/audio-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          inputAudio: base64Audio,
          sampleRate: 16000,
          languageCode: 'el'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process audio');
      }

      const result = await response.json();
      console.log('✅ Dialogflow Audio Result:', result);
      
      // Return the Dialogflow response text
      onAudioResult({ text: result.response, source: 'dialogflow-audio' });
    } catch (error: any) {
      console.error('❌ Dialogflow Audio Error:', error);
      // Fallback to speech recognition if Dialogflow fails
      onAudioResult({ text: 'Error processing audio with Dialogflow.', source: 'speech-recognition' });
    } finally {
      setIsRecording(false);
      setIsProcessing(false);
      if (onRecordingEnd) onRecordingEnd();
    }
  };

  // Handle start recording
  const handleStartRecording = async () => {
    if (isRecording || disabled) return;
    setIsRecording(true);
    setIsProcessing(true);
    if (onRecordingStart) onRecordingStart();

    if (recordingMethod === 'speech-recognition') {
      // Use browser speech recognition
      recognitionRef.current = initializeSpeechRecognition();
      if (recognitionRef.current) {
        recognitionRef.current.start();
        console.log('🎤 Started Speech Recognition');
      } else {
        throw new Error('Speech recognition not supported');
      }
    } else {
      // Use MediaRecorder for Dialogflow audio
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        sendAudioToDialogflow(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      console.log('🎤 Started MediaRecorder for Dialogflow');
    }
  };

  // Stop recording
  const handleStopRecording = () => {
    if (!isRecording) return;

    if (recordingMethod === 'speech-recognition') {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    // onRecordingEnd is called by the respective handlers (onresult, onerror, onend, or finally block in sendAudioToDialogflow)
  };

  // Toggle recording method
  return (
    <div className="flex items-center justify-center space-x-4">
      {/* Recording Method Toggle */}
      <div className="flex items-center space-x-3 bg-gray-50 rounded-full p-1">
        <button
          onClick={() => setRecordingMethod('speech-recognition')}
          disabled={disabled || isRecording || isProcessing}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
            recordingMethod === 'speech-recognition'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Browser
        </button>
        <button
          onClick={() => setRecordingMethod('dialogflow-audio')}
          disabled={disabled || isRecording || isProcessing}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
            recordingMethod === 'dialogflow-audio'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          AI Audio
        </button>
      </div>

      {/* Recording Button */}
      <button
        onMouseDown={handleStartRecording}
        onMouseUp={handleStopRecording}
        onTouchStart={handleStartRecording}
        onTouchEnd={handleStopRecording}
        disabled={disabled || isProcessing}
        className={`
          w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg
          ${isRecording 
            ? 'bg-red-500 hover:bg-red-600 animate-pulse scale-110' 
            : isProcessing
            ? 'bg-yellow-500 hover:bg-yellow-600'
            : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 hover:scale-105'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
        `}
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

      {/* Status Text */}
      {(isRecording || isProcessing) && (
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`}></div>
          <span className="text-xs text-gray-600">
            {isRecording 
              ? 'Ακούω...'
              : 'Επεξεργάζομαι...'
            }
          </span>
        </div>
      )}
    </div>
  );
}
