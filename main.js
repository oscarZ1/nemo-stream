import 'dotenv/config';
import express from "express"; 
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileURLToPath } from 'url'; 
import path from 'path'; // <--- ADD THIS LINE

const app = express(); 
const port = 3000; 
const apiKey = process.env.API_KEY; 

const __filename = fileURLToPath(import.meta.url); 
const __dirname = path.dirname(__filename); 

app.use(express.json({limit: '15mb'})); 

// This ensures your CSS/JS files inside the 'public' folder are accessible
app.use(express.static(path.join(__dirname, 'public'))); 

const genAI = new GoogleGenerativeAI(apiKey);

app.get("/", (req, res) => {
    // This looks for public/music.html
    res.sendFile(path.join(__dirname, 'public', 'music.html'));
});
// ─── EXISTING: Screen analysis endpoint ──────────────────────────────────────
app.post('/api/stream-state', async (req, res) => {
  try {
    const { imageBase64, currentTask } = req.body;

    // 1. Strip the meta prefix from the base64 string if the frontend sends it
    const base64Data = imageBase64.replace(/^data:image\/(png|jpeg);base64,/, "");

    // 2. Initialize the model (Flash is significantly faster for live hackathon demos)
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

    // 3. The Dynamic Prompt
    const prompt = `You are a chaotic, highly critical Twitch chat audience watching a streamer's screen. 
    The streamer is supposed to be working on: ${currentTask || 'studying'}. 
    Look at this screenshot of their screen. Are they locked in on their work, or are they distracted? 
    Return ONLY a valid JSON object in this exact format, with no markdown formatting: 
    {
      "status": "focused" or "distracted", 
      "chat": ["short chat message 1", "short chat message 2", "short chat message 3"]
    }`;

    const imageParts = [
      {
        inlineData: {
          data: base64Data,
          mimeType: "image/png"
        }
      }
    ];

    // 4. Call Gemini
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();
    
    // 5. Clean and parse the response to ensure it's valid JSON for your React app
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const chatData = JSON.parse(cleanJson);
    
    res.json(chatData);

  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: 'Failed to analyze stream' });
  }
});

// ─── NEW: Session music generation via Lyria 3 ───────────────────────────────
//
// POST /api/generate-music
// Body: { sessionName: "study session" }
// Returns: { audioBase64: "...", mimeType: "audio/wav", lyrics: "..." }
//
app.post('/api/generate-music', async (req, res) => {
  try {
    const { sessionName } = req.body;

    if (!sessionName) {
      return res.status(400).json({ error: 'sessionName is required' });
    }

    console.log(`🎵 Generating Lyria music for session: "${sessionName}"`);

    // Build a rich, session-aware music prompt
    const musicPrompt = buildMusicPrompt(sessionName);

    // Use Lyria 3 Clip — generates a high-quality 30-second track
    const model = genAI.getGenerativeModel({ model: "lyria-3-clip-preview" });

    const result = await model.generateContent({
      contents: [
        {
          parts: [{ text: musicPrompt }]
        }
      ],
      generationConfig: {
        responseModalities: ["AUDIO", "TEXT"]
      }
    });

    const response = await result.response;
    const parts = response.candidates?.[0]?.content?.parts ?? [];

    // Extract audio and any generated lyrics/text
    let audioBase64 = null;
    let mimeType = "audio/wav";
    let lyrics = "";

    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith("audio/")) {
        audioBase64 = part.inlineData.data;
        mimeType = part.inlineData.mimeType;
      } else if (part.text) {
        lyrics = part.text;
      }
    }

    if (!audioBase64) {
      throw new Error("No audio data returned from Lyria API");
    }

    console.log(`✅ Music generated! MIME: ${mimeType}, lyrics: ${lyrics ? 'yes' : 'none'}`);

    res.json({
      audioBase64,
      mimeType,
      lyrics,
      prompt: musicPrompt
    });

  } catch (error) {
    console.error("Lyria Music Error:", error);
    res.status(500).json({ 
      error: 'Failed to generate music',
      details: error.message 
    });
  }
});

