
import React from 'react';
import { PlayIcon, PauseIcon, StopIcon, RestartIcon, PreviousFrameIcon, NextFrameIcon, GoToStartIcon, GoToEndIcon } from './icons/EditorIcons';

interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onRestart: () => void;
  onPreviousFrame: () => void;
  onNextFrame: () => void;
  onGoToStart: () => void;
  onGoToEnd: () => void;
  currentTime: number;
  duration: number;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  onPlayPause,
  onStop,
  onRestart,
  onPreviousFrame,
  onNextFrame,
  onGoToStart,
  onGoToEnd,
  currentTime,
  duration
}) => {
  const buttonClass = "p-2.5 glass-button !rounded-lg flex items-center justify-center";
  const primaryButtonClass = `p-2.5 glass-button !rounded-lg flex items-center justify-center w-24`;


  return (
    <div className="flex items-center justify-center space-x-1.5 p-1 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border-color)] shadow-lg backdrop-blur-sm">
      <button onClick={onGoToStart} className={buttonClass} title="Go to Start (0s)" disabled={currentTime === 0}>
        <GoToStartIcon size={20} />
      </button>
      <button onClick={onPreviousFrame} className={buttonClass} title="Previous Frame" disabled={currentTime === 0}>
        <PreviousFrameIcon size={20} />
      </button>
      
      <button 
        onClick={onPlayPause} 
        className={`${primaryButtonClass} ${isPlaying ? '!bg-[rgba(var(--accent-rgb),0.2)] !text-accent-color !border-accent-color' : '!bg-[rgba(var(--accent-rgb),0.1)] hover:!bg-[rgba(var(--accent-rgb),0.2)] !text-accent-color'}`} 
        title={isPlaying ? "Pause" : "Play"}
        aria-live="polite"
      >
        {isPlaying ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
        <span className="ml-1.5 text-sm">{isPlaying ? "Pause" : "Play"}</span>
      </button>

      <button onClick={onStop} className={buttonClass} title="Stop (Go to 0s & Pause)" disabled={currentTime === 0 && !isPlaying}>
        <StopIcon size={20} />
      </button>
      <button onClick={onRestart} className={`${buttonClass} !text-text-primary hover:!text-accent-color hover:!border-accent-color`} title="Restart (Go to 0s & Play)">
        <RestartIcon size={20} />
      </button>

      <button onClick={onNextFrame} className={buttonClass} title="Next Frame" disabled={currentTime >= duration}>
        <NextFrameIcon size={20} />
      </button>
      <button onClick={onGoToEnd} className={buttonClass} title={`Go to End (${duration.toFixed(2)}s)`} disabled={currentTime >= duration}>
        <GoToEndIcon size={20} />
      </button>
    </div>
  );
};

export default PlaybackControls;