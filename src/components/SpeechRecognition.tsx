import { useState, useEffect } from 'react';

interface SpeechRecognitionProps {
  onResult: (transcript: string) => void;
}

const SpeechRecognition: React.FC<SpeechRecognitionProps> = ({ onResult }) => {
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join('');

        onResult(transcript);
      };

      if (isListening) {
        recognition.start();
      } else {
        recognition.stop();
      }

      return () => {
        recognition.stop();
      };
    }
  }, [isListening, onResult]);

  return (
    <button onClick={() => setIsListening(!isListening)}>
      {isListening ? 'Stop Listening' : 'Start Listening'}
    </button>
  );
};

export default SpeechRecognition;