// ─── Helper: Map session names to rich Lyria prompts ─────────────────────────
function buildMusicPrompt(sessionName) {
  const name = sessionName.toLowerCase();

  // Detect session type and craft a targeted music prompt
  if (name.includes('study') || name.includes('homework') || name.includes('exam') || name.includes('revision')) {
    return `Create a calm, focused lo-fi study track with soft piano, warm vinyl crackle, and gentle background ambience. 
    Tempo: 75 BPM. Mood: peaceful, concentrated, slightly nostalgic. 
    No lyrics. Perfect for deep focus and studying. Smooth Rhodes piano with light jazz brushed drums.`;
  }

  if (name.includes('cod') || name.includes('hack') || name.includes('program') || name.includes('dev') || name.includes('debug')) {
    return `Create an energetic synthwave coding track with driving 808 beats, punchy bass synths, and arpeggiating chords. 
    Tempo: 120 BPM. Mood: intense focus, cyberpunk, electric. 
    No lyrics. Dark neon aesthetic, perfect for grinding through code at midnight.`;
  }

  if (name.includes('design') || name.includes('art') || name.includes('creat') || name.includes('draw')) {
    return `Create a dreamy, inspirational ambient track with flowing synth pads, airy textures, and a subtle melodic motif. 
    Tempo: 90 BPM. Mood: creative, flowing, ethereal. 
    No lyrics. Perfect for visual creative work and design sprints.`;
  }

  if (name.includes('workout') || name.includes('gym') || name.includes('run') || name.includes('exercise') || name.includes('train')) {
    return `Create a high-energy workout banger with driving 909 drums, heavy bass, and hype synth leads. 
    Tempo: 140 BPM. Mood: pumped, aggressive, unstoppable. 
    High BPM electronic with trap hi-hats and distorted bass drops. Pure gym energy.`;
  }

  if (name.includes('read') || name.includes('essay') || name.includes('writ')) {
    return `Create a soft acoustic background track with fingerpicked guitar, light piano, and gentle strings. 
    Tempo: 65 BPM. Mood: warm, thoughtful, literary. 
    No lyrics. Cozy coffee shop vibes, perfect for reading and writing.`;
  }

  if (name.includes('deep work') || name.includes('focus') || name.includes('concentrate') || name.includes('grind')) {
    return `Create a minimal, hypnotic focus track with steady minimal techno pulse, sparse pads, and subtle white noise. 
    Tempo: 105 BPM. Mood: laser focus, flow state, deep concentration. 
    No lyrics. Binaural-friendly, zero distraction, pure productivity.`;
  }

  if (name.includes('chill') || name.includes('relax') || name.includes('break') || name.includes('rest')) {
    return `Create a relaxing chillhop track with a jazzy guitar loop, mellow beats, and soft synth pads. 
    Tempo: 80 BPM. Mood: relaxed, comfortable, warm. 
    No lyrics. Perfect for unwinding and taking a mental break.`;
  }

  if (name.includes('meeting') || name.includes('call') || name.includes('present')) {
    return `Create a light, professional background track with subtle piano and soft orchestral strings. 
    Tempo: 85 BPM. Mood: confident, warm, professional. 
    No lyrics. Understated and non-distracting.`;
  }

  // Default: generic focus music tailored to whatever the session name is
  return `Create a focused, immersive background music track perfectly themed for a "${sessionName}" session. 
  Choose appropriate tempo, instruments, and mood based on the session name. 
  Make it engaging but non-distracting. High quality instrumental composition, 
  suitable for maintaining concentration and flow state.`;
}

// ─────────────────────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`🚀 Server is listening on port ${port}`);
  console.log(`   • POST /api/stream-state   — Gemini screen analysis`);
  console.log(`   • POST /api/generate-music — Lyria 3 music generation`);
});