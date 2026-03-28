import { useState, useEffect, useRef, useCallback } from 'react';

// Module-level cache to completely defeat React 18 Strict Mode double-invocations
let globalPromise: Promise<MediaStream> | null = null;

export function useScreenCapture() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [latestFrame, setLatestFrame] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  
  const stateRef = useRef({ capturing: false, stream: null as MediaStream | null });
  const killedRef = useRef(false);

  useEffect(() => {
    videoRef.current = document.createElement('video');
    videoRef.current.autoplay = true;
    videoRef.current.muted = true;
    videoRef.current.playsInline = true;
    canvasRef.current = document.createElement('canvas');
    killedRef.current = false;

    return () => {
      killedRef.current = true;
      if (stateRef.current.stream) {
        stateRef.current.stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (video.videoWidth && video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setLatestFrame(canvas.toDataURL('image/jpeg', 0.8));
      }
    }
  }, []);

  const stopCapture = useCallback(() => {
    killedRef.current = true;
    if (stateRef.current.stream) {
      stateRef.current.stream.getTracks().forEach((track) => track.stop());
      stateRef.current.stream = null;
    }
    stateRef.current.capturing = false;
    // VERY IMPORTANT: We DO NOT reset globalPromise here. 
    // If the prompt is pending, we let startCapture() resolve it and discard it cleanly asynchronously.
    
    setStream(null);
    setIsCapturing(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startCapture = useCallback(async () => {
    // If strict mode double-invokes, we return the same promise to prevent two dialogs!
    if (globalPromise) return globalPromise;
    if (stateRef.current.capturing) return;

    killedRef.current = false;
    stateRef.current.capturing = true;

    try {
      const promise = navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      globalPromise = promise;
      
      const mediaStream = await promise;
      globalPromise = null; // Always reset immediately after resolution

      // If user clicked stop/unmounted BEFORE they accepted the prompt:
      if (killedRef.current) {
        mediaStream.getTracks().forEach(t => t.stop());
        stateRef.current.capturing = false;
        return null; // silently discard
      }

      if (stateRef.current.stream) {
        stateRef.current.stream.getTracks().forEach(t => t.stop());
      }
      
      stateRef.current.stream = mediaStream;
      setStream(mediaStream);
      setIsCapturing(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(e => console.warn('Autoplay prevented:', e));
      }

      mediaStream.getVideoTracks()[0].onended = () => {
        stopCapture();
      };

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = window.setInterval(captureFrame, 15_000);
      
      setTimeout(captureFrame, 500);
      return mediaStream;
      
    } catch (err) {
      console.error('Failed to start screen capture:', err);
      stateRef.current.capturing = false; 
      globalPromise = null;
      setIsCapturing(false);
      return null;
    }
  }, [captureFrame, stopCapture]);

  return {
    stream,
    latestFrame,
    isCapturing,
    startCapture,
    stopCapture,
  };
}
