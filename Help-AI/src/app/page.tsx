import { ChatInterface } from '@/components/chat/ChatInterface';
import { ChatProvider } from '@/lib/contexts/ChatContext';

export default function Home() {
  return (
    <ChatProvider>
      <ChatInterface />
    </ChatProvider>
  );
}
