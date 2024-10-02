// src/components/CollaborativeCodeEditor.tsx
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import CodeEditor from './CodeEditor';

interface CollaborativeCodeEditorProps {
  roomId: string;
  value: string;
  onChange: (value: string) => void;
}

const CollaborativeCodeEditor: React.FC<CollaborativeCodeEditorProps> = ({ roomId, value, onChange }) => {
  const socketRef = useRef<any>(null);

  useEffect(() => {
    socketRef.current = io();

    socketRef.current.emit('join-room', roomId);

    socketRef.current.on('code-update', (updatedCode: string) => {
      onChange(updatedCode);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [roomId, onChange]);

  const handleChange = (newValue: string) => {
    onChange(newValue);
    socketRef.current.emit('code-change', { roomId, code: newValue });
  };

  return <CodeEditor value={value} onChange={handleChange} language="typescript" />;
};

export default CollaborativeCodeEditor;