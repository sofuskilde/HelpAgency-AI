'use client';

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useChat as useVercelChat } from 'ai/react';
import { ChatContextType, Message } from '../types/chat';
import { v4 as uuidv4 } from 'uuid';

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const {
    messages: aiMessages,
    isLoading,
    error,
    append,
    reload,
    stop,
    setMessages,
  } = useVercelChat({
    api: '/api/gemini/chat',
    body: {
      files: [], // This will be updated when sending messages with files
    },
  });

  // Convert AI SDK messages to our Message type
  const messages = useMemo(() => {
    return aiMessages.map((msg): Message => ({
      id: msg.id || uuidv4(),
      content: msg.content,
      role: msg.role === 'user' ? 'user' : 'assistant',
      createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
    }));
  }, [aiMessages]);

  const sendMessage = useCallback(
    async (content: string, files?: File[]) => {
      // If we have files, prepare them for sending
      const preparedFiles = files ? await Promise.all(
        files.map(async (file) => {
          const buffer = await file.arrayBuffer();
          const base64Data = Buffer.from(buffer).toString('base64');
          return {
            data: base64Data,
            type: file.type,
            name: file.name,
          };
        })
      ) : undefined;

      await append({
        content,
        role: 'user',
      }, {
        body: {
          files: preparedFiles,
        },
      });
    },
    [append]
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  const stopGenerating = useCallback(() => {
    stop();
  }, [stop]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        isLoading,
        error: error?.toString() || null,
        sendMessage,
        clearHistory,
        stopGenerating,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
} 