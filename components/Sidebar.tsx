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
}

export default function Sidebar({
    conversations,
    currentConversationId,
    onSelectConversation,
    onNewConversation,
    onUpdateTitle,
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
            <div className="p-4 border-b border-gray-200">
                <div className="mb-4">
                    <Logo />
                </div>
                {/* <h1 className="text-lg mb-3 text-gray-900 font-medium">
                    LLM Council
                </h1> */}

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
                    <div className="p-4 text-center text-gray-600 text-sm">
                        No conversations yet
                    </div>
                ) : (
                    conversations.map((conv) => (
                        <div
                            key={conv.id}
                            className={`group relative p-3 mb-1 rounded-md cursor-pointer transition-colors hover:bg-gray-100 ${
                                conv.id === currentConversationId
                                    ? "bg-blue-50 border border-blue-500"
                                    : ""
                            }`}
                            onClick={() =>
                                editingId !== conv.id &&
                                handleSelectConversation(conv.id)
                            }
                        >
                            {editingId === conv.id ? (
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) =>
                                        setEditTitle(e.target.value)
                                    }
                                    onKeyDown={(e) => handleKeyDown(e, conv.id)}
                                    onBlur={() => handleSaveEdit(conv.id)}
                                    autoFocus
                                    className="w-full py-1 px-2 text-sm border border-blue-500 rounded outline-none bg-white"
                                />
                            ) : (
                                <>
                                    <div className="text-gray-900 text-sm mb-1 pr-7">
                                        {conv.title || "New Conversation"}
                                    </div>
                                    <button
                                        className="absolute top-3 right-3 w-6 h-6 bg-transparent border-none text-gray-600 text-base cursor-pointer opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center rounded hover:bg-black/10 hover:text-gray-900"
                                        onClick={(e) =>
                                            handleStartEdit(conv, e)
                                        }
                                        title="Edit title"
                                    >
                                        ✎
                                    </button>
                                </>
                            )}
                            <div className="text-gray-600 text-xs">
                                {conv.message_count} messages
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* User section at bottom */}
            {session?.user && (
                <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm">
                            <div className="font-medium text-gray-900">
                                {session.user.name}
                            </div>
                            <div className="text-gray-500 text-xs">
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
                                <g
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                >
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
                            className="fixed top-2 left-2 z-50 bg-white border-gray-300 shadow-md hover:bg-gray-50"
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
                    <DrawerContent className="bg-white">
                        <DrawerHeader className="sr-only">
                            <DrawerTitle>Conversations</DrawerTitle>
                            <DrawerDescription>
                                View and manage your conversations
                            </DrawerDescription>
                        </DrawerHeader>
                        <div className="max-h-[80vh] overflow-y-auto p-0 bg-white">
                            {sidebarContent}
                        </div>
                    </DrawerContent>
                </Drawer>
            </>
        );
    }

    // Desktop: Render regular sidebar
    return (
        <div className="w-[260px] bg-gray-50 border-r flex flex-col h-screen">
            {sidebarContent}
        </div>
    );
}
