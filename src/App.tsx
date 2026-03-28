/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Music,
  Volume2,
  VolumeX,
  StopCircle,
  PauseCircle,
  ScreenShare,
} from 'lucide-react';
import { cn } from './lib/utils';
import { SessionControls } from './components/SessionControls';
import { ChatSidebar } from './components/ChatSidebar';
import { DonationAlert } from './components/DonationAlert';
import { useScreenCapture } from './hooks/useScreenCapture';
import { useWebSocket } from './hooks/useWebSocket';
import { useSpeech } from './hooks/useSpeech';
import { useLiveAPI } from './hooks/useLiveAPI';

// --- Types ---

type AppState = 'home' | 'session';

// --- Components ---

const Header = ({ state, isMuted, toggleMute }: { state: AppState; isMuted: boolean; toggleMute: () => void }) => (
  <header className="fixed top-0 left-0 w-full flex justify-between items-center px-14 py-8 z-50">
    <div className="flex items-center space-x-4">
      <div className="text-lg font-bold tracking-[0.2em] text-on-surface uppercase">
        Nemo Stream
      </div>
      {state === 'session' && (
        <>
          <div className="h-4 w-px bg-outline-variant opacity-25" />
          <span className="tracking-[0.05em] uppercase text-[0.75rem] font-bold text-primary">
            Live Streamer Mode
          </span>
        </>
      )}
    </div>
    <div className="flex items-center space-x-6">
      {state === 'session' && (
        <div className="flex items-center space-x-2 bg-surface-container-low px-4 py-2 rounded-full mr-2">
          <div className="w-2 h-2 rounded-full bg-error animate-pulse" />
          <span className="text-[0.75rem] font-bold tracking-[0.08em] uppercase text-error-light">Live Recording</span>
        </div>
      )}
      <button
        onClick={toggleMute}
        className={cn(
          "transition-colors active:scale-90 p-2 rounded-full",
          isMuted ? "text-error bg-error/10" : "text-primary bg-primary/10 hover:bg-primary/20"
        )}
      >
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>
      <button className="text-on-surface-variant hover:opacity-80 transition-opacity cursor-pointer">
        <User size={24} />
      </button>
    </div>
  </header>
);

const Footer = ({ state, onEnd }: { state: AppState; onEnd: () => void }) => (
  <footer className={cn(
    "fixed bottom-10 left-1/2 -translate-x-1/2 rounded-full px-8 py-4 glass soft-shadow flex items-center z-50 transition-all duration-700 ease-in-out",
    state === 'home'
      ? "opacity-0 translate-y-8 pointer-events-none"
      : "opacity-100 translate-y-0 space-x-10 min-w-[600px] justify-between"
  )}>
    {state === 'session' && (
      <div className="flex items-center space-x-4 flex-1">
        <div className="w-10 h-10 rounded-lg bg-surface-container overflow-hidden flex-shrink-0">
          <img
            src="https://picsum.photos/seed/nemo-music/100/100"
            alt="Album Art"
            className="w-full h-full object-cover grayscale"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-[0.65rem] font-bold tracking-[0.08em] text-on-surface-variant uppercase leading-none mb-1">Now Playing</span>
          <span className="text-[0.85rem] font-bold truncate text-on-surface">Ambient Rain & Low-Fi Beats</span>
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
          End Stream
        </button>
      </div>
    )}
  </footer>
);

const SessionScreen = ({ task, mockMode, speak, stream, latestFrame, stopCapture }: { task: string; mockMode: boolean; speak: (text: string) => void; key?: string; stream: MediaStream | null; latestFrame: string | null; stopCapture: () => void; }) => {
  const { isConnected, messages, sessionState, latestDonation, sendFrame, injectEvent } = useWebSocket(mockMode, speak);
  const { connect, sendFrame: sendLiveFrame, disconnect } = useLiveAPI((data) => {
    if (data.events && Array.isArray(data.events)) {
      data.events.forEach((event: any) => {
        injectEvent(event);
      });
    }
  });
  const handleSendFrame = useCallback((frame: string) => {
    if (mockMode) {
      sendFrame(frame);
    } else {
      sendLiveFrame(frame);
    }
  }, [mockMode, sendFrame, sendLiveFrame]);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!mockMode) connect();
    return () => {
      stopCapture();
      if (!mockMode) disconnect();
    };
  }, []);

  useEffect(() => {
    if (latestFrame) {
      handleSendFrame(latestFrame);
    }
  }, [latestFrame, handleSendFrame]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const isSlack = sessionState === 'slack';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-1 px-14 pb-32 gap-8 w-full h-[calc(100vh-100px)] mt-24"
    >
      <DonationAlert latestDonation={latestDonation} />

      {/* Main Window */}
      <section className={cn(
        "flex-1 relative bg-surface-container-highest rounded-xl overflow-hidden soft-shadow transition-all duration-700",
        isSlack && "border-2 border-error/50 shadow-2xl shadow-error/20"
      )}>
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            className="w-full h-full object-cover grayscale opacity-40 mix-blend-multiply"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-on-surface-variant italic">
            Waiting for screen capture...
          </div>
        )}

        <div className="absolute inset-x-0 top-0 p-8 flex justify-between pointer-events-none">
          <div>
            <div className="bg-surface-container-lowest/80 backdrop-blur-xl px-6 py-3 rounded-full inline-flex items-center space-x-3">
              <ScreenShare className={cn(isSlack ? "text-error" : "text-primary")} size={20} />
              <span className="font-semibold text-on-surface tracking-tight">Main Window: Screen Capture</span>
            </div>
            {!isConnected && !mockMode && (
              <div className="mt-4 bg-error/90 backdrop-blur-xl px-6 py-2 rounded-full inline-flex items-center">
                <span className="text-error-light font-bold text-sm tracking-wide">WebSocket Disconnected - Cannot reach server</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* AI Sidebar */}
      <ChatSidebar messages={messages} />
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [state, setState] = useState<AppState>('home');
  const [task, setTask] = useState('');
  const [mockMode, setMockMode] = useState(false);
  const { speak, isMuted, toggleMute } = useSpeech();
  
  // Hoisted screen capture hook, shared between Controls and Screen
  const { stream, latestFrame, isCapturing, startCapture, stopCapture } = useScreenCapture();

  useEffect(() => {
    console.log('StreamerMode focus app mounted');
  }, []);

  const handleStart = (t: string, isMock: boolean) => {
    setTask(t);
    setMockMode(isMock);
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

      <Header state={state} isMuted={isMuted} toggleMute={toggleMute} />

      <main className="flex-1 w-full flex items-center justify-center relative z-auto h-full">
        <AnimatePresence mode="wait">
          {state === 'home' ? (
            <SessionControls key="home" onStart={handleStart} startCapture={startCapture} />
          ) : (
            <SessionScreen key="session" task={task} mockMode={mockMode} speak={speak} stream={stream} latestFrame={latestFrame} stopCapture={stopCapture} />
          )}
        </AnimatePresence>
      </main>

      <Footer state={state} onEnd={handleEnd} />
    </div>
  );
}
