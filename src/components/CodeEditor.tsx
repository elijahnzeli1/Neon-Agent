import React from 'react';
import dynamic from 'next/dynamic';
import { generateCode } from '@/lib/gemini';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
});


interface CodeEditorProps {

  value: string;

  onChange: (value: string) => void;

  language?: string;

}


// interface CodeEditorProps {
//   value: string;
//   onChange: (value: string) => void;
//   language?: string;
// }

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, language = 'typescript' }) => {
  const handleEditorDidMount = (editor: any, monaco: any) => {
    // Custom completion provider
    monaco.languages.registerCompletionItemProvider(language, {
      provideCompletionItems: async (model: any, position: any) => {
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
  };

  return (
    <MonacoEditor
      height="400px"
      language={language}
      theme="vs-dark"
      value={value}
      onChange={(value) => onChange(value || '')}
      onMount={handleEditorDidMount}
      options={{
        automaticLayout: true,
      }}
    />
  );
};

export default CodeEditor; //npm install @monaco-editor/react