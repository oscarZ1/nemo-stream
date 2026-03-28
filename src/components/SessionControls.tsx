import React, { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Play } from 'lucide-react';

interface SessionControlsProps {
  onStart: (task: string, mockMode: boolean) => void;
}

export function SessionControls({ onStart }: SessionControlsProps) {
  const [task, setTask] = useState('');
  const [mockMode, setMockMode] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-4xl px-10 flex flex-col items-center text-center mt-32 relative z-10"
    >
      <div className="mb-16">
        <h1 className="text-[3.5rem] font-extrabold tracking-tight leading-tight">
          Enter Streamer Mode.
        </h1>
        <p className="mt-4 text-on-surface-variant text-lg tracking-[0.02em]">
          Let the audience hold you accountable. Avoid slacking off.
        </p>
      </div>

      <div className="w-full max-w-2xl relative group">
        <input 
          value={task}
          onChange={(e) => setTask(e.target.value)}
          className="w-full h-[5rem] px-12 rounded-full bg-surface-container-lowest border border-outline-variant/20 soft-shadow text-xl text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary/10 transition-all duration-300 text-center font-medium outline-none" 
          placeholder="What are you studying or coding today?" 
          type="text"
        />
        <div className="absolute inset-x-12 bottom-0 h-0.5 bg-primary/5 group-focus-within:bg-primary transition-colors duration-500 rounded-b-full" />
      </div>

      <div className="mt-8 flex items-center justify-center space-x-4 bg-surface-container-low px-6 py-3 rounded-full border border-outline-variant/10 shadow-sm cursor-pointer hover:bg-surface-container transition-colors"
           onClick={() => setMockMode(!mockMode)}>
        <button
          className={cn(
            "w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out relative",
            mockMode ? "bg-primary" : "bg-outline-variant/50"
          )}
        >
          <div 
            className={cn(
              "w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm",
              mockMode ? "translate-x-6" : "translate-x-0"
            )}
          />
        </button>
        <span className="font-semibold text-on-surface text-sm tracking-wide bg-gradient-to-r from-on-surface to-on-surface-variant bg-clip-text">
          Enable Mock Mode (Testing)
        </span>
      </div>

      <div className="mt-16">
        <button 
          onClick={() => task.trim() && onStart(task, mockMode)}
          disabled={!task.trim()}
          className="h-[4rem] px-[3rem] rounded-full bg-gradient-to-br from-primary to-primary-dim text-on-primary font-bold tracking-[0.1em] text-[0.85rem] uppercase flex items-center justify-center space-x-3 hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl shadow-primary/20 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed group"
        >
          <span>Go Live</span>
          <Play size={18} fill="currentColor" className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
}
