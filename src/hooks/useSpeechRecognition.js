import { useState, useEffect, useRef } from 'react';

export function useSpeechRecognition(onResult) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false; // Stop automatically when user stops speaking
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (e) => {
        console.error('Speech recognition error:', e);
        setIsListening(false);
      };

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript && onResult) {
          onResult(transcript);
        }
      };

      recognitionRef.current = rec;
    }
  }, [onResult]);

  const startListening = () => {
    if (!isSupported || isListening) return;
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
    }
  };

  const stopListening = () => {
    if (!isSupported || !isListening) return;
    try {
      recognitionRef.current.stop();
    } catch (e) {
      console.error('Failed to stop speech recognition:', e);
    }
  };

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
  };
}
