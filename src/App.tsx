/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Music, 
  Volume2, 
  StopCircle, 
  PauseCircle, 
  ScreenShare, 
  AudioLines,
  Circle
} from 'lucide-react';
import { cn } from './lib/utils';

// --- Types ---

type AppState = 'home' | 'session';

interface Message {
  id: string;
  text: string;
  type: 'ai' | 'system';
  label?: string;
}

// --- Components ---

const Header = ({ state }: { state: AppState }) => (
  <header className="fixed top-0 left-0 w-full flex justify-between items-center px-14 py-8 z-50">
    <div className="flex items-center space-x-4">
      <div className="text-lg font-bold tracking-[0.2em] text-on-surface uppercase">
        Zenith
      </div>
      {state === 'session' && (
        <>
          <div className="h-4 w-px bg-outline-variant opacity-25" />
          <span className="tracking-[0.05em] uppercase text-[0.75rem] font-bold text-primary">
            Live Focus Session
          </span>
        </>
      )}
    </div>
    <div className="flex items-center space-x-6">
      {state === 'session' && (
        <div className="flex items-center space-x-2 bg-surface-container-low px-4 py-2 rounded-full">
          <div className="w-2 h-2 rounded-full bg-error animate-pulse" />
          <span className="text-[0.75rem] font-bold tracking-[0.08em] uppercase">Rec 02:45:12</span>
        </div>
      )}
      <button className="text-on-surface-variant hover:opacity-80 transition-opacity cursor-pointer">
        <User size={24} />
      </button>
    </div>
  </header>
);

const Footer = ({ state, task, onEnd }: { state: AppState; task: string; onEnd: () => void }) => (
  <footer className={cn(
    "fixed bottom-10 left-1/2 -translate-x-1/2 rounded-full px-8 py-4 glass soft-shadow flex items-center z-50 transition-all duration-500",
    state === 'home' ? "space-x-10 min-w-[300px] justify-center" : "space-x-10 min-w-[600px] justify-between"
  )}>
    {state === 'session' && (
      <div className="flex items-center space-x-4 flex-1">
        <div className="w-10 h-10 rounded-lg bg-surface-container overflow-hidden flex-shrink-0">
          <img 
            src="https://picsum.photos/seed/zenith-music/100/100" 
            alt="Album Art" 
            className="w-full h-full object-cover grayscale"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-[0.65rem] font-bold tracking-[0.08em] text-on-surface-variant uppercase leading-none mb-1">Now Playing</span>
          <span className="text-[0.85rem] font-bold truncate">Ambient Rain & Low-Fi Beats</span>
        </div>
      </div>
    )}

    <div className={cn(
      "flex items-center space-x-8",
      state === 'session' && "border-l border-r border-outline-variant/10 px-8"
    )}>
      <button className="text-on-surface-variant hover:text-primary transition-colors active:scale-90">
        <Music size={20} />
      </button>
      <button className="text-on-surface-variant hover:text-primary transition-colors active:scale-90">
        <Volume2 size={20} />
      </button>
      <button className="text-on-surface-variant hover:text-primary transition-colors active:scale-90">
        {state === 'home' ? <StopCircle size={20} /> : <PauseCircle size={20} />}
      </button>
    </div>

    {state === 'session' && (
      <div className="flex-1 flex justify-end">
        <button 
          onClick={onEnd}
          className="bg-error text-on-primary h-10 px-6 rounded-full text-[0.75rem] font-bold tracking-[0.08em] uppercase hover:opacity-90 active:scale-95 transition-all"
        >
          End Session
        </button>
      </div>
    )}
  </footer>
);

const HomeScreen = ({ onStart }: { onStart: (task: string) => void; key?: string }) => {
  const [task, setTask] = useState('');

  return (
    <motion.div 
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-4xl px-10 flex flex-col items-center text-center"
    >
      <div className="mb-16">
        <h1 className="text-[3.5rem] font-extrabold tracking-tight leading-tight">
          Define your focus.
        </h1>
        <p className="mt-4 text-on-surface-variant text-lg tracking-[0.02em]">
          Intent is the first step toward peak performance.
        </p>
      </div>

      <div className="w-full relative group">
        <input 
          value={task}
          onChange={(e) => setTask(e.target.value)}
          className="w-full h-[5rem] px-12 rounded-full bg-surface-container-lowest border-none soft-shadow text-xl text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary/10 transition-all duration-300 text-center font-medium outline-none" 
          placeholder="What are you working on?" 
          type="text"
        />
        <div className="absolute inset-x-12 bottom-0 h-0.5 bg-primary/5 group-focus-within:bg-primary transition-colors duration-500" />
      </div>

      <div className="mt-20">
        <button 
          onClick={() => task.trim() && onStart(task)}
          disabled={!task.trim()}
          className="h-[3.5rem] px-[2.75rem] rounded-full bg-gradient-to-br from-primary to-primary-dim text-on-primary font-bold tracking-[0.08em] text-[0.75rem] uppercase flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:scale-100"
        >
          Start Session
        </button>
      </div>
    </motion.div>
  );
};

