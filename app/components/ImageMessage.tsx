import React, { useState } from 'react';
import { X, Download, Eye } from 'lucide-react';

interface ImageMessageProps {
  image: {
    url: string;
    analysis?: string;
    filename?: string;
    size?: number;
  };
  isUser: boolean;
}

export default function ImageMessage({ image, isUser }: ImageMessageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.filename || 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className={`max-w-sm ${isUser ? 'ml-auto' : 'mr-auto'}`}>
        <div 
          className={`relative rounded-2xl overflow-hidden shadow-lg border-2 cursor-pointer transition-all duration-200 hover:scale-105 ${
            isUser 
              ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100' 
              : 'border-gray-200 bg-white'
          }`}
          onClick={() => setIsModalOpen(true)}
        >
          {/* Image */}
          <div className="relative">
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              </div>
            )}
            <img
              src={image.url}
              alt={image.filename || 'Uploaded image'}
              className={`w-full h-auto max-h-64 object-cover transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              loading="lazy"
            />
            
            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsModalOpen(true);
                  }}
                  className="p-2 bg-white/90 hover:bg-white rounded-full transition-all duration-200"
                  title="Προβολή εικόνας"
                >
                  <Eye className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload();
                  }}
                  className="p-2 bg-white/90 hover:bg-white rounded-full transition-all duration-200"
                  title="Λήψη εικόνας"
                >
                  <Download className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            </div>
          </div>

          {/* Image info */}
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600 truncate">
                {image.filename || 'Εικόνα'}
              </span>
              {image.size && (
                <span className="text-xs text-gray-400">
                  {formatFileSize(image.size)}
                </span>
              )}
            </div>
            
            {/* Analysis preview */}
            {image.analysis && (
              <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 border">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="font-medium">Ανάλυση εικόνας</span>
                </div>
                <p className="line-clamp-3">
                  {image.analysis.length > 100 
                    ? `${image.analysis.substring(0, 100)}...`
                    : image.analysis
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full-screen modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-4xl max-h-full w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {image.filename || 'Εικόνα'}
                </h3>
                {image.size && (
                  <p className="text-sm text-gray-500">
                    {formatFileSize(image.size)}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDownload}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Λήψη εικόνας"
                >
                  <Download className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Κλείσιμο"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Modal content */}
            <div className="flex flex-col lg:flex-row max-h-[80vh]">
              {/* Image */}
              <div className="flex-1 flex items-center justify-center p-4 bg-gray-50">
                <img
                  src={image.url}
                  alt={image.filename || 'Uploaded image'}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
              </div>

              {/* Analysis */}
              {image.analysis && (
                <div className="lg:w-80 p-4 border-l border-gray-200 bg-white overflow-y-auto">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    Ανάλυση Εικόνας
                  </h4>
                  <div className="prose prose-sm text-gray-600">
                    <p className="whitespace-pre-wrap">{image.analysis}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
