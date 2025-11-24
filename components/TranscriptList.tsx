import React, { useState, useEffect, useRef } from 'react';
import { TranscriptSegment, ExportFormat } from '../types';
import { generateExportContent } from '../services/geminiService';

interface TranscriptListProps {
  transcript: TranscriptSegment[];
  onSeek: (seconds: number) => void;
  currentTime?: number;
}

const TranscriptList: React.FC<TranscriptListProps> = ({ transcript, onSeek, currentTime = 0 }) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Find active segment index
  const activeIndex = transcript.findIndex((item, index) => {
    const nextItem = transcript[index + 1];
    return currentTime >= item.seconds && (!nextItem || currentTime < nextItem.seconds);
  });

  // Auto-scroll to active segment (with locking check)
  useEffect(() => {
    if (isAutoScrollEnabled && activeIndex !== -1 && itemRefs.current[activeIndex] && containerRef.current) {
      const element = itemRefs.current[activeIndex];
      const container = containerRef.current;

      if (element) {
        const containerTop = container.scrollTop;
        const containerHeight = container.clientHeight;
        const elementTop = element.offsetTop;
        const elementHeight = element.clientHeight;

        // Determine if the element is outside the visible area of the container
        const isAbove = elementTop < containerTop;
        const isBelow = (elementTop + elementHeight) > (containerTop + containerHeight);

        if (isAbove || isBelow) {
             // Calculate center position relative to the container
             // We subtract the container's offsetTop (which is 0 in this relative context mostly)
             // but here we just want to scroll the container to the element's position
             const scrollTo = element.offsetTop - container.clientHeight / 2 + element.clientHeight / 2;
             
             container.scrollTo({
               top: scrollTo,
               behavior: 'smooth'
             });
        }
      }
    }
  }, [activeIndex, isAutoScrollEnabled]);

  const handleDownload = (format: ExportFormat) => {
    const content = generateExportContent(transcript, format);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center z-10 shrink-0">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <span className="material-icons-round text-brand-500">description</span>
          Transcript
        </h3>
        
        <div className="flex items-center gap-2">
          <button 
             onClick={() => setIsAutoScrollEnabled(!isAutoScrollEnabled)}
             className={`p-1.5 rounded-md transition-colors ${isAutoScrollEnabled ? 'text-brand-600 bg-brand-50' : 'text-gray-400 hover:text-gray-600'}`}
             title={isAutoScrollEnabled ? "Auto-scroll ON" : "Auto-scroll OFF"}
          >
             <span className="material-icons-round text-lg">
               {isAutoScrollEnabled ? 'lock' : 'lock_open'}
             </span>
          </button>

          <span className="text-xs font-medium text-gray-400 bg-white px-2 py-1 rounded-md border border-gray-200">
            {transcript.length} segments
          </span>
          
          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 rounded-md text-gray-500 transition-colors text-sm font-medium"
              title="Export Transcript"
            >
              <span className="material-icons-round text-lg">download</span>
              Export
            </button>
            
            {showExportMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowExportMenu(false)}
                ></div>
                <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
                  <button 
                    onClick={() => handleDownload('txt')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span className="font-mono text-xs text-gray-400">TXT</span> Text
                  </button>
                  <button 
                    onClick={() => handleDownload('json')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span className="font-mono text-xs text-gray-400">JSON</span> JSON
                  </button>
                  <button 
                    onClick={() => handleDownload('srt')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span className="font-mono text-xs text-gray-400">SRT</span> Subs
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto custom-scrollbar p-0 relative scroll-smooth"
      >
        {transcript.length === 0 ? (
           <div className="p-8 text-center text-gray-400">No transcript available.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {transcript.map((item, index) => (
              <button
                key={index}
                ref={el => { itemRefs.current[index] = el; }}
                onClick={() => onSeek(item.seconds)}
                className={`w-full text-left p-4 transition-all duration-300 ease-in-out flex gap-4 items-start group 
                  ${index === activeIndex 
                    ? 'bg-brand-50 border-l-4 border-brand-500 pl-3 shadow-inner' 
                    : 'hover:bg-gray-50 border-l-4 border-transparent'}`}
              >
                <span className={`shrink-0 text-xs font-mono font-medium px-2 py-1 rounded transition-colors duration-300
                  ${index === activeIndex 
                    ? 'text-brand-700 bg-brand-100' 
                    : 'text-brand-600 bg-gray-50 group-hover:bg-gray-100'}`}>
                  {item.timestamp}
                </span>
                <p className={`text-sm leading-relaxed transition-colors duration-300 ${index === activeIndex ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                  {item.text}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TranscriptList;