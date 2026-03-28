import { useState, useCallback } from 'react';

export function useSpeech() {
  const [isMuted, setIsMuted] = useState(false);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      if (!prev) {
        window.speechSynthesis.cancel();
      }
      return !prev;
    });
  }, []);

  const speak = useCallback((text: string) => {
    if (isMuted) return;
    
    // Ensure Web Speech API is supported
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // Cancel current speech to prevent queuing nightmare

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 0.7;

    window.speechSynthesis.speak(utterance);
  }, [isMuted]);

  return { speak, isMuted, toggleMute };
}
