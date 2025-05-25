import React, { useRef, useState } from 'react';
import { Paperclip, Image, X, Upload } from 'lucide-react';

interface ImageAttachmentProps {
  onImageSelect: (file: File) => void;
  disabled?: boolean;
  isAnalyzing?: boolean;
}

export default function ImageAttachment({ onImageSelect, disabled, isAnalyzing }: ImageAttachmentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Παρακαλώ επιλέξτε μόνο αρχεία εικόνας');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Το αρχείο είναι πολύ μεγάλο. Μέγιστο μέγεθος: 10MB');
      return;
    }

    onImageSelect(file);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleFileSelect(imageFile);
    } else {
      alert('Παρακαλώ επιλέξτε ένα αρχείο εικόνας');
    }
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      
      {/* Drop zone overlay */}
      {dragOver && (
        <div 
          className="fixed inset-0 bg-blue-500/20 backdrop-blur-sm z-50 flex items-center justify-center"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="bg-white rounded-2xl p-8 shadow-2xl border-2 border-dashed border-blue-500 max-w-md text-center">
            <Upload className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Αφήστε την εικόνα εδώ
            </h3>
            <p className="text-gray-600 text-sm">
              Υποστηρίζονται JPG, PNG, GIF (μέχρι 10MB)
            </p>
          </div>
        </div>
      )}

      {/* Attachment button */}
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled || isAnalyzing}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-3 rounded-xl transition-all duration-200 flex items-center gap-2 ${
          disabled || isAnalyzing
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 hover:scale-105'
        }`}
        title="Επισύναψη εικόνας"
      >
        {isAnalyzing ? (
          <>
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs hidden sm:inline">Ανάλυση...</span>
          </>
        ) : (
          <>
            <Image className="w-4 h-4" />
            <span className="text-xs hidden sm:inline">Εικόνα</span>
          </>
        )}
      </button>
    </div>
  );
}
