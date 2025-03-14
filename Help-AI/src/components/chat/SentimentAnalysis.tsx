'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChatInput } from './ChatInput';
import { DocumentIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { Smile, Meh, Frown } from 'lucide-react';
import { toast } from "sonner";
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';

// Add loading states type
type LoadingState = 'processing' | 'analyzing' | 'generating';

interface SentimentResult {
  sentiment: 'positiv' | 'negativ' | 'neutral';
  score: number;
  summary: string;
  title: string;
  topics: string[];
  intent: string[];
  emotion: string;
  distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

// Initialize PDF.js
const initializePdf = async () => {
  try {
    // Set the worker source to our local worker file
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    return true;
  } catch (err) {
    console.error('Failed to initialize PDF.js:', err);
    throw err;
  }
};

export function SentimentAnalysis() {
  const [result, setResult] = useState<SentimentResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>('processing');
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isPdfInitialized, setIsPdfInitialized] = useState(false);
  const [initializationAttempts, setInitializationAttempts] = useState(0);

  useEffect(() => {
    if (!isPdfInitialized && initializationAttempts < 3) {
      initializePdf()
        .then(() => {
          setIsPdfInitialized(true);
          console.log('PDF.js initialized successfully');
        })
        .catch((error) => {
          console.error('Failed to initialize PDF.js:', error);
          setInitializationAttempts(prev => prev + 1);
          toast.error('Retrying PDF initialization...');
        });
    } else if (initializationAttempts >= 3) {
      toast.error('Failed to initialize PDF reader. Please refresh the page.');
    }
  }, [isPdfInitialized, initializationAttempts]);

  const limitTopics = (topics: string[]): string[] => {
    // Remove duplicates and empty strings
    const uniqueTopics = Array.from(new Set(topics.filter(t => t.trim())));
    // Return maximum 7 topics
    return uniqueTopics.slice(0, 7);
  };

  const readFileContent = async (file: File): Promise<string> => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    try {
      switch (extension) {
        case 'docx':
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          return result.value.trim();
        
        case 'pdf':
          // If PDF.js isn't initialized, try to initialize it
          if (!isPdfInitialized) {
            try {
              await initializePdf();
            } catch (error) {
              throw new Error('PDF reader initialization failed. Please try again or refresh the page.');
            }
          }

          const pdfArrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: pdfArrayBuffer }).promise;
          let fullText = '';
          
          // Extract text from each page
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items
              .map((item: TextItem | TextMarkedContent) => {
                if ('str' in item) {
                  return item.str;
                }
                return '';
              })
              .join(' ');
            fullText += pageText + '\n';
          }
          
          const trimmedText = fullText.trim();
          if (!trimmedText) {
            throw new Error('No text could be extracted from the PDF');
          }
          return trimmedText;
        
        case 'txt':
        case 'md':
        case 'json':
        case 'csv':
          const text = await file.text();
          return text.trim();
        
        default:
          toast.error(`Unsupported file type: .${extension}`);
          return '';
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`Error reading file ${file.name}:`, error);
      toast.error(`Failed to read file: ${file.name} - ${errorMessage}`);
      return '';
    }
  };

  const extractArticleTitle = (content: string): string => {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Common patterns for article titles
    for (const line of lines) {
      // Skip very long lines - titles are usually concise
      if (line.length > 150) continue;
      
      // Look for lines that might be titles
      if (
        // Check for common title patterns
        (line.length > 10 && line.length < 150) && // Reasonable title length
        !line.endsWith('.') && // Titles usually don't end with periods
        !line.includes('http') && // Not a URL
        !line.match(/^[0-9.]+/) && // Don't start with numbers (like dates)
        !line.match(/^(by|author|written by|published|date)/i) && // Skip bylines
        !line.includes('@') && // Not an email
        !line.match(/^[#*-]/) // Not a markdown/formatting character
      ) {
        return line;
      }
    }
    return 'Untitled Article';
  };

  const analyzeSentiment = async (text: string, files?: File[]) => {
    setIsAnalyzing(true);
    setLoadingState('processing');
    try {
      // Process files if they exist
      let fullText = text.trim();
      let documentTitle = '';
      
      if (files && files.length > 0) {
        // Initialize PDF.js if there are files (do it early)
        if (!isPdfInitialized && files.some(f => f.name.toLowerCase().endsWith('.pdf'))) {
          try {
            await initializePdf();
          } catch (error) {
            console.error('Failed to initialize PDF.js:', error);
          }
        }

        const fileContents = await Promise.all(files.map(readFileContent));
        const validContents = fileContents.filter(content => content.length > 0);
        
        if (validContents.length > 0) {
          fullText = [fullText, ...validContents].filter(t => t.length > 0).join("\n\n");
        }
      }

      setLoadingState('analyzing');

      if (!fullText.trim()) {
        throw new Error('No text to analyze');
      }

      // Extract title from the content
      documentTitle = extractArticleTitle(fullText);

      // Prepare the prompt for sentiment analysis
      const prompt = `
        Please analyze the sentiment of the following text and provide the response IN DANISH while maintaining the same level of analysis quality.
        IMPORTANT: Keep the title in its original language - do not translate it.

        1. The overall sentiment (strictly one of: positiv, negativ, or neutral)
        2. A confidence score between 0 and 1
        3. A brief, concise summary in Danish (maximum 2-3 short sentences) that captures the core sentiment and main point
        4. Keep the original title of the text as is - DO NOT translate it
           If this appears to be an article or blog post, use its actual title without translation
        5. Identify key topics in Danish (as an array of strings)
        6. Determine the intent in Danish (e.g., "Ros", "Anbefaling", "Klage", etc. as an array)
        7. Identify the primary emotion in Danish (e.g., "Glad", "Tilfreds", "Vred", etc.)
        8. Provide sentiment distribution percentages that sum to 100%:
           - Positive percentage
           - Neutral percentage
           - Negative percentage

        Text to analyze:
        "${fullText}"

        Format your response in JSON like this (but with Danish text, except for the title):
        {
          "sentiment": "positiv/negativ/neutral",
          "score": 0.XX,
          "summary": "kort og præcis forklaring (2-3 sætninger)",
          "title": "original title - do not translate",
          "topics": ["emne1", "emne2", ...],
          "intent": ["hensigt1", "hensigt2"],
          "emotion": "primær følelse",
          "distribution": {
            "positive": XX,
            "neutral": XX,
            "negative": XX
          }
        }
      `.trim();

      // Log the request payload
      console.log('Sending request with payload:', {
        messages: [{ role: 'user', content: prompt }],
        model: selectedModel
      });

      // Call the AI model
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          model: selectedModel
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      setLoadingState('generating');
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze sentiment');
      }

      let aiResponse;
      try {
        // Try to parse the AI response as JSON
        const cleanedMessage = data.message.replace(/```json\n|\n```/g, '');
        console.log('Cleaned message before parsing:', cleanedMessage);
        aiResponse = JSON.parse(cleanedMessage);
        console.log('Successfully parsed JSON response:', aiResponse);
      } catch (e) {
        console.error('JSON parse error:', e);
        // If parsing fails, try to extract sentiment information from the text response
        const text = data.message;
        console.log('Raw AI response:', text);
        
        // Try to extract sentiment in a more robust way
        const sentimentMatch = text.match(/sentiment.*?:\s*["']?(positiv|negativ|neutral)["']?/i);
        const scoreMatch = text.match(/score.*?:\s*(0\.\d+)/i);
        
        // Debug summary extraction
        console.log('Attempting to extract summary...');
        
        // Try different summary extraction patterns
        const patterns = [
          /summary"?\s*:\s*"([^"]+)"/i,  // Quoted with double quotes
          /summary"?\s*:\s*'([^']+)'/i,   // Quoted with single quotes
          /summary"?\s*:\s*"?([\s\S]+?)"?\s*(?=,\s*"(?:title|topics|intent|emotion|distribution))/i  // Unquoted until next field
        ];
        
        let extractedSummary = null;
        for (const pattern of patterns) {
          const match = text.match(pattern);
          console.log(`Trying pattern ${pattern}:`, match);
          if (match?.[1]) {
            extractedSummary = match[1];
            console.log('Found summary with pattern:', pattern);
            break;
          }
        }
        
        const summaryMatch = extractedSummary ? { 1: extractedSummary } : null;
        console.log('Final extracted summary:', extractedSummary);
        
        const titleMatch = text.match(/title.*?:\s*["']?(.*?)["']?(?=,|\}|$)/i);
        
        // Extract distribution data
        const distributionMatch = text.match(/distribution.*?:\s*{([^}]+)}/i);
        let distribution = {
          positive: 0,
          neutral: 0,
          negative: 0
        };
        
        if (distributionMatch) {
          try {
            distribution = JSON.parse(`{${distributionMatch[1]}}`);
          } catch {
            // If parsing fails, calculate distribution based on sentiment
            const sentiment = sentimentMatch?.[1]?.toLowerCase() || 'neutral';
            const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0.7;
            
            if (sentiment === 'positiv') {
              distribution = {
                positive: score * 100,
                neutral: ((1 - score) * 100) / 2,
                negative: ((1 - score) * 100) / 2
              };
            } else if (sentiment === 'negativ') {
              distribution = {
                positive: ((1 - score) * 100) / 2,
                neutral: ((1 - score) * 100) / 2,
                negative: score * 100
              };
            } else {
              distribution = {
                positive: ((1 - score) * 100) / 2,
                neutral: score * 100,
                negative: ((1 - score) * 100) / 2
              };
            }
          }
        }
        
        const parseArray = (match: RegExpMatchArray | null): string[] => {
          if (!match?.[1]) return [];
          try {
            // First try to parse as JSON array
            const jsonArray = JSON.parse(`[${match[1]}]`);
            return Array.isArray(jsonArray) ? jsonArray : [];
          } catch {
            // Fallback to simple string splitting
            return match[1]
              .split(',')
              .map(item => item.trim().replace(/["\[\]']/g, ''))
              .filter(Boolean);
          }
        };

        // Extract topics and intent arrays using regex that handles multiline content
        const topicsMatch = text.match(/topics"?\s*:\s*\[([\s\S]*?)\]/);
        const intentMatch = text.match(/intent"?\s*:\s*\[([\s\S]*?)\]/);

        const summaryText = extractedSummary || text;
        console.log('Final Summary Text before trimming:', summaryText);
        console.log('Summary text length:', summaryText?.length);
        console.log('Summary text first 50 chars:', summaryText?.substring(0, 50));
        console.log('Summary text contains commas:', summaryText?.includes(','));

        aiResponse = {
          sentiment: sentimentMatch?.[1]?.toLowerCase() || 'neutral',
          score: scoreMatch ? parseFloat(scoreMatch[1]) : 0.7,
          summary: summaryText?.trim(),
          title: titleMatch?.[1] || documentTitle || 'Text Analysis',
          emotion: text.match(/emotion.*?:\s*["']?(.*?)["']?(?=,|\}|$)/i)?.[1] || 'Neutral',
          topics: parseArray(topicsMatch),
          intent: parseArray(intentMatch),
          distribution: distribution
        };

        console.log('Fallback parsed response:', aiResponse);
      }

      if (!aiResponse.sentiment || !aiResponse.summary) {
        throw new Error('Invalid response format from AI');
      }

      const resultToSet = {
        sentiment: aiResponse.sentiment as SentimentResult['sentiment'],
        score: aiResponse.score,
        summary: aiResponse.summary,
        title: aiResponse.title || documentTitle || 'Text Analysis',
        topics: limitTopics(aiResponse.topics || []),
        intent: aiResponse.intent || [],
        emotion: aiResponse.emotion || '',
        distribution: aiResponse.distribution || {
          positive: aiResponse.score * 100,
          neutral: ((1 - aiResponse.score) * 100) / 2,
          negative: ((1 - aiResponse.score) * 100) / 2
        }
      };
      
      console.log('Setting result state with summary:', resultToSet.summary);
      console.log('Summary length in state:', resultToSet.summary?.length);
      setResult(resultToSet);
      
      // Debug state update
      setTimeout(() => {
        console.log('Current result state after update:', result);
        console.log('Current summary in state:', result?.summary);
      }, 0);
      
      toast.success("Analysis complete!");
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to analyze sentiment. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSentimentIcon = (sentiment: SentimentResult['sentiment']) => {
    switch (sentiment) {
      case 'positiv':
        return <Smile className="h-8 w-8 text-green-600" />;
      case 'negativ':
        return <Frown className="h-8 w-8 text-red-600" />;
      case 'neutral':
        return <Meh className="h-8 w-8 text-blue-600" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background relative">
      <div className="flex items-center h-14 border-b px-4">
        <h1 className="text-lg font-semibold">Sentiment Analysis</h1>
      </div>

      <div className="flex-1 overflow-auto p-4 relative">
        <div className="max-w-3xl mx-auto">
          {/* Loading Overlay */}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-gray-200">
                      <div className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin absolute inset-0" />
                    </div>
                  </div>
                  
                  <div className="mt-6 text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {loadingState === 'processing' && 'Processing Document...'}
                      {loadingState === 'analyzing' && 'Analyzing Sentiment...'}
                      {loadingState === 'generating' && 'Generating Report...'}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {loadingState === 'processing' && 'Extracting and preparing text content'}
                      {loadingState === 'analyzing' && 'Evaluating emotional tone and context'}
                      {loadingState === 'generating' && 'Creating detailed sentiment analysis'}
                    </p>
                  </div>

                  {/* Progress Steps */}
                  <div className="flex items-center space-x-2 mt-6">
                    <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                      loadingState === 'processing' ? 'bg-blue-500' : 'bg-gray-300'
                    }`} />
                    <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                      loadingState === 'analyzing' ? 'bg-blue-500' : 'bg-gray-300'
                    }`} />
                    <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                      loadingState === 'generating' ? 'bg-blue-500' : 'bg-gray-300'
                    }`} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {!result ? (
            <div className="text-center py-8">
              <ChartBarIcon className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <h2 className="text-xl font-medium text-foreground mb-2">
                Analyze Text Sentiment
              </h2>
              <p className="text-muted-foreground mb-4">
                Enter or upload text to analyze its emotional tone
              </p>
            </div>
          ) : (
            <div className="rounded-lg border bg-card p-6 mb-6">
              {/* Title Section */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{result.title}</h3>
                  <p className="text-gray-500 mt-1">Analysis Results</p>
                </div>
                <button
                  onClick={() => setResult(null)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* Unified Sentiment Card */}
                <div className="bg-white rounded-lg border p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`h-16 w-16 rounded-full flex items-center justify-center ${
                        result.sentiment === 'positiv' ? 'bg-green-100' :
                        result.sentiment === 'negativ' ? 'bg-red-100' :
                        'bg-blue-100'
                      }`}>
                        {getSentimentIcon(result.sentiment)}
                      </div>
                      <div>
                        <div className="text-lg font-medium">
                          <span className={`${
                            result.sentiment === 'positiv' ? 'text-green-600' :
                            result.sentiment === 'negativ' ? 'text-red-600' :
                            'text-blue-600'
                          }`}>
                            {result.sentiment.charAt(0).toUpperCase() + result.sentiment.slice(1)}
                          </span>
                          <span className="text-gray-500 text-base ml-2">Sentiment</span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Score: {(result.score * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sentiment Distribution */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 mb-4">Sentiment Distribution</h4>
                    
                    {/* Positive Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Positiv</span>
                        <span className="text-gray-900 font-medium">
                          {result.distribution.positive.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${result.distribution.positive}%` }}
                        />
                      </div>
                    </div>

                    {/* Neutral Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Neutral</span>
                        <span className="text-gray-900 font-medium">
                          {result.distribution.neutral.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${result.distribution.neutral}%` }}
                        />
                      </div>
                    </div>

                    {/* Negative Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Negativt</span>
                        <span className="text-gray-900 font-medium">
                          {result.distribution.negative.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${result.distribution.negative}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Section: Full Width Analysis Details */}
                <div className="p-4 bg-white rounded-lg border col-span-full">
                  <h4 className="font-medium text-gray-900 mb-4">Analysis Details</h4>
                  
                  <div className="space-y-3">
                    {/* Sentiment & Emotion Row */}
                    <div className="flex flex-wrap gap-3">
                      {/* Emotion Bubble */}
                      <div className="px-4 py-2 bg-yellow-50 rounded-lg">
                        <span className="text-yellow-800">
                          <span className="font-medium">Følelse: </span>
                          {result.emotion}
                        </span>
                      </div>

                      {/* Intent Bubble */}
                      <div className="px-4 py-2 bg-gray-50 rounded-lg">
                        <span className="text-gray-800">
                          <span className="font-medium">Hensigt: </span>
                          {result.intent.join(", ")}
                        </span>
                      </div>

                      {/* Topics Bubble */}
                      <div className="px-4 py-2 bg-gray-100 rounded-lg">
                        <span className="text-gray-800">
                          <span className="font-medium">Emner: </span>
                          {result.topics.map(topic => topic.trim()).join(", ")}
                        </span>
                      </div>
                    </div>

                    {/* Separator Line */}
                    <hr className="border-gray-200 my-4" />

                    {/* Summary Section */}
                    <div className="px-4 py-2 whitespace-normal break-words">
                      <span className="text-gray-800">
                        <span className="font-medium">Resumé: </span>
                        <span className="whitespace-pre-line" style={{ display: 'inline-block', width: '100%' }}>
                          {result.summary}
                        </span>
                      </span>
                      {/* Debug info */}
                      {process.env.NODE_ENV === 'development' && (
                        <div className="mt-2 text-xs text-gray-400">
                          Length: {result.summary?.length}, 
                          Has commas: {result.summary?.includes(',') ? 'Yes' : 'No'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <ChatInput
          onSendMessage={analyzeSentiment}
          onStopGenerating={() => setIsAnalyzing(false)}
          isLoading={isAnalyzing}
          placeholder="Enter text to analyze or upload a document..."
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          pendingFiles={pendingFiles}
          onClearFiles={() => setPendingFiles([])}
        />
      </div>

      {/* File drop overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const files = Array.from(e.dataTransfer.files);
          setPendingFiles(prev => [...prev, ...files]);
        }}
      />
    </div>
  );
} 