const SessionScreen = ({ task }: { task: string; key?: string }) => {
  const messages: Message[] = [
    { id: '1', text: 'Looking steady. Keep going.', type: 'system' },
    { id: '2', text: "You've been hovering over that tab for 30s. Focus!", type: 'ai', label: 'Booing' },
    { id: '3', text: 'Silence maintained. Excellent work.', type: 'ai', label: 'Quiet' },
  ];

  return (
    <motion.div 
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-1 px-14 pb-32 gap-8 w-full h-full"
    >
      {/* Main Window */}
      <section className="flex-1 relative bg-surface-container-highest rounded-[3rem] overflow-hidden soft-shadow">
        <img 
          src="https://picsum.photos/seed/workspace/1200/800" 
          alt="Workspace" 
          className="w-full h-full object-cover grayscale opacity-40 mix-blend-multiply"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 p-12 flex flex-col justify-between pointer-events-none">
          <div>
            <div className="bg-surface-container-lowest/80 backdrop-blur-xl px-6 py-3 rounded-full inline-flex items-center space-x-3">
              <ScreenShare className="text-primary" size={20} />
              <span className="font-semibold text-on-surface tracking-tight">Main Window: VS Code + Figma</span>
            </div>
          </div>

          <div className="flex flex-col items-start">
            <h2 className="text-[3.5rem] font-bold tracking-[-0.02em] leading-none">
              Deep Focus
            </h2>
            <p className="text-[1rem] font-medium tracking-[0.02em] text-on-surface-variant mt-2">
              Next break in 14:22
            </p>
          </div>
        </div>
      </section>

      {/* AI Sidebar */}
      <aside className="w-80 flex flex-col bg-surface-container-low rounded-[3rem] py-10 px-6 space-y-8 relative overflow-hidden">
        <div className="flex flex-col">
          <h2 className="tracking-[0.02em] text-[1rem] font-bold uppercase">AI Focus Guardian</h2>
          <p className="text-[0.75rem] font-medium text-on-surface-variant tracking-[0.05em]">Monitoring distractibility...</p>
        </div>

        <div className="flex-1 flex flex-col justify-end space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className="flex flex-col space-y-2">
              <div className={cn(
                "px-5 py-3 rounded-full self-start text-[0.875rem] font-medium transition-all",
                msg.type === 'system' ? "bg-surface-container text-on-surface-variant opacity-40" : "bg-surface-container-lowest soft-shadow border border-outline-variant/10 text-on-surface",
                msg.label === 'Quiet' && "bg-primary/5 border-primary/20 text-primary"
              )}>
                {msg.text}
              </div>
              {msg.label && (
                <span className={cn(
                  "text-[0.65rem] font-bold tracking-widest uppercase ml-4",
                  msg.label === 'Quiet' ? "text-primary/60" : "text-primary"
                )}>
                  {msg.label}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-center pt-8 border-t border-outline-variant/10">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-dim p-[2px] animate-pulse">
            <div className="w-full h-full rounded-full bg-surface-container-low flex items-center justify-center">
              <AudioLines className="text-primary" size={24} />
            </div>
          </div>
        </div>
      </aside>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [state, setState] = useState<AppState>('home');
  const [task, setTask] = useState('');

  useEffect(() => {
    console.log('Zenith Focus App Mounted');
  }, []);

  const handleStart = (t: string) => {
    setTask(t);
    setState('session');
  };

  const handleEnd = () => {
    setState('home');
    setTask('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface overflow-hidden relative">
      {/* Background Decoration */}
      <div className="fixed inset-0 -z-10 flex items-center justify-center opacity-30 pointer-events-none">
        <div className="w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-primary/10 to-transparent blur-[120px]" />
      </div>

      <Header state={state} />

      <main className="flex-1 w-full flex items-center justify-center pt-24 relative">
        <AnimatePresence mode="wait">
          {state === 'home' ? (
            <HomeScreen key="home" onStart={handleStart} />
          ) : (
            <SessionScreen key="session" task={task} />
          )}
        </AnimatePresence>
      </main>

      <Footer state={state} task={task} onEnd={handleEnd} />
    </div>
  );
}
