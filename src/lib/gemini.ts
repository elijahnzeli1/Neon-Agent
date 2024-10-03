import { GoogleGenerativeAI } from "@google/generative-ai";

// Load the GEMINI API KEY from the environment variable
const API_KEY = process.env.GEMINI_API_KEY;

// Check if the API key is set and log an error if missing
if (!API_KEY) {
  console.error("Missing Gemini API Key. Please set the GEMINI_API_KEY environment variable.");
  throw new Error("Missing Gemini API Key");
}

// Print the API key for debugging purposes (optional)
console.log("API Key:", API_KEY);

// Create an instance of the GoogleGenerativeAI class
// Create an instance of the GoogleGenerativeAI class and initialize it
const genAI = new GoogleGenerativeAI(API_KEY);
// genAI.initialize(); // Removed as the method does not exist

// Function to generate code based on a prompt
export async function generateCode(prompt: string): Promise<string> {
  // Get the Gemini-Pro model
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  // Generate code based on the prompt
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  // Return the generated code
  return text;
}

// Function to analyze code and provide suggestions for improvement
export async function analyzeCode(code: string): Promise<string> {
  // Get the Gemini-Pro model
  const model = genAI.getGenerativeModel({ model: "gemini-pro" }); // Typo corrected here (getGenerativeModel)

  // Create a prompt for code analysis
  const prompt = `Analyze the following code and provide suggestions for improvement:

${code}

Please provide your analysis in the following format:
1. Code Quality:
2. Potential Issues:
3. Suggestions for Improvement:
`;

  // Generate code analysis based on the prompt
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  // Return the code analysis
  return text;
}