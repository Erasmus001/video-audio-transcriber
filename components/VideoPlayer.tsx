import React, { forwardRef } from 'react';

interface MediaPlayerProps {
  src: string;
  type: 'video' | 'audio';
  onTimeUpdate?: (time: number) => void;
}

const VideoPlayer = forwardRef<HTMLMediaElement, MediaPlayerProps>(({ src, type, onTimeUpdate }, ref) => {
  if (type === 'audio') {
    return (
      <div className="rounded-xl overflow-hidden shadow-lg bg-gray-900 p-8 flex flex-col items-center justify-center aspect-video relative">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-500 to-transparent pointer-events-none"></div>
        <span className="material-icons-round text-6xl text-white/80 mb-4 animate-pulse">audiotrack</span>
        <audio
          ref={ref as React.RefObject<HTMLAudioElement>}
          src={src}
          controls
          className="w-full max-w-md"
          onTimeUpdate={(e) => onTimeUpdate && onTimeUpdate(e.currentTarget.currentTime)}
        >
          Your browser does not support the audio element.
        </audio>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden shadow-lg bg-black aspect-video flex items-center justify-center">
      <video 
        ref={ref as React.RefObject<HTMLVideoElement>}
        src={src}
        controls
        className="w-full h-full"
        onTimeUpdate={(e) => onTimeUpdate && onTimeUpdate(e.currentTarget.currentTime)}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
});

VideoPlayer.displayName = "MediaPlayer";

export default VideoPlayer;