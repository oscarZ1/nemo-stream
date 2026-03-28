import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;
const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error('FATAL: GEMINI_API_KEY not set.');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Nemo Stream server running.');
});

// Image generation endpoint
app.post('/api/generate-image', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });
  console.log(`Generating image for: "${prompt}"`);
  try {
    const result = await ai.models.generateImages({
      model: 'imagen-3.0-generate-001',
      prompt,
      config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '1:1' },
    });
    const base64 = result.generatedImages?.[0]?.image?.imageBytes;
    if (!base64) throw new Error('No image returned from Imagen');
    res.json({ imageUrl: `data:image/jpeg;base64,${base64}` });
  } catch (e) {
    console.error('Image generation failed:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Create HTTP server and attach WebSocket
const server = createServer(app);
const wss = new WebSocketServer({ server });

const SYSTEM_PROMPT = `You are a live Twitch chat audience watching someone's computer screen in real time. You react to what you see on their screen like a real streaming audience would. You only respond with valid JSON — no other text, no markdown, no explanation.

Classify the screen as:
- "focus": code editor, terminal, notes, textbook, research papers, documentation, writing
- "slack": YouTube, Netflix, social media, Reddit, games, memes, food delivery, anything non-productive

Generate usernames procedurally using [adjective]_[noun]_[number] format. Assign each username one of these archetypes:
- hype: celebrates focus, uses caps and exclamation marks
- roaster: sarcastic, calls out slacking, uses 💀 and "bro"
- lurker: appears rarely, very short messages, oddly wise
- grinder: competitive, references their own productivity
- whale: occasionally sends donations

Rules:
- Messages must be under 8 words
- Include 2-4 chat events per response
- Only include a donation when something notable happens. Max 1 donation per response.
- imageprompt must describe a meme relevant to what is visible on screen
- Never break character. Only output valid JSON.

Respond with exactly this shape:
{
  "state": "focus",
  "viewerCount": 12,
  "events": [
    {
      "type": "chat",
      "username": "grind_wolf99",
      "archetype": "grinder",
      "message": "bro get back to work",
      "state": "focus"
    }
  ]
}`;

wss.on("connection", async (ws) => {
  console.log("Frontend connected via WebSocket");
  let session = null;
  let active = true;

  try {
    session = await ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      config: {
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
      },
      callbacks: {
        onmessage: (msg) => {
          if (!active) return;
          const parts = msg?.serverContent?.modelTurn?.parts;
          if (parts) {
            for (const part of parts) {
              if (part.text) {
                console.log("Live API response:", part.text);
                try {
                  const cleaned = part.text.replace(/^```json\s*/m, '').replace(/\s*```$/m, '').trim();
                  const parsed = JSON.parse(cleaned);
                  if (parsed.events && Array.isArray(parsed.events)) {
                    parsed.events = parsed.events.map((e) => ({ ...e, state: parsed.state }));
                  }
                  ws.send(JSON.stringify(parsed));
                } catch {
                  console.log("Bad JSON from Live API:", part.text);
                }
              }
            }
          }
        },
        onerror: (err) => {
          console.error("Live API Error:", err);
        },
        onclose: (e) => {
          console.log("Live API connection closed", e);
        }
      }
    });
    console.log("Live API session started");
  } catch (err) {
    console.error("Failed to connect to Live API:", err);
    ws.close();
    return;
  }

  ws.on("message", async (raw) => {
    if (!active || !session) return;
    try {
      const { type, data } = JSON.parse(raw);
      if (type !== "frame") return;
      console.log("Frame received, forwarding to Live API...");

      try {
        console.log("Forwarding frame to Live API via sendClientContent...");
        await session.sendClientContent({
          turns: [{
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: data
                }
              },
              {
                text: 'React to what you see on this screen. Return only valid JSON.'
              }
            ]
          }],
          turnComplete: true
        });
      } catch (err) {
        console.error("sendClientContent Error:", err.message);
      }
    } catch (err) {
      console.error("Error handling frame:", err);
    }
  });

  ws.on("close", () => {
    console.log("Frontend disconnected");
    active = false;
    try { session?.close(); } catch {}
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`WebSocket ready on ws://localhost:${port}`);
});