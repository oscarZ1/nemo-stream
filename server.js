import { GoogleGenAI, Modality } from "@google/genai";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });
const wss = new WebSocketServer({ port: 3000 });

const SYSTEM_PROMPT = `[paste system-prompt.txt contents here]`;

wss.on("connection", async (ws) => {
    console.log("Frontend connected");

    const session = await ai.live.connect({
        model: "gemini-2.0-flash-live-001",
        config: {
            responseModalities: [Modality.TEXT],
            systemInstruction: SYSTEM_PROMPT,
        },
    });

    console.log("Live API connected");

    ws.on("message", async (raw) => {
        try {
            const { type, data } = JSON.parse(raw);
            if (type !== "frame") return;

            await session.sendMessage({
                message: {
                    parts: [
                        { inlineData: { mimeType: "image/jpeg", data } },
                        { text: "React to what you see. Return only valid JSON." }
                    ],
                },
            });

            for await (const response of session) {
                const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!text) continue;
                try {
                    const parsed = JSON.parse(text);
                    // Add state to each event
                    parsed.events = parsed.events?.map((e: any) => ({
                        ...e,
                        state: parsed.state
                    }));
                    ws.send(JSON.stringify(parsed));
                } catch {
                    console.log("Bad JSON from Live API:", text);
                }
                break;
            }
        } catch (err) {
            console.error("Error:", err);
        }
    });

    ws.on("close", () => {
        session.close();
        console.log("Session closed");
    });
});

console.log("Backend running on ws://localhost:3000");