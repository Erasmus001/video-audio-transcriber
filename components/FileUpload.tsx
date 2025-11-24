import React, { useRef, useState } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onUrlSelect: (url: string) => void;
  isLoading?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, onUrlSelect, isLoading = false }) => {
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('file');
  const [urlInput, setUrlInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
        onFileSelect(file);
      } else {
        alert("Please upload a video or audio file.");
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onFileSelect(file);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onUrlSelect(urlInput.trim());
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Tabs */}
      <div className="flex mb-4 bg-gray-100 p-1 rounded-lg w-fit mx-auto">
        <button
          onClick={() => setActiveTab('file')}
          className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'file' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Upload File
        </button>
        <button
          onClick={() => setActiveTab('url')}
          className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'url' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Video Link
        </button>
      </div>

      {activeTab === 'file' ? (
        <div 
          className={`rounded-3xl border-4 border-dashed transition-all duration-300 ease-in-out cursor-pointer p-12 text-center bg-white
            ${isDragging 
              ? 'border-brand-500 bg-brand-50 shadow-lg scale-[1.02]' 
              : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileInput} 
            accept="video/*,audio/*" 
            className="hidden" 
          />
          
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className={`p-4 rounded-full ${isDragging ? 'bg-brand-100' : 'bg-gray-100'} transition-colors duration-300`}>
              <span className={`material-icons-round text-4xl ${isDragging ? 'text-brand-600' : 'text-gray-400'}`}>
                cloud_upload
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-700">Upload Audio or Video</h3>
              <p className="text-gray-500 mt-2">Drag & drop or click to browse</p>
            </div>
            <div className="text-xs text-gray-400 mt-4 max-w-sm">
              Supported formats: MP4, WEBM, MOV, MP3, WAV, AAC.<br/>
              <span className="text-brand-600 font-medium">Note:</span> Max file size ~50MB recommended.
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-200 p-12 shadow-sm">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="p-4 rounded-full bg-gray-100">
              <span className="material-icons-round text-4xl text-gray-400">link</span>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-700">Import from Link</h3>
              <p className="text-gray-500 mt-2">Enter a direct URL to a video or audio file</p>
            </div>
            
            <form onSubmit={handleUrlSubmit} className="w-full max-w-md">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/video.mp4"
                  className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  required
                  disabled={isLoading}
                />
                <button 
                  type="submit"
                  disabled={isLoading || !urlInput}
                  className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors font-medium"
                >
                  {isLoading ? 'Fetching...' : 'Import'}
                </button>
              </div>
              <p className="text-xs text-amber-600 mt-3 text-center">
                Note: The URL must be directly accessible (CORS enabled).
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;