import { GoogleGenAI, Modality } from "@google/genai";
import { useRef, useCallback } from "react";

const SYSTEM_PROMPT = `[paste your system-prompt.txt contents here]`;

export function useLiveAPI(onEvent: (data: any) => void) {
    const sessionRef = useRef<any>(null);

    const connect = useCallback(async () => {
        const ai = new GoogleGenAI({
            apiKey: import.meta.env.VITE_GEMINI_API_KEY
        });

        sessionRef.current = await ai.live.connect({
            model: "gemini-3.1-flash-live-preview",
            config: {
                responseModalities: [Modality.TEXT],
                systemInstruction: SYSTEM_PROMPT,
            },
        });

        console.log("Live API connected");
    }, []);

    const sendFrame = useCallback(async (base64Frame: string) => {
        if (!sessionRef.current) return;

        await sessionRef.current.sendMessage({
            message: {
                parts: [
                    {
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: base64Frame,
                        },
                    },
                    {
                        text: "React to what you see. Return only valid JSON."
                    }
                ],
            },
        });

        for await (const response of sessionRef.current) {
            const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) continue;
            try {
                const parsed = JSON.parse(text);
                onEvent(parsed);
            } catch (e) {
                console.log("Bad JSON:", text);
            }
            break;
        }
    }, [onEvent]);

    const disconnect = useCallback(() => {
        sessionRef.current?.close();
        sessionRef.current = null;
    }, []);

    return { connect, sendFrame, disconnect };
}