import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API with your API key
const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error('GOOGLE_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(apiKey || '');

export async function POST(req: Request) {
  try {
    if (!apiKey) {
      throw new Error('API key not configured');
    }

    const { messages } = await req.json();
    if (!messages || !messages.length) {
      throw new Error('No messages provided');
    }

    // Get the last message which contains our prompt
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage.content) {
      throw new Error('Empty message content');
    }
    
    // For Gemini model - using gemini-pro for text generation
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    try {
      // Generate content
      const result = await model.generateContent(lastMessage.content);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new Error('Empty response from Gemini');
      }

      return NextResponse.json({ message: text });
    } catch (error) {
      console.error('Gemini API error:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Invalid model configuration. Please check your API key and model settings.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to generate content from Gemini' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
} 