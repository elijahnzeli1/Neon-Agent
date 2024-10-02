// src/pages/api/snippets.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const snippets = await prisma.codeSnippet.findMany({
      where: { userId: session.user.id },
    });
    res.status(200).json(snippets);
  } else if (req.method === 'POST') {
    const { content, language } = req.body;
    const snippet = await prisma.codeSnippet.create({
      data: {
        content,
        language,
        userId: session.user.id,
      },
    });
    res.status(201).json(snippet);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}