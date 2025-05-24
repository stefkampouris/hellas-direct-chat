// app/components/VoiceRecorder.tsx - Enhanced voice recorder with direct Dialogflow audio support
'use client';

import React, { useState, useRef, useCallback } from 'react';

interface VoiceRecorderProps {
  onAudioResult: (result: { text: string; source: 'speech-recognition' | 'dialogflow-audio' }) => void;
  sessionId: string;
  disabled?: boolean;
}

export default function VoiceRecorder({ onAudioResult, sessionId, disabled }: VoiceRecorderProps) {
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
    };

    recognition.onerror = (event: any) => {
      console.error('❌ Speech Recognition Error:', event.error);
      setIsRecording(false);
      setIsProcessing(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setIsProcessing(false);
    };

    return recognition;
  }, [onAudioResult]);

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
      onAudioResult({ 
        text: `Συγγνώμη, υπήρξε σφάλμα κατά την επεξεργασία του ήχου: ${error.message}`, 
        source: 'dialogflow-audio' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      setIsRecording(true);
      audioChunksRef.current = [];

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
    } catch (error: any) {
      console.error('❌ Failed to start recording:', error);
      setIsRecording(false);
      onAudioResult({ 
        text: `Συγγνώμη, δεν μπόρεσα να ξεκινήσω την ηχογράφηση: ${error.message}`, 
        source: recordingMethod 
      });
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (recordingMethod === 'speech-recognition' && recognitionRef.current) {
      recognitionRef.current.stop();
      console.log('🛑 Stopped Speech Recognition');
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      console.log('🛑 Stopped MediaRecorder');
    }
    setIsRecording(false);
  };

  return (
    <div className="voice-recorder flex flex-col items-center space-y-4">
      {/* Recording Method Selector */}
      <div className="flex space-x-4">
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            value="speech-recognition"
            checked={recordingMethod === 'speech-recognition'}
            onChange={(e) => setRecordingMethod(e.target.value as 'speech-recognition')}
            disabled={isRecording || disabled}
            className="text-blue-600"
          />
          <span className="text-sm">Browser Speech Recognition</span>
        </label>
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            value="dialogflow-audio"
            checked={recordingMethod === 'dialogflow-audio'}
            onChange={(e) => setRecordingMethod(e.target.value as 'dialogflow-audio')}
            disabled={isRecording || disabled}
            className="text-blue-600"
          />
          <span className="text-sm">Dialogflow Audio</span>
        </label>
      </div>

      {/* Recording Button */}
      <button
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onTouchStart={startRecording}
        onTouchEnd={stopRecording}
        disabled={disabled || isProcessing}
        className={`
          px-6 py-3 rounded-full font-medium transition-all duration-200
          ${isRecording 
            ? 'bg-red-500 text-white shadow-lg animate-pulse' 
            : isProcessing
            ? 'bg-yellow-500 text-white'
            : 'bg-blue-500 text-white hover:bg-blue-600'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {isProcessing 
          ? '⏳ Επεξεργασία...' 
          : isRecording 
          ? '🔴 Ηχογράφηση...' 
          : '🎤 Κρατήστε για ομιλία'
        }
      </button>

      {/* Instructions */}
      <div className="text-xs text-gray-600 text-center max-w-xs">
        <p>
          <strong>{recordingMethod === 'speech-recognition' ? 'Browser Recognition:' : 'Dialogflow Audio:'}</strong>
        </p>
        <p>
          {recordingMethod === 'speech-recognition' 
            ? 'Κρατήστε πατημένο το κουμπί και μιλήστε. Η αναγνώριση γίνεται στον browser.'
            : 'Κρατήστε πατημένο το κουμπί και μιλήστε. Ο ήχος στέλνεται στο Dialogflow.'
          }
        </p>
      </div>

      {/* Status Indicator */}
      {(isRecording || isProcessing) && (
        <div className="flex items-center space-x-2 text-sm">
          <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-yellow-500 animate-spin'}`}></div>
          <span>
            {isRecording 
              ? (recordingMethod === 'speech-recognition' ? 'Ακούω...' : 'Ηχογραφώ...')
              : 'Επεξεργάζομαι...'
            }
          </span>
        </div>
      )}
    </div>
  );
}
