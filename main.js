import 'dotenv/config';
import express from "express"; 
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express(); 
const port = 3000; 
const apiKey = process.env.API_KEY; 

app.use(express.json({limit: '15mb'})); 

const genAI = new GoogleGenerativeAI(apiKey);

app.post('/api/stream-state', async (req, res) => {
  try {
    const { imageBase64, currentTask } = req.body;

    // 1. Strip the meta prefix from the base64 string if the frontend sends it
    const base64Data = imageBase64.replace(/^data:image\/(png|jpeg);base64,/, "");

    // 2. Initialize the model (Flash is significantly faster for live hackathon demos)
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

    // 3. The Dynamic Prompt
    // We inject 'currentTask' so the AI knows exactly what you are supposed to be doing.
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

}   catch (error) {
        console.error("Gemini API Error:", error);
        res.status(500).json({ error: 'Failed to analyze stream' });
  }
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
})

