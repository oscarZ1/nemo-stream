import { useState, useEffect, useRef, useCallback } from 'react';

export type SessionState = 'focus' | 'slack';

export interface ChatMessage {
  id: string;
  type: 'chat';
  username: string;
  archetype?: string;
  message: string;
  state: SessionState;
}

export interface DonationEvent {
  id: string;
  type: 'donation';
  username: string;
  archetype?: string;
  amount: number;
  message: string;
  imageUrl: string;
  state: SessionState;
}

export type WsEvent = ChatMessage | DonationEvent;

export function useWebSocket(mockMode: boolean, speak: (text: string) => void) {
  const [messages, setMessages] = useState<WsEvent[]>([]);
  const [sessionState, setSessionState] = useState<SessionState>('focus');
  const [isConnected, setIsConnected] = useState(false);
  const [latestDonation, setLatestDonation] = useState<DonationEvent | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const mockIntervalRef = useRef<number | null>(null);
  
  // Keep latest speak fn via ref to avoid reconnecting WS when mute swaps
  const speakRef = useRef(speak);
  useEffect(() => { speakRef.current = speak; }, [speak]);

  // Helper to process text to speech rules
  const processSpeech = useCallback((event: WsEvent) => {
    if (event.type === 'donation') {
      speakRef.current(`${event.username} just donated ${event.amount} bits!`);
      return;
    }
    
    if (event.type === 'chat') {
      if (event.archetype === 'roaster' && event.state === 'slack') {
        if (Math.random() < 0.33) speakRef.current(event.message);
      } else if (event.archetype === 'hype' && event.state === 'focus') {
        if (Math.random() < 0.33) speakRef.current(event.message);
      }
    }
  }, []);

  const injectEvent = useCallback((eventData: any) => {
    const newEvent = { ...eventData, id: crypto.randomUUID() } as WsEvent;
    
    setMessages(prev => [...prev, newEvent].slice(-50));
    
    if (newEvent.state && (newEvent.state === 'focus' || newEvent.state === 'slack')) {
      setSessionState(newEvent.state);
    }
    
    if (newEvent.type === 'donation') {
      setLatestDonation(newEvent as DonationEvent);
    }

    processSpeech(newEvent);
  }, [processSpeech]);

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
            archetype: 'hype',
            quotes: ['LETS GOOO!!!', 'GRIND NEVER STOPS!', 'WAKE UP BRO!', 'WE GOT THIS!!!!!', 'NO BREAKS!!!', 'BRO YOU ARE INSANE'] 
          },
          { 
            name: 'xX_Procrastinator_Xx', 
            archetype: 'roaster',
            quotes: ['bro really?', '💀💀💀', 'i would be sleeping now', 'caught in 4k slacking', 'gg rip focus', 'bro get back to work'] 
          },
          { 
            name: 'quietlurker99', 
            archetype: 'lurker',
            quotes: ['...', 'focus.', 'breathe.', 'time is an illusion.', 'steady.'] 
          },
          { 
            name: 'studygrind2026', 
            archetype: 'grinder',
            quotes: ['finished 3 chapters lol', 'is that all?', 'gonna beat your time', 'studying harder btw', 'ez pz'] 
          },
          { 
            name: 'dono_king_88', 
            archetype: 'whale',
            quotes: ['TAKE MY MONEY', 'focus 10 mins for donos', 'dono incoming...', 'where is the hype?!', '💸💸💸'] 
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
            archetype: char.archetype,
            amount: Math.floor(Math.random() * 5000) + 100,
            message: char.quotes[Math.floor(Math.random() * char.quotes.length)],
            imageUrl: `https://picsum.photos/seed/twitch-${counter}/300/300`,
            state: fakeState,
          };
          
          setMessages(prev => [...prev, fakeDonation].slice(-50));
          setLatestDonation(fakeDonation);
          setSessionState(fakeState);
          processSpeech(fakeDonation);
        } else {
          const fakeChat: ChatMessage = {
            id: `mock-chat-${counter}`,
            type: 'chat',
            username: char.name,
            archetype: char.archetype,
            message: char.quotes[Math.floor(Math.random() * char.quotes.length)],
            state: fakeState,
          };
          
          setMessages(prev => [...prev, fakeChat].slice(-50));
          setSessionState(fakeState);
          processSpeech(fakeChat);
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
        
        if (data.events && Array.isArray(data.events)) {
          data.events.forEach((wsEventRaw: any) => {
            if (wsEventRaw.type === 'chat' || wsEventRaw.type === 'donation') {
              injectEvent(wsEventRaw);
            }
          });
        }
        
        // Also support single object event (from earlier server tests)
        if (data.type === 'chat' || data.type === 'donation') {
          injectEvent(data);
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
    injectEvent,
  };
}
