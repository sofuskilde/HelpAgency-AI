'use client';

import React from 'react';
import { Logo } from '@/components/logo';
import { ChatBubbleLeftIcon, Cog6ToothIcon, UserIcon } from '@heroicons/react/24/outline';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

interface ChatSidebarProps {
  onNewChat: () => void;
  onSelectChat?: (chatId: string) => void;
  onOpenSettings?: () => void;
  onOpenProfile?: () => void;
  onFeatureSelect?: (feature: string) => void;
  currentFeature: string;
}

export function ChatSidebar({ 
  onNewChat, 
  onSelectChat, 
  onOpenSettings, 
  onOpenProfile,
  onFeatureSelect,
  currentFeature
}: ChatSidebarProps) {
  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b px-4 py-3">
        <Logo className="text-foreground" />
      </SidebarHeader>
      
      <SidebarContent>
        {/* Features Menu */}
        <div className="px-2 py-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => onFeatureSelect?.('chat')}
                className={`w-full text-foreground hover:bg-foreground/5 ${currentFeature === 'chat' ? 'bg-foreground/5' : ''}`}
                tooltip="Chat"
              >
                <ChatBubbleLeftIcon className="h-4 w-4" />
                <span>Chat</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => onFeatureSelect?.('sentiment')}
                className={`w-full text-foreground hover:bg-foreground/5 ${currentFeature === 'sentiment' ? 'bg-foreground/5' : ''}`}
                tooltip="Sentiment Analysis"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Sentiment Analysis</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>

        <SidebarSeparator />

        {/* Recent Chats - Only show when in chat mode */}
        {currentFeature === 'chat' && (
          <div className="px-2 py-2">
            <div className="px-2 py-1.5">
              <h2 className="text-xs font-medium text-muted-foreground">Recent Chats</h2>
            </div>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  className="w-full" 
                  tooltip="Previous Chat"
                  onClick={() => onSelectChat?.('previous-chat')}
                >
                  <ChatBubbleLeftIcon className="h-4 w-4" />
                  <span>Previous Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <div className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                className="w-full" 
                tooltip="Settings"
                onClick={onOpenSettings}
              >
                <Cog6ToothIcon className="h-4 w-4" />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                className="w-full" 
                tooltip="Profile"
                onClick={onOpenProfile}
              >
                <UserIcon className="h-4 w-4" />
                <span>Profile</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
} 