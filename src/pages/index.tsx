import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Layout from '../components/layout';
import CodeEditor from '../components/CodeEditor';
import CollaborativeCodeEditor from '../components/CollaborativeCodeEditor';
import SpeechRecognition from '../components/SpeechRecognition';
import FeedbackForm from '../components/FeedbackForm';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function Home() {
  const { data: session } = useSession();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: 'generate' | 'analyze') => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, content: input }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      setOutput(data.result);

      // Save snippet if user is authenticated
      if (session) {
        await fetch('/api/snippets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: input, language: 'typescript' }),
        });
      }
    } catch (error) {
      console.error(`Error ${action}ing code:`, error);
      setOutput(`An error occurred while ${action}ing code.`);
    }
    setIsLoading(false);
  };

  return (
    <Layout title="Next.js Code Agent">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Code Input</CardTitle>
          </CardHeader>
          <CardContent>
            <CodeEditor
              value={input}
              onChange={setInput}
              language="typescript"
            />
          </CardContent>
        </Card>

        <div className="flex space-x-4">
          <Button onClick={() => handleAction('generate')} disabled={isLoading}>
            Generate Code
          </Button>
          <Button onClick={() => handleAction('analyze')} disabled={isLoading}>
            Analyze Code
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Output</CardTitle>
          </CardHeader>
          <CardContent>
            <CodeEditor
              value={output}
              onChange={setOutput}
              language="typescript"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Collaborative Code Editor</CardTitle>
          </CardHeader>
          <CardContent>
            <CollaborativeCodeEditor roomId={''} value={''} onChange={function (_value: string): void {
              throw new Error('Function not implemented.');
            } } />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Speech Recognition</CardTitle>
          </CardHeader>
          <CardContent>
            <SpeechRecognition onResult={function (_transcript: string): void {
              throw new Error('Function not implemented.');
            } } />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feedback Form</CardTitle>
          </CardHeader>
          <CardContent>
            <FeedbackForm onSubmit={function (_rating: number, _comment: string): void {
              throw new Error('Function not implemented.');
            } } />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}