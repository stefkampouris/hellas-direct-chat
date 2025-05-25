// app/components/StreamingVoiceRecorder.tsx - Enhanced voice recorder with streaming support
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface StreamingVoiceRecorderProps {
  onPartialResult?: (result: { text: string; isPartial: boolean; confidence?: number }) => void;
  onFinalResult?: (result: { text: string; response?: string; intent?: string; confidence?: number }) => void;
  sessionId: string;
  disabled?: boolean;
  onRecordingStart?: () => void;
  onRecordingEnd?: () => void;
  enablePartialResponse?: boolean;
}

export default function StreamingVoiceRecorder({
  onPartialResult,
  onFinalResult,
  sessionId,
  disabled,
  onRecordingStart,
  onRecordingEnd,
  enablePartialResponse = true
}: StreamingVoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [streamingMethod, setStreamingMethod] = useState<'native-stream' | 'chunked-audio'>('native-stream');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API for comparison/fallback
  const initializeSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'el-GR';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Handle partial results
      if (interimTranscript && enablePartialResponse) {
        setPartialText(interimTranscript);
        if (onPartialResult) {
          onPartialResult({
            text: interimTranscript,
            isPartial: true,
            confidence: event.results[event.resultIndex]?.[0]?.confidence
          });
        }
      }

      // Handle final results
      if (finalTranscript) {
        console.log('🎤 Final transcript:', finalTranscript);
        if (onFinalResult) {
          onFinalResult({
            text: finalTranscript,
            confidence: event.results[event.resultIndex]?.[0]?.confidence
          });
        }
        setPartialText('');
        handleStopRecording();
      }
    };

    recognition.onerror = (event: any) => {
      console.error('❌ Speech recognition error:', event.error);
      setIsRecording(false);
      setIsProcessing(false);
      if (onRecordingEnd) onRecordingEnd();
    };

    recognition.onend = () => {
      console.log('🔇 Speech recognition ended');
      setIsRecording(false);
      setIsProcessing(false);
      if (onRecordingEnd) onRecordingEnd();
    };

    return recognition;
  }, [enablePartialResponse, onPartialResult, onFinalResult, onRecordingEnd]);

  // Initialize streaming audio processing
  const initializeStreamingAudio = useCallback(async () => {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      audioStreamRef.current = stream;

      // Create audio context for processing
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      
      // Load audio worklet for real-time processing (if supported)
      try {
        await audioContextRef.current.audioWorklet.addModule('/audio-processor.js');
        
        workletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'audio-processor');
        
        // Handle processed audio chunks
        workletNodeRef.current.port.onmessage = (event) => {
          const audioData = event.data;
          // Send audio data to streaming endpoint
          processAudioChunk(audioData);
        };

        // Connect audio stream to worklet
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(workletNodeRef.current);
        
      } catch (workletError) {
        console.warn('⚠️ AudioWorklet not supported, falling back to MediaRecorder');
        // Fallback to MediaRecorder chunked approach
        initializeMediaRecorderStreaming(stream);
      }

    } catch (error) {
      console.error('❌ Failed to initialize streaming audio:', error);
      throw error;
    }
  }, []);

  // Initialize MediaRecorder for chunked streaming
  const initializeMediaRecorderStreaming = useCallback((stream: MediaStream) => {
    mediaRecorderRef.current = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        // Convert blob to array buffer and process
        event.data.arrayBuffer().then(buffer => {
          const audioData = new Uint8Array(buffer);
          processAudioChunk(audioData);
        });
      }
    };

    // Start recording with small time slices for streaming
    mediaRecorderRef.current.start(100); // 100ms chunks
  }, []);

  // Process audio chunk and send to Dialogflow streaming
  const processAudioChunk = useCallback(async (audioData: Uint8Array) => {
    try {
      // Convert to base64 for transmission
      const base64Audio = btoa(String.fromCharCode(...audioData));
      
      // Send to streaming endpoint
      const response = await fetch('/api/stream-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          audioChunk: base64Audio,
          enablePartialResponse,
          isFirstChunk: false,
          isLastChunk: false
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Handle partial results
        if (result.isPartial && result.transcript) {
          setPartialText(result.transcript);
          if (onPartialResult) {
            onPartialResult({
              text: result.transcript,
              isPartial: true,
              confidence: result.confidence
            });
          }
        }
        
        // Handle final results
        if (!result.isPartial && result.response) {
          if (onFinalResult) {
            onFinalResult({
              text: result.transcript || '',
              response: result.response,
              intent: result.intent,
              confidence: result.confidence
            });
          }
          setPartialText('');
        }
      }
    } catch (error) {
      console.error('❌ Error processing audio chunk:', error);
    }
  }, [sessionId, enablePartialResponse, onPartialResult, onFinalResult]);

  // Start recording
  const handleStartRecording = async () => {
    if (isRecording || disabled) return;
    
    setIsRecording(true);
    setIsProcessing(true);
    setPartialText('');
    
    if (onRecordingStart) onRecordingStart();

    try {
      if (streamingMethod === 'native-stream') {
        await initializeStreamingAudio();
      } else {
        // Fallback to speech recognition
        recognitionRef.current = initializeSpeechRecognition();
        if (recognitionRef.current) {
          recognitionRef.current.start();
        } else {
          throw new Error('Speech recognition not supported');
        }
      }
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      setIsRecording(false);
      setIsProcessing(false);
      if (onRecordingEnd) onRecordingEnd();
    }
  };

  // Stop recording
  const handleStopRecording = () => {
    if (!isRecording) return;

    setIsRecording(false);
    setIsProcessing(false);

    // Clean up streaming resources
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    if (onRecordingEnd) onRecordingEnd();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleStopRecording();
    };
  }, []);

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Streaming Method Toggle */}
      <div className="flex items-center space-x-3 bg-gray-50 rounded-full p-1">
        <button
          onClick={() => setStreamingMethod('native-stream')}
          disabled={disabled || isRecording}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
            streamingMethod === 'native-stream'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Streaming
        </button>
        <button
          onClick={() => setStreamingMethod('chunked-audio')}
          disabled={disabled || isRecording}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
            streamingMethod === 'chunked-audio'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Browser
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
          w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg
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
          <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : isRecording ? (
          <div className="w-6 h-6 bg-white rounded-sm"></div>
        ) : (
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {/* Status and Partial Text Display */}
      <div className="text-center min-h-[2rem]">
        {(isRecording || isProcessing) && (
          <div className="flex flex-col items-center space-y-2">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`}></div>
              <span className="text-xs text-gray-600">
                {isRecording 
                  ? streamingMethod === 'native-stream' ? 'Streaming audio...' : 'Ακούω...'
                  : 'Επεξεργάζομαι...'
                }
              </span>
            </div>
            
            {/* Display partial text */}
            {partialText && enablePartialResponse && (
              <div className="text-sm text-gray-700 italic max-w-md text-center bg-gray-50 px-3 py-1 rounded-lg">
                "{partialText}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          {streamingMethod === 'native-stream' 
            ? 'Κρατήστε πατημένο για streaming audio'
            : 'Κρατήστε πατημένο για voice recognition'
          }
        </p>
      </div>
    </div>
  );
}
