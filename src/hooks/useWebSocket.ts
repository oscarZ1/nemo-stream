import { useState, useEffect, useRef, useCallback } from 'react';

export type SessionState = 'focus' | 'slack';

export interface ChatMessage {
  id: string;
  type: 'chat';
  username: string;
  message: string;
  state: SessionState;
}

export interface DonationEvent {
  id: string;
  type: 'donation';
  username: string;
  amount: number;
  message: string;
  imageUrl: string;
  state: SessionState;
}

export type WsEvent = ChatMessage | DonationEvent;

export function useWebSocket(mockMode: boolean) {
  const [messages, setMessages] = useState<WsEvent[]>([]);
  const [sessionState, setSessionState] = useState<SessionState>('focus');
  const [isConnected, setIsConnected] = useState(false);
  const [latestDonation, setLatestDonation] = useState<DonationEvent | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const mockIntervalRef = useRef<number | null>(null);

  // Connection logic
  useEffect(() => {
    if (mockMode) {
      setIsConnected(true);
      
      let counter = 0;
      let active = true;
      
      const fireMockEvent = () => {
        if (!active) return;
        
        counter++;
        const isSlack = Math.random() > 0.5;
        const fakeState: SessionState = isSlack ? 'slack' : 'focus';
        
        const characters = [
          { 
            name: 'TurboStudyGoblin', 
            quotes: ['LETS GOOO!!!', 'GRIND NEVER STOPS!', 'WAKE UP BRO!', 'WE GOT THIS!!!!!', 'NO BREAKS!!!', 'BRO YOU ARE INSANE LETS GOOO'] 
          },
          { 
            name: 'xX_Procrastinator_Xx', 
            quotes: ['bro really?', '💀💀💀', 'i would have slept by now', 'caught in 4k slacking', 'gg rip focus', 'bro get back to work'] 
          },
          { 
            name: 'quietlurker99', 
            quotes: ['...', 'focus.', 'breathe.', 'time is an illusion.', 'steady.'] 
          },
          { 
            name: 'studygrind2026', 
            quotes: ['i just finished 3 chapters lol', 'is that all you got?', 'gonna beat your time', 'im studying harder btw', 'ez pz'] 
          },
          { 
            name: 'dono_king_88', 
            quotes: ['TAKE MY MONEY', 'if u focus for 10 more mins im dropping a 100', 'dono incoming...', 'where is the hype train?!', '💸💸💸'] 
          }
        ];

        // Pick a random named character
        const char = characters[Math.floor(Math.random() * characters.length)];

        // Randomly decide if it's a chat or a donation
        // Make donations much rarer since it fires every few seconds now (5% chance)
        if (Math.random() > 0.95 && char.name === 'dono_king_88') {
          const fakeDonation: DonationEvent = {
            id: `mock-don-${counter}`,
            type: 'donation',
            username: char.name,
            amount: Math.floor(Math.random() * 5000) + 100,
            message: char.quotes[Math.floor(Math.random() * char.quotes.length)],
            imageUrl: `https://picsum.photos/seed/twitch-${counter}/300/300`,
            state: fakeState,
          };
          
          setMessages(prev => [...prev, fakeDonation].slice(-50));
          setLatestDonation(fakeDonation);
          setSessionState(fakeState);
        } else {
          const fakeChat: ChatMessage = {
            id: `mock-chat-${counter}`,
            type: 'chat',
            username: char.name,
            message: char.quotes[Math.floor(Math.random() * char.quotes.length)],
            state: fakeState,
          };
          
          setMessages(prev => [...prev, fakeChat].slice(-50));
          setSessionState(fakeState);
        }

        // Fire again between 3000ms and 8000ms
        const nextDelay = Math.random() * 5000 + 3000;
        mockIntervalRef.current = window.setTimeout(fireMockEvent, nextDelay);
      };

      // Start the mock event chain
      fireMockEvent();

      return () => {
        active = false;
        if (mockIntervalRef.current) {
          clearTimeout(mockIntervalRef.current);
          mockIntervalRef.current = null;
        }
        setIsConnected(false);
      };
    }

    // Real WebSocket logic
    const ws = new WebSocket('ws://localhost:3000');
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    
    ws.onclose = () => setIsConnected(false);
    
    ws.onerror = (err) => console.error('WebSocket error:', err);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Ensure it's not our outgoing frame echo
        if (data.type === 'chat' || data.type === 'donation') {
          const newEvent = { ...data, id: crypto.randomUUID() } as WsEvent;
          
          setMessages(prev => [...prev, newEvent].slice(-50));
          
          if (newEvent.state && (newEvent.state === 'focus' || newEvent.state === 'slack')) {
            setSessionState(newEvent.state);
          }
          
          if (newEvent.type === 'donation') {
            setLatestDonation(newEvent as DonationEvent);
          }
        }
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
      setIsConnected(false);
    };
  }, [mockMode]);

  const sendFrame = useCallback((base64: string) => {
    if (mockMode) return; // Completely drop if mock mode
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'frame', data: base64 }));
    }
  }, [mockMode]);

  return {
    isConnected,
    messages,
    sessionState,
    latestDonation,
    sendFrame,
  };
}
