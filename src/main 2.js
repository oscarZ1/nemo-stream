import 'dotenv/config';
import express from "express"; 
import { GoogleGenAI } from '@google/genai';

console.log(process.env); 

const app = express(); 
const port = 3000; 
const apiKey = process.env.GEMINI_API_KEY; 

if (!apiKey) {
    console.error("FATAL ERROR: GEMINI_API_KEY is missing from the environment!");
    process.exit(1); 
}

app.use(express.json({limit: '15mb'})); 

const ai = new GoogleGenAI({apiKey: apiKey});

app.post('/api/stream-state', async (req, res) => {
  try {
    const { imageBase64, currentTask } = req.body;

    const base64Data = imageBase64.replace(/^data:image\/(png|jpeg);base64,/, "");

    // Simplified prompt since we will enforce JSON output via the config below
    const prompt = `You are a chaotic, highly critical Twitch chat audience watching a streamer's screen. 
    The streamer is supposed to be working on: ${currentTask || 'studying'}. 
    Look at this screenshot of their screen. Are they locked in on their work, or are they distracted? 
    Return a JSON object in this exact format: 
    {
      "status": "focused" or "distracted", 
      "chat": ["short chat message 1", "short chat message 2", "short chat message 3"]
    }`;

    // 2. Call the model directly from the client's models service
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', // Using 2.5-flash as the standard for the new SDK
        contents: [
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: "image/png" // adjust if your frontend sends jpeg
                }
            }
        ],
        config: {
            // Natively forces clean JSON output
            responseMimeType: "application/json",
        }
    });
    
    // 3. In the new SDK, response.text is a property, NOT a function like response.text()
    const chatData = JSON.parse(response.text);
    
    res.json(chatData);

  } catch (error) {
        console.error("Gemini API Error:", error);
        res.status(500).json({ error: 'Failed to analyze stream' });
  }
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});