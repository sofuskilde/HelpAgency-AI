'use client';

import React, { useRef, useEffect, useState } from 'react';
import { PaperAirplaneIcon, StopIcon, AdjustmentsHorizontalIcon, PaperClipIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { DocumentIcon } from '@heroicons/react/24/solid';

interface ChatInputProps {
  onSendMessage: (message: string, files?: File[]) => void;
  onStopGenerating: () => void;
  isLoading: boolean;
  disabled?: boolean;
  pendingFiles?: File[];
  onClearFiles?: () => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  placeholder?: string;
}

export function ChatInput({
  onSendMessage,
  onStopGenerating,
  isLoading,
  disabled = false,
  pendingFiles = [],
  onClearFiles,
  selectedModel,
  onModelChange,
  placeholder = "Ask anything..."
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const models = [
    { id: 'gemini 2.0 flash', name: 'Gemini 2.0 Flash' },
    { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash-8B' }
  ];

  useEffect(() => {
    if (JSON.stringify(files) !== JSON.stringify(pendingFiles)) {
      setFiles(pendingFiles);
    }
  }, [pendingFiles]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((message.trim() || files.length > 0) && !disabled) {
      onSendMessage(message.trim(), files);
      setMessage('');
      setFiles([]);
      onClearFiles?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles((prevFiles) => {
      const newFiles = prevFiles.filter((_, i) => i !== index);
      if (pendingFiles.length > 0) {
        onClearFiles?.();
        return newFiles;
      }
      return newFiles;
    });
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
    }
  }, [message]);

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
        <div className="relative rounded-2xl border border-gray-200 bg-white shadow-sm">
          {files.length > 0 && (
            <div className="px-4 pt-3 flex flex-wrap gap-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1 text-sm text-gray-700"
                >
                  <DocumentIcon className="h-4 w-4 text-gray-500" />
                  <span className="truncate max-w-[200px]">{file.name}</span>
                  <span className="text-gray-400 text-xs">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="relative px-3 pt-3">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full resize-none border-0 bg-transparent px-1 py-1 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
              rows={1}
            />
            <div className="absolute right-3 bottom-1 flex items-center gap-2">
              {isLoading ? (
                <button
                  type="button"
                  onClick={onStopGenerating}
                  className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <StopIcon className="h-5 w-5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={(!message.trim() && files.length === 0) || disabled}
                  className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-2">
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <AdjustmentsHorizontalIcon className="h-5 w-5" />
                <span className="sr-only">Select Model</span>
              </button>
              {isModelDropdownOpen && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                  <div className="py-1">
                    {models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          onModelChange(model.id);
                          setIsModelDropdownOpen(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm ${
                          selectedModel === model.id
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {model.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.rtf,.md,.csv,.json,.yaml,.yml,.js,.jsx,.ts,.tsx,.py,.html,.css"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors group relative"
            >
              <PaperClipIcon className="h-5 w-5" />
              <span className="sr-only">Attach files</span>
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Attach files
              </span>
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              
            </div>
          </div>
        </div>
      </form>
    </div>
  );
} 