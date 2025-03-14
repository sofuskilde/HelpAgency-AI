export type ModelProvider = 'gemini';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: Date;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export interface ModelConfig {
  provider: ModelProvider;
  temperature: number;
  maxTokens: number;
}

export interface ChatContextType {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string, files?: File[]) => Promise<void>;
  clearHistory: () => void;
  stopGenerating: () => void;
} 