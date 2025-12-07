'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

interface Conversation {
  id: string;
  title: string;
  message_count: number;
  created_at: string;
}

interface SidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onUpdateTitle: (id: string, newTitle: string) => Promise<void>;
}

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onUpdateTitle,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleStartEdit = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title || 'New Conversation');
  };

  const handleSaveEdit = async (id: string) => {
    if (editTitle.trim()) {
      await onUpdateTitle(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(id);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleSelectConversation = (id: string) => {
    onSelectConversation(id);
    if (isMobile) {
      setIsDrawerOpen(false);
    }
  };

  // Sidebar content (shared between desktop and mobile)
  const sidebarContent = (
    <>
      <div className="sidebar-header">
        <h1>LLM Council</h1>
        <button className="new-conversation-btn" onClick={onNewConversation}>
          + New Conversation
        </button>
      </div>

      <div className="conversation-list">
        {conversations.length === 0 ? (
          <div className="no-conversations">No conversations yet</div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${
                conv.id === currentConversationId ? 'active' : ''
              }`}
              onClick={() => editingId !== conv.id && handleSelectConversation(conv.id)}
            >
              {editingId === conv.id ? (
                <div className="conversation-title-edit">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, conv.id)}
                    onBlur={() => handleSaveEdit(conv.id)}
                    autoFocus
                    className="conversation-title-input"
                  />
                </div>
              ) : (
                <>
                  <div className="conversation-title">
                    {conv.title || 'New Conversation'}
                  </div>
                  <button
                    className="edit-title-btn"
                    onClick={(e) => handleStartEdit(conv, e)}
                    title="Edit title"
                  >
                    ✎
                  </button>
                </>
              )}
              <div className="conversation-meta">
                {conv.message_count} messages
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  // Mobile: Render drawer with trigger button
  if (isMobile) {
    return (
      <>
        {/* Mobile drawer trigger button */}
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="mobile-menu-btn fixed top-4 left-4 z-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader className="sr-only">
              <DrawerTitle>Conversations</DrawerTitle>
              <DrawerDescription>View and manage your conversations</DrawerDescription>
            </DrawerHeader>
            <div className="sidebar-drawer">
              {sidebarContent}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop: Render regular sidebar
  return <div className="sidebar">{sidebarContent}</div>;
}
