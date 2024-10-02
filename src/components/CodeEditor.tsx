// src/components/CodeEditor.tsx
import React, { useRef, useEffect } from 'react';
import * as monaco from 'monaco-editor';
import { generateCode } from '../lib/gemini';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, language = 'typescript' }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (editorRef.current) {
      monacoRef.current = monaco.editor.create(editorRef.current, {
        value,
        language,
        theme: 'vs-dark',
        automaticLayout: true,
      });

      monacoRef.current.onDidChangeModelContent(() => {
        onChange(monacoRef.current?.getValue() || '');
      });

      // Custom completion provider
      monaco.languages.registerCompletionItemProvider(language, {
        provideCompletionItems: async (model, position) => {
          const wordUntilPosition = model.getWordUntilPosition(position);
          const word = wordUntilPosition.word;

          if (word.length < 2) return { suggestions: [] };

          const lineContent = model.getLineContent(position.lineNumber);
          const prompt = `Complete the following code: ${lineContent}`;

          try {
            const completion = await generateCode(prompt);
            return {
              suggestions: [
                {
                  label: completion,
                  kind: monaco.languages.CompletionItemKind.Snippet,
                  insertText: completion,
                  range: {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: wordUntilPosition.startColumn,
                    endColumn: wordUntilPosition.endColumn,
                  },
                },
              ],
            };
          } catch (error) {
            console.error('Error generating completion:', error);
            return { suggestions: [] };
          }
        },
      });
    }

    return () => monacoRef.current?.dispose();
  }, [value, onChange, language]);

  return <div ref={editorRef} style={{ height: '400px' }} />;
};

export default CodeEditor;