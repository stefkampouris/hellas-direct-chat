// app/components/TextToSpeech.tsx - Text-to-Speech component for bot messages
'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Pause, Play } from 'lucide-react';

interface TextToSpeechProps {
  text: string;
  autoPlay?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  className?: string;
}

export default function TextToSpeech({
  text,
  autoPlay = false,
  onStart,
  onEnd,
  onError,
  disabled = false,
  className = ''
}: TextToSpeechProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);

  // Check for speech synthesis support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
        // Load available voices
      const loadVoices = () => {
        const availableVoices = speechSynthesis.getVoices();
        setVoices(availableVoices);
        
        // Debug: Log all available voices
        console.log('🎤 Available voices:', availableVoices.map(voice => ({
          name: voice.name,
          lang: voice.lang,
          gender: voice.name.toLowerCase().includes('female') || 
                  voice.name.toLowerCase().includes('woman') || 
                  /\b(f|female|maria|anna|elena|sophia|siri|samantha)\b/i.test(voice.name) ? 'Female' : 
                  voice.name.toLowerCase().includes('male') || 
                  voice.name.toLowerCase().includes('man') ? 'Male' : 'Unknown'
        })));
      };

      // Load voices immediately and on voiceschanged event
      loadVoices();
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);
  // Find the best female Greek voice or fallback to default
  const getBestVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (voices.length === 0) return null;

    // Filter Greek voices
    const greekVoices = voices.filter(voice => 
      voice.lang.startsWith('el') || 
      voice.lang.startsWith('gr') ||
      voice.name.toLowerCase().includes('greek')
    );

    // Try to find a female Greek voice first
    const femaleGreekVoice = greekVoices.find(voice => 
      voice.name.toLowerCase().includes('female') ||
      voice.name.toLowerCase().includes('woman') ||
      voice.name.toLowerCase().includes('maria') ||
      voice.name.toLowerCase().includes('anna') ||
      voice.name.toLowerCase().includes('elena') ||
      voice.name.toLowerCase().includes('sophia') ||
      // Common female voice indicators
      /\b(f|female|woman|lady|girl)\b/i.test(voice.name)
    );
    
    if (femaleGreekVoice) return femaleGreekVoice;

    // If no female Greek voice, try any Greek voice
    if (greekVoices.length > 0) return greekVoices[0];

    // Fallback: try to find any female voice in any language
    const femaleVoice = voices.find(voice => 
      voice.name.toLowerCase().includes('female') ||
      voice.name.toLowerCase().includes('woman') ||
      voice.name.toLowerCase().includes('maria') ||
      voice.name.toLowerCase().includes('anna') ||
      voice.name.toLowerCase().includes('elena') ||
      voice.name.toLowerCase().includes('sophia') ||
      voice.name.toLowerCase().includes('siri') ||
      voice.name.toLowerCase().includes('samantha') ||
      /\b(f|female|woman|lady|girl)\b/i.test(voice.name)
    );

    if (femaleVoice) return femaleVoice;

    // Final fallback to any available voice
    return voices[0] || null;
  }, [voices]);

  // Create and configure speech utterance
  const createUtterance = useCallback((textToSpeak: string): SpeechSynthesisUtterance => {
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
    // Configure utterance
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
      // Set voice if available
    const selectedVoice = getBestVoice();
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
      console.log('🎭 Selected voice:', {
        name: selectedVoice.name,
        lang: selectedVoice.lang,
        localService: selectedVoice.localService
      });
    } else {
      utterance.lang = 'el-GR'; // Greek language
      console.log('🎭 No specific voice found, using default with Greek language');
    }

    // Event handlers
    utterance.onstart = () => {
      console.log('🔊 TTS started:', textToSpeak.substring(0, 50) + '...');
      setIsPlaying(true);
      if (onStart) onStart();
    };

    utterance.onend = () => {
      console.log('🔇 TTS ended');
      setIsPlaying(false);
      utteranceRef.current = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = (event) => {
      console.error('❌ TTS error:', event.error);
      setIsPlaying(false);
      utteranceRef.current = null;
      if (onError) {
        onError(new Error(`Speech synthesis error: ${event.error}`));
      }
    };

    utterance.onpause = () => {
      setIsPlaying(false);
    };

    utterance.onresume = () => {
      setIsPlaying(true);
    };

    return utterance;
  }, [getBestVoice, onStart, onEnd, onError]);

  // Start speech synthesis
  const speak = useCallback(() => {
    if (!isSupported || disabled || !text.trim()) return;

    // Stop any currently playing speech
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }

    try {
      const utterance = createUtterance(text);
      utteranceRef.current = utterance;
      speechSynthesis.speak(utterance);
      setHasPlayedOnce(true);
    } catch (error) {
      console.error('❌ Failed to start speech synthesis:', error);
      if (onError) {
        onError(error as Error);
      }
    }
  }, [isSupported, disabled, text, createUtterance, onError]);

  // Stop speech synthesis
  const stop = useCallback(() => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    setIsPlaying(false);
    utteranceRef.current = null;
  }, []);

  // Pause/Resume speech synthesis
  const togglePause = useCallback(() => {
    if (!speechSynthesis.speaking) return;

    if (speechSynthesis.paused) {
      speechSynthesis.resume();
    } else {
      speechSynthesis.pause();
    }
  }, []);

  // Auto play when component mounts (if enabled)
  useEffect(() => {
    if (autoPlay && isSupported && !hasPlayedOnce && text.trim()) {
      // Small delay to ensure voices are loaded
      const timer = setTimeout(() => {
        speak();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [autoPlay, isSupported, hasPlayedOnce, text, speak]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  // Don't render if speech synthesis is not supported
  if (!isSupported) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {/* Play/Stop Button */}
      <button
        onClick={isPlaying ? stop : speak}
        disabled={disabled || !text.trim()}
        className={`
          p-1.5 rounded-md transition-all duration-200 hover:bg-gray-100 
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110'}
          ${isPlaying ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}
        `}
        title={isPlaying ? 'Σταμάτημα αναπαραγωγής' : 'Αναπαραγωγή με φωνή'}
      >
        {isPlaying ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </button>

      {/* Pause/Resume Button (only show when playing) */}
      {isPlaying && speechSynthesis.speaking && (
        <button
          onClick={togglePause}
          disabled={disabled}
          className={`
            p-1.5 rounded-md transition-all duration-200 hover:bg-gray-100
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110'}
            text-gray-500 hover:text-gray-700
          `}
          title={speechSynthesis.paused ? 'Συνέχεια' : 'Παύση'}
        >
          {speechSynthesis.paused ? (
            <Play className="w-4 h-4" />
          ) : (
            <Pause className="w-4 h-4" />
          )}
        </button>
      )}

      {/* Playing indicator */}
      {isPlaying && (
        <div className="flex items-center space-x-1">
          <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-blue-600 font-medium">Playing</span>
        </div>
      )}
    </div>
  );
}
