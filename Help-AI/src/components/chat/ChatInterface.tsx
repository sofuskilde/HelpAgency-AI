'use client';

import React, { useRef, useState } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { ChatSidebar } from './ChatSidebar';
import { SentimentAnalysis } from './SentimentAnalysis';
import { useChat } from '@/lib/contexts/ChatContext';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";

const ACCEPTED_FILE_TYPES = {
  // Documents
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.rtf': 'application/rtf',
  // Text formats
  '.md': 'text/markdown',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.yaml': 'application/yaml',
  '.yml': 'application/yaml',
  // Code files
  '.js': 'text/javascript',
  '.jsx': 'text/javascript',
  '.ts': 'text/typescript',
  '.tsx': 'text/typescript',
  '.py': 'text/x-python',
  '.html': 'text/html',
  '.css': 'text/css',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function ChatInterface() {
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    stopGenerating,
    clearHistory,
  } = useChat();

  const [currentFeature, setCurrentFeature] = useState('chat');
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [selectedModel, setSelectedModel] = useState('claude-3');
  const dragCounter = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewChat = React.useCallback(() => {
    clearHistory();
  }, [clearHistory]);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File ${file.name} is too large (max: 10MB)`;
    }
    
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!Object.keys(ACCEPTED_FILE_TYPES).includes(fileExtension)) {
      return `File type ${fileExtension} is not supported`;
    }
    
    return null;
  };

  const handleFiles = (files: File[]) => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      errors.forEach(error => {
        toast(error, {
          description: "Please try again",
          style: { backgroundColor: "red", color: "white" }
        });
      });
    }

    if (validFiles.length > 0) {
      setPendingFiles(prev => [...prev, ...validFiles]);
      toast("Files added", {
        description: `${validFiles.length} file(s) ready to be sent with your message`,
        style: { backgroundColor: "green", color: "white" }
      });
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFeatureSelect = (feature: string) => {
    setCurrentFeature(feature);
    if (feature === 'chat') {
      setPendingFiles([]);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <SidebarProvider defaultOpen>
        <ChatSidebar 
          onNewChat={handleNewChat}
          onSelectChat={(chatId) => {
            console.log('Selected chat:', chatId);
          }}
          onFeatureSelect={handleFeatureSelect}
          currentFeature={currentFeature}
        />

        {currentFeature === 'chat' ? (
          <div 
            className="flex-1 flex flex-col bg-background relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {isDragging && (
              <div className="absolute inset-0 bg-primary/5 backdrop-blur-sm border-2 border-dashed border-primary rounded-lg z-50 flex items-center justify-center">
                <div className="bg-background/95 backdrop-blur-sm px-6 py-4 rounded-xl shadow-lg text-center">
                  <div className="text-2xl text-primary font-medium mb-2">
                    Drop files to upload
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Supported formats: PDF, Word, Text, and Code files
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex items-center h-14 border-b px-4">
              <SidebarTrigger />
            </div>
            
            <div className="flex-1 overflow-hidden">
              {error && (
                <div className="m-4 rounded-md border border-destructive/50 bg-destructive/10 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-destructive">
                        Error
                      </h3>
                      <div className="mt-2 text-sm text-destructive/90">
                        {error}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <div className="mb-2">
                    <ChatBubbleLeftIcon className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                  <h2 className="text-2xl font-medium text-foreground mb-2">Start a new conversation</h2>
                  <p className="text-muted-foreground">Ask a question or drop files to begin chatting</p>
                </div>
              ) : (
                <div className="relative h-full overflow-y-auto">
                  <div className="absolute inset-0">
                    <MessageList messages={messages} />
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <ChatInput
                onSendMessage={sendMessage}
                onStopGenerating={stopGenerating}
                isLoading={isLoading}
                pendingFiles={pendingFiles}
                onClearFiles={() => setPendingFiles([])}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
              />
            </div>
          </div>
        ) : (
          <SentimentAnalysis />
        )}
      </SidebarProvider>
    </div>
  );
} 