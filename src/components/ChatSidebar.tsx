import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/utils';
import { WsEvent } from '../hooks/useWebSocket';

interface ChatSidebarProps {
  messages: WsEvent[];
}

export function ChatSidebar({ messages }: ChatSidebarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewers, setViewers] = useState(1243);

  // Auto-scroll on new message
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  // Simulate viewer fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setViewers(prev => Math.max(0, prev + (Math.floor(Math.random() * 19) - 8)));
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // Map each user to a random pleasing pastel color by hashing their username
  const getUserColor = (username: string) => {
    const charCode = username.charCodeAt(0) + (username.length > 3 ? username.charCodeAt(3) : 0);
    const colors = [
      'text-primary', 
      'text-emerald-400', 
      'text-amber-400', 
      'text-fuchsia-400', 
      'text-blue-400', 
      'text-indigo-400'
    ];
    return colors[charCode % colors.length];
  };

  return (
    <aside className="w-80 flex flex-col bg-surface-container-low rounded-xl py-3 px-3 space-y-3 relative overflow-hidden transition-all duration-700 ease-in-out shadow-sm border border-outline-variant/10">
      
      {/* Stream Info Header */}
      <div className="flex items-center justify-between px-2 pb-2 border-b border-outline-variant/10">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-error animate-pulse shadow-[0_0_8px_rgba(255,80,80,0.8)]" />
          <span className="text-error font-black text-[0.7rem] tracking-widest uppercase shadow-error/20 drop-shadow-sm">LIVE</span>
        </div>
        <div className="flex items-center space-x-1.5 text-error-light font-bold text-sm tracking-wide bg-error/10 px-2.5 py-0.5 rounded-full">
          <span className="text-sm">👁</span>
          <span>{viewers.toLocaleString()} watching</span>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 flex flex-col overflow-y-auto pr-1 custom-scrollbar scroll-smooth [mask-image:linear-gradient(to_bottom,transparent,black_5%,black_100%)]"
      >
        {messages.slice(-30).map((msg) => (
          <div key={msg.id} className="w-full text-left py-0.5 px-2 hover:bg-surface-container/50 transition-colors rounded-lg leading-tight">
            <span className={cn(
              "font-bold mr-2 drop-shadow-sm text-[0.85rem]",
              getUserColor(msg.username)
            )}>
              {msg.username}
            </span>
            <span className="text-[0.9rem] font-medium text-on-surface">
              {msg.message}
            </span>
            {msg.type === 'donation' && (
              <div className="text-[0.7rem] font-black tracking-wider uppercase mt-0.5 text-primary-light">
                💰 Donated {msg.amount} bits!
              </div>
            )}
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-sm font-medium text-on-surface-variant/50 self-center m-auto text-center italic mt-4">
            Waiting for activity...
          </div>
        )}
      </div>
    </aside>
  );
}
