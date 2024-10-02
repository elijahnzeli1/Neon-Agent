import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("Missing Gemini API Key");
}

const genAI = new GoogleGenerativeAI(API_KEY);

export async function generateCode(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  return text;
}

export async function analyzeCode(code: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `Analyze the following code and provide suggestions for improvement:

${code}

Please provide your analysis in the following format:
1. Code Quality:
2. Potential Issues:
3. Suggestions for Improvement:
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  return text;
}