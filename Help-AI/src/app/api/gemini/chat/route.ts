import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenerativeAIStream, StreamingTextResponse } from 'ai';

if (!process.env.GOOGLE_API_KEY) {
  throw new Error('Missing GOOGLE_API_KEY environment variable');
}

// Initialize the Google AI SDK with your API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Helper function to convert File to base64
interface FileData {
  data: string; // base64 string
  type: string;
  name: string;
}

async function fileToGenerativePart(file: FileData) {
  return {
    inlineData: {
      data: file.data,
      mimeType: file.type
    }
  };
}

export async function POST(req: Request) {
  try {
    const { messages, files }: { messages: any[]; files?: FileData[] } = await req.json();

    // Get the latest message
    const lastMessage = messages[messages.length - 1];
    
    // Initialize the model with gemini-2.0-flash-vision if we have files, otherwise use gemini-1.0-pro
    const model = genAI.getGenerativeModel({
      model: files && files.length > 0 ? 'gemini-2.0-flash' : 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
        topP: 1,
        topK: 40,
      },
    });

    // If we have files, process them
    let parts = [];
    if (files && files.length > 0) {
      // Convert files to GenerativePart format
      const fileParts = await Promise.all(
        files.map(file => fileToGenerativePart(file))
      );
      parts = [
        { text: lastMessage.content || "Please analyze this file" },
        ...fileParts
      ];
    } else {
      parts = [{ text: lastMessage.content }];
    }

    // Generate content from the last message and any files
    const result = await model.generateContentStream(parts);

    // Convert the response to a stream
    const stream = GoogleGenerativeAIStream(result);
    
    return new StreamingTextResponse(stream);
  } catch (error: any) {
    console.error('Gemini API error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred while processing your request',
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
} 