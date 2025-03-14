import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text content is required' },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Analyze the sentiment of the following text and categorize it as either POSITIVE, NEGATIVE, or NEUTRAL. Also provide a brief explanation of why. Format the response as JSON with two fields: "sentiment" and "explanation". The sentiment should be one of the three categories mentioned.

Text to analyze: "${text}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const textResult = response.text();
    
    try {
      const jsonResult = JSON.parse(textResult);
      return NextResponse.json(jsonResult);
    } catch (e) {
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze sentiment' },
      { status: 500 }
    );
  }
} 