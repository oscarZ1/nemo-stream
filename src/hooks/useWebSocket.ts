import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';

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

const SYSTEM_PROMPT = `You are a live Twitch chat audience watching someone's computer screen in real time. You react to what you see on their screen like a real streaming audience would. You only respond with valid JSON — no other text, no markdown, no explanation.

Classify the screen as:
- "focus": code editor, terminal, notes, textbook, research papers, documentation, writing
- "slack": YouTube, Netflix, social media, Reddit, games, memes, food delivery, anything non-productive

You have these viewer archetypes. Generate usernames procedurally using [adjective]_[noun]_[number] format (e.g. lazy_panda42, grind_wolf99):
- hype: celebrates focus, uses caps and exclamation marks, gets genuinely upset when streamer slacks
- roaster: sarcastic, calls out slacking immediately, uses 💀 and "bro", short punchy messages
- lurker: appears rarely, very short messages, oddly wise or completely random
- grinder: competitive, references their own productivity, pushes streamer to work harder
- whale: occasionally sends donations, financially invested in streamer's success

Rules:
- Messages must be under 8 words. Punchy. Real Twitch energy.
- Include 2-4 chat events per response
- Only include a donation when something notable happens. Max 1 donation per response.
- The imageprompt for donations must describe a meme relevant to what's specifically visible on screen
- Never break character. Never explain yourself. Only output valid JSON.

Respond with exactly this shape:
{
  "state": "focus" | "slack",
  "viewerCount": <integer starting at 12, increases when focus, decreases when slack>,
  "events": [
    {
      "type": "chat",
      "username": "grind_wolf99",
      "archetype": "grinder",
      "message": "bro I finished 3 chapters already",
      "state": "focus"
    },
    {
      "type": "donation",
      "username": "dono_king_88",
      "archetype": "whale",
      "amount": 200,
      "message": "caught in 4k switching to youtube",
      "imageprompt": "student caught watching youtube instead of studying, distracted, meme format, funny",
      "state": "slack"
    }
  ]
}`;

export function useWebSocket(mockMode: boolean, speak: (text: string) => void) {
  const [messages, setMessages] = useState<WsEvent[]>([]);
  const [sessionState, setSessionState] = useState<SessionState>('focus');
  const [isConnected, setIsConnected] = useState(false);
  const [latestDonation, setLatestDonation] = useState<DonationEvent | null>(null);

  const sessionRef = useRef<any>(null);
  const mockIntervalRef = useRef<number | null>(null);

  const speakRef = useRef(speak);
  useEffect(() => { speakRef.current = speak; }, [speak]);

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

  const handleParsed = useCallback(async (parsed: any) => {
    if (!parsed.events || !Array.isArray(parsed.events)) return;
    const state: SessionState = parsed.state === 'slack' ? 'slack' : 'focus';
    setSessionState(state);

    for (const raw of parsed.events) {
      if (raw.type !== 'chat' && raw.type !== 'donation') continue;
      const event = { ...raw, id: crypto.randomUUID(), state } as WsEvent;

      if (event.type === 'donation' && (raw as any).imageprompt) {
        try {
          const res = await fetch('http://localhost:8080/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: (raw as any).imageprompt }),
          });
          const json = await res.json();
          (event as DonationEvent).imageUrl = json.imageUrl ?? '';
        } catch (e) {
          console.error('Image fetch failed:', e);
        }
        setLatestDonation(event as DonationEvent);
      }

      setMessages(prev => [...prev, event].slice(-50));
      processSpeech(event);
    }
  }, [processSpeech]);

  useEffect(() => {
    if (mockMode) {
      // ... (mock mode logic stays same)
      setIsConnected(true);
      let active = true;
      const fireMockEvent = () => {
        if (!active) return;
        const fakeState: SessionState = Math.random() > 0.5 ? 'slack' : 'focus';
        const characters = [
          { name: 'TurboStudyGoblin', archetype: 'hype', quotes: ['LETS GOOO!!!', 'GRIND NEVER STOPS!'] },
          { name: 'xX_Procrastinator_Xx', archetype: 'roaster', quotes: ['bro really?', '💀💀💀'] },
        ];
        const char = characters[Math.floor(Math.random() * characters.length)];
        const fakeChat: ChatMessage = {
          id: crypto.randomUUID(), type: 'chat', username: char.name, archetype: char.archetype,
          message: char.quotes[Math.floor(Math.random() * char.quotes.length)], state: fakeState,
        };
        setMessages(prev => [...prev, fakeChat].slice(-50));
        setSessionState(fakeState);
        processSpeech(fakeChat);
        mockIntervalRef.current = window.setTimeout(fireMockEvent, 5000);
      };
      fireMockEvent();
      return () => { active = false; if (mockIntervalRef.current) clearTimeout(mockIntervalRef.current); };
    }

    // --- REAL: Connect to YOUR local server relay ---
    const socket = new WebSocket('ws://localhost:8080');
    sessionRef.current = socket;

    socket.onopen = () => {
      console.log('Connected to local Nemo relay');
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        handleParsed(parsed);
      } catch (e) {
        console.error('Failed to parse relay message:', e);
      }
    };

    socket.onclose = () => {
      console.log('Local relay disconnected');
      setIsConnected(false);
    };

    socket.onerror = (err) => {
      console.error('WebSocket error:', err);
    };

    return () => {
      socket.close();
      setIsConnected(false);
    };
  }, [mockMode, handleParsed, processSpeech]);

  const sendFrame = useCallback((base64: string) => {
    if (mockMode || !sessionRef.current || sessionRef.current.readyState !== WebSocket.OPEN) return;
    const b64 = base64.replace(/^data:image\/[a-z]+;base64,/, '');

    // Send to your backend relay
    sessionRef.current.send(JSON.stringify({
      type: 'frame',
      data: b64
    }));
  }, [mockMode]);

  return { isConnected, messages, sessionState, latestDonation, sendFrame };
}