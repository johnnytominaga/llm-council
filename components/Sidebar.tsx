"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  // DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import Settings from "@/components/Settings";
import type { Conversation } from "@/types/conversation";
import { useSession, signOut } from "@/lib/auth-client";
import Logo from "@/components/Logo";

interface SidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onUpdateTitle: (id: string, newTitle: string) => Promise<void>;
  onDeleteConversation: (id: string) => Promise<void>;
}

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onUpdateTitle,
  onDeleteConversation,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data: session } = useSession();

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleStartEdit = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title || "New Conversation");
  };

  const handleSaveEdit = async (id: string) => {
    if (editTitle.trim()) {
      await onUpdateTitle(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") {
      handleSaveEdit(id);
    } else if (e.key === "Escape") {
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
      <div className="p-4 border-b border-neutral-800">
        <div className="mb-4 text-neutral-100">
          <Logo />
        </div>

        <Button
          className="w-full"
          onClick={() => {
            onNewConversation();
            if (isMobile) {
              setIsDrawerOpen(false);
            }
          }}
        >
          + New Conversation
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-neutral-400 text-sm">
            No conversations yet
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group relative p-3 mb-1 rounded-lg cursor-pointer transition-all hover:bg-neutral-800 ${
                conv.id === currentConversationId
                  ? "bg-neutral-800 ring-1 ring-neutral-700"
                  : ""
              }`}
              onClick={() =>
                editingId !== conv.id && handleSelectConversation(conv.id)
              }
            >
              {editingId === conv.id ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, conv.id)}
                  onBlur={() => handleSaveEdit(conv.id)}
                  autoFocus
                  className="w-full py-1 px-2 text-sm border border-primary rounded-lg outline-none bg-neutral-900 text-neutral-100"
                />
              ) : (
                <>
                  <div className="text-neutral-100 text-sm mb-1 pr-14 font-medium tracking-tight">
                    {conv.title || "New Conversation"}
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      className="w-6 h-6 bg-transparent border-none text-neutral-400 text-base cursor-pointer flex items-center justify-center rounded hover:bg-neutral-700 hover:text-neutral-100"
                      onClick={(e) => handleStartEdit(conv, e)}
                      title="Edit title"
                    >
                      <div className="size-4">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                        >
                          <g fill="none">
                            <path
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeWidth="1.5"
                              d="m16.652 3.455l.649-.649A2.753 2.753 0 0 1 21.194 6.7l-.65.649m-3.892-3.893s.081 1.379 1.298 2.595c1.216 1.217 2.595 1.298 2.595 1.298m-3.893-3.893L10.687 9.42c-.404.404-.606.606-.78.829q-.308.395-.524.848c-.121.255-.211.526-.392 1.068L8.412 13.9m12.133-6.552l-2.983 2.982m-2.982 2.983c-.404.404-.606.606-.829.78a4.6 4.6 0 0 1-.848.524c-.255.121-.526.211-1.068.392l-1.735.579m0 0l-1.123.374a.742.742 0 0 1-.939-.94l.374-1.122m1.688 1.688L8.412 13.9"
                            />
                            <path
                              fill="currentColor"
                              d="M22.75 12a.75.75 0 0 0-1.5 0zM12 2.75a.75.75 0 0 0 0-1.5zM7.376 20.013a.75.75 0 1 0-.752 1.298zm-4.687-2.638a.75.75 0 1 0 1.298-.75zM21.25 12A9.25 9.25 0 0 1 12 21.25v1.5c5.937 0 10.75-4.813 10.75-10.75zM12 1.25C6.063 1.25 1.25 6.063 1.25 12h1.5A9.25 9.25 0 0 1 12 2.75zM6.624 21.311A10.7 10.7 0 0 0 12 22.75v-1.5a9.2 9.2 0 0 1-4.624-1.237zM1.25 12a10.7 10.7 0 0 0 1.439 5.375l1.298-.75A9.2 9.2 0 0 1 2.75 12z"
                            />
                          </g>
                        </svg>
                      </div>
                    </button>
                    <button
                      className="w-6 h-6 bg-transparent border-none text-neutral-400 text-base cursor-pointer flex items-center justify-center rounded hover:bg-red-900/50 hover:text-red-400"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (
                          confirm(
                            "Are you sure you want to delete this conversation?"
                          )
                        ) {
                          await onDeleteConversation(conv.id);
                        }
                      }}
                      title="Delete conversation"
                    >
                      <div className="size-4">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                        >
                          <path
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeWidth="1.5"
                            d="M20.5 6h-17m5.67-2a3.001 3.001 0 0 1 5.66 0m3.544 11.4c-.177 2.654-.266 3.981-1.131 4.79s-2.195.81-4.856.81h-.774c-2.66 0-3.99 0-4.856-.81c-.865-.809-.953-2.136-1.13-4.79l-.46-6.9m13.666 0l-.2 3"
                          />
                        </svg>
                      </div>
                    </button>
                  </div>
                </>
              )}
              <div className="text-neutral-400 text-xs">
                {conv.message_count} messages
              </div>
            </div>
          ))
        )}
      </div>

      {/* User section at bottom */}
      {session?.user && (
        <div className="p-4 border-t border-neutral-800">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm">
              <div className="font-medium text-neutral-100 tracking-tight">
                {session.user.name}
              </div>
              <div className="text-neutral-400 text-xs">
                {session.user.email}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setSettingsOpen(true);
                if (isMobile) {
                  setIsDrawerOpen(false);
                }
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
              >
                <g fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path
                    strokeLinecap="round"
                    d="M7.843 20.198C9.872 21.399 10.886 22 12 22s2.128-.6 4.157-1.802l.686-.407c2.029-1.2 3.043-1.802 3.6-2.791c.557-.99.557-2.19.557-4.594M20.815 8a3.6 3.6 0 0 0-.372-1c-.557-.99-1.571-1.59-3.6-2.792l-.686-.406C14.128 2.601 13.114 2 12 2s-2.128.6-4.157 1.802l-.686.406C5.128 5.41 4.114 6.011 3.557 7C3 7.99 3 9.19 3 11.594v.812c0 2.403 0 3.605.557 4.594c.226.402.528.74.943 1.08"
                  />
                  <circle cx="12" cy="12" r="3" />
                </g>
              </svg>{" "}
              Settings
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={async () => {
                await signOut();
                window.location.href = "/auth";
              }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <Settings open={settingsOpen} onOpenChange={setSettingsOpen} />
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
              className="fixed top-2 left-2 z-50 bg-neutral-900 border-neutral-800 shadow-md hover:bg-neutral-800"
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
          <DrawerContent className="bg-neutral-900">
            <DrawerHeader className="sr-only">
              <DrawerTitle>Conversations</DrawerTitle>
              <DrawerDescription>
                View and manage your conversations
              </DrawerDescription>
            </DrawerHeader>
            <div className="max-h-[80vh] overflow-y-auto p-0 bg-neutral-900">
              {sidebarContent}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop: Render regular sidebar
  return (
    <div className="w-[260px] bg-neutral-900/60 border-r border-neutral-800 flex flex-col h-screen ring-1 ring-neutral-800">
      {sidebarContent}
    </div>
  );
}
