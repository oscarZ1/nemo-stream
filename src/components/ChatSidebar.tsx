import React, { useEffect, useRef } from 'react';
import { cn } from '../lib/utils';
import { SessionState, WsEvent } from '../hooks/useWebSocket';

interface ChatSidebarProps {
  messages: WsEvent[];
}

export function ChatSidebar({ messages }: ChatSidebarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

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
    <aside className="w-80 flex flex-col bg-surface-container-low rounded-xl py-6 px-4 space-y-6 relative overflow-hidden transition-all duration-700 ease-in-out shadow-sm border border-outline-variant/10">
      <div className="flex flex-col px-2">
        <h2 className="tracking-[0.02em] text-[1rem] font-bold uppercase transition-colors duration-500 text-on-surface">
          Twitch Chat Simulation
        </h2>
        <p className="text-[0.75rem] font-medium text-on-surface-variant tracking-[0.05em]">
          Monitoring audience reaction...
        </p>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 flex flex-col space-y-1 overflow-y-auto pr-2 custom-scrollbar scroll-smooth [mask-image:linear-gradient(to_bottom,transparent,black_15%,black_100%)]"
      >
        {messages.slice(-20).map((msg) => (
          <div key={msg.id} className="w-full text-left py-1.5 px-2 hover:bg-surface-container/50 transition-colors rounded-lg">
            <span className={cn(
              "font-bold mr-2 drop-shadow-sm",
              getUserColor(msg.username)
            )}>
              {msg.username}
            </span>
            <span className="text-[0.95rem] font-medium leading-relaxed text-on-surface">
              {msg.message}
            </span>
            {msg.type === 'donation' && (
              <div className="text-[0.75rem] font-black tracking-wider uppercase mt-1 text-primary-light">
                💰 Donated {msg.amount} bits!
              </div>
            )}
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-sm font-medium text-on-surface-variant/50 self-center m-auto text-center italic">
            Connecting to chat...
          </div>
        )}
      </div>
    </aside>
  );
}
