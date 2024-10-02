import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { generateCode, analyzeCode } from '../../lib/gemini';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { action, content } = req.body;

    try {
      let result;
      if (action === 'generate') {
        result = await generateCode(content);
        await prisma.codeSnippet.create({
          data: {
            content: result,
            language: 'typescript', // Assuming TypeScript as default
          },
        });
      } else if (action === 'analyze') {
        result = await analyzeCode(content);
        await prisma.codeAnalysis.create({
          data: {
            snippetId: 'placeholder', // You might want to associate this with an actual snippet
            analysis: result,
          },
        });
      } else {
        return res.status(400).json({ error: 'Invalid action' });
      }

      res.status(200).json({ result });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'An error occurred' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}