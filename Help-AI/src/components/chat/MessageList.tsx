'use client';

import React from 'react';
import { Message } from '@/lib/types/chat';
import ReactMarkdown from 'react-markdown';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline';
import { SmallLogo } from '@/components/logo';

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const [copiedMessageId, setCopiedMessageId] = React.useState<string | null>(null);

  const copyToClipboard = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-[#55D7FF]">
                <SmallLogo className="text-black w-full h-full p-1.5" />
              </div>
            )}
            <div className={`relative ${message.role === 'user' ? 'max-w-[85%]' : 'max-w-[90%]'}`}>
              <div
                className={`relative rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-gray-100'
                    : 'bg-white border border-gray-100'
                }`}
              >
                <div className="prose max-w-none text-gray-900">
                  <ReactMarkdown
                    components={{
                      code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const language = match ? match[1] : '';
                        const isInline = !match;

                        return isInline ? (
                          <code className="bg-gray-100 px-1 rounded text-gray-800" {...props}>
                            {children}
                          </code>
                        ) : (
                          <SyntaxHighlighter
                            language={language}
                            style={vscDarkPlus}
                            PreTag="div"
                            customStyle={{ 
                              margin: 0,
                              borderRadius: '0.75rem',
                              background: '#f3f4f6'
                            }}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className={`text-[11px] text-gray-400 ${
                  message.role === 'user' ? 'text-right mr-1' : 'ml-1'
                }`}>
                  {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                {message.role === 'assistant' && (
                  <button
                    onClick={() => copyToClipboard(message.content, message.id)}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-500 transition-colors"
                  >
                    {copiedMessageId === message.id ? (
                      <CheckIcon className="h-3 w-3" />
                    ) : (
                      <ClipboardIcon className="h-3 w-3" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 