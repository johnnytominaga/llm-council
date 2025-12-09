"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ChatInterface from "@/components/ChatInterface";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import type { Conversation, ConversationDetail, Message } from "@/types/conversation";

export default function Home() {
    const router = useRouter();
    const { data: session, isPending } = useSession();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<
        string | null
    >(null);
    const [currentConversation, setCurrentConversation] = useState<ConversationDetail | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Auth guard
    useEffect(() => {
        console.log('[Home] Session check:', { session, isPending });

        if (!isPending && !session) {
            console.log('[Home] No session found, redirecting to /auth');
            router.push('/auth');
        }
    }, [session, isPending, router]);

    // Don't render until we know the auth state
    if (isPending) {
        console.log('[Home] Waiting for session...');
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    if (!session) {
        console.log('[Home] No session, showing nothing while redirecting');
        return null;
    }

    const loadConversations = useCallback(async () => {
        try {
            const convs = await api.listConversations();
            setConversations(convs);
        } catch (error) {
            console.error("Failed to load conversations:", error);
        }
    }, []);

    const loadConversation = useCallback(async (id: string) => {
        try {
            const conv = await api.getConversation(id);
            setCurrentConversation(conv);
        } catch (error) {
            console.error("Failed to load conversation:", error);
        }
    }, []);

    // Load conversations on mount
    useEffect(() => {
        void loadConversations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Load conversation details when selected
    useEffect(() => {
        if (currentConversationId) {
            void loadConversation(currentConversationId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentConversationId]);

    const handleNewConversation = async () => {
        try {
            const newConv = await api.createConversation();
            setConversations([
                {
                    id: newConv.id,
                    created_at: newConv.created_at,
                    title: newConv.title,
                    message_count: 0,
                },
                ...conversations,
            ]);
            setCurrentConversationId(newConv.id);
        } catch (error) {
            console.error("Failed to create conversation:", error);
        }
    };

    const handleSelectConversation = (id: string) => {
        setCurrentConversationId(id);
    };

    const handleUpdateTitle = async (id: string, newTitle: string) => {
        try {
            await api.updateConversationTitle(id, newTitle);
            // Update conversations list
            setConversations((prev) =>
                prev.map((conv) =>
                    conv.id === id ? { ...conv, title: newTitle } : conv
                )
            );
            // Update current conversation if it's the one being edited
            if (currentConversation?.id === id) {
                setCurrentConversation((prev) => prev ? ({
                    ...prev,
                    title: newTitle,
                }) : null);
            }
        } catch (error) {
            console.error("Failed to update title:", error);
        }
    };

    const handleSendMessage = async (content: string) => {
        if (!currentConversationId) return;

        setIsLoading(true);
        try {
            // Optimistically add user message to UI
            const userMessage: Message = { role: "user", content };
            setCurrentConversation((prev) => prev ? ({
                ...prev,
                messages: [...prev.messages, userMessage],
            }) : null);

            // Create a partial assistant message that will be updated progressively
            const assistantMessage: Message = {
                role: "assistant",
                stage1: undefined,
                stage2: undefined,
                stage3: undefined,
                metadata: undefined,
                streaming: {
                    stage1: {} as Record<string, string>,
                    stage2: {} as Record<string, string>,
                    stage3: "",
                },
                loading: {
                    stage1: false,
                    stage2: false,
                    stage3: false,
                },
            };

            // Add the partial assistant message
            setCurrentConversation((prev) => prev ? ({
                ...prev,
                messages: [...prev.messages, assistantMessage],
            }) : null);

            // Send message with streaming
            await api.sendMessageStream(
                currentConversationId,
                content,
                (eventType, event) => {
                    switch (eventType) {
                        case "stage1_start":
                            setCurrentConversation((prev) => {
                                if (!prev) return null;
                                const messages = [...prev.messages];
                                const lastMsg = messages[messages.length - 1];
                                if (lastMsg.loading) {
                                    lastMsg.loading.stage1 = true;
                                }
                                return { ...prev, messages };
                            });
                            break;

                        case "stage1_chunk":
                            setCurrentConversation((prev) => {
                                if (!prev) return null;
                                const messages = [...prev.messages];
                                const lastMsg = messages[messages.length - 1];
                                if (lastMsg.streaming) {
                                    lastMsg.streaming.stage1 = lastMsg.streaming.stage1 || {};
                                    lastMsg.streaming.stage1[event.model] = event.partial;
                                }
                                return { ...prev, messages };
                            });
                            break;

                        case "stage1_complete":
                            setCurrentConversation((prev) => {
                                if (!prev) return null;
                                const messages = [...prev.messages];
                                const lastMsg = messages[messages.length - 1];
                                lastMsg.stage1 = event.data;
                                if (lastMsg.streaming) {
                                    lastMsg.streaming.stage1 = {};
                                }
                                if (lastMsg.loading) {
                                    lastMsg.loading.stage1 = false;
                                }
                                return { ...prev, messages };
                            });
                            break;

                        case "stage2_start":
                            setCurrentConversation((prev) => {
                                if (!prev) return null;
                                const messages = [...prev.messages];
                                const lastMsg = messages[messages.length - 1];
                                if (lastMsg.loading) {
                                    lastMsg.loading.stage2 = true;
                                }
                                return { ...prev, messages };
                            });
                            break;

                        case "stage2_chunk":
                            setCurrentConversation((prev) => {
                                if (!prev) return null;
                                const messages = [...prev.messages];
                                const lastMsg = messages[messages.length - 1];
                                if (lastMsg.streaming) {
                                    lastMsg.streaming.stage2 = lastMsg.streaming.stage2 || {};
                                    lastMsg.streaming.stage2[event.model] = event.partial;
                                }
                                return { ...prev, messages };
                            });
                            break;

                        case "stage2_complete":
                            setCurrentConversation((prev) => {
                                if (!prev) return null;
                                const messages = [...prev.messages];
                                const lastMsg = messages[messages.length - 1];
                                lastMsg.stage2 = event.data;
                                lastMsg.metadata = event.metadata;
                                if (lastMsg.streaming) {
                                    lastMsg.streaming.stage2 = {};
                                }
                                if (lastMsg.loading) {
                                    lastMsg.loading.stage2 = false;
                                }
                                return { ...prev, messages };
                            });
                            break;

                        case "stage3_start":
                            setCurrentConversation((prev) => {
                                if (!prev) return null;
                                const messages = [...prev.messages];
                                const lastMsg = messages[messages.length - 1];
                                if (lastMsg.loading) {
                                    lastMsg.loading.stage3 = true;
                                }
                                return { ...prev, messages };
                            });
                            break;

                        case "stage3_chunk":
                            setCurrentConversation((prev) => {
                                if (!prev) return null;
                                const messages = [...prev.messages];
                                const lastMsg = messages[messages.length - 1];
                                if (lastMsg.streaming) {
                                    lastMsg.streaming.stage3 = event.partial;
                                }
                                return { ...prev, messages };
                            });
                            break;

                        case "stage3_complete":
                            setCurrentConversation((prev) => {
                                if (!prev) return null;
                                const messages = [...prev.messages];
                                const lastMsg = messages[messages.length - 1];
                                lastMsg.stage3 = event.data;
                                if (lastMsg.streaming) {
                                    lastMsg.streaming.stage3 = "";
                                }
                                if (lastMsg.loading) {
                                    lastMsg.loading.stage3 = false;
                                }
                                return { ...prev, messages };
                            });
                            break;

                        case "title_complete":
                            // Update the current conversation title
                            if (currentConversation) {
                                setCurrentConversation((prev) => prev ? ({
                                    ...prev,
                                    title: event.title,
                                }) : null);
                            }
                            // Reload conversations to get updated title in sidebar
                            void loadConversations();
                            break;

                        case "complete":
                            // Stream complete, reload conversations list
                            void loadConversations();
                            setIsLoading(false);
                            break;

                        case "error":
                            console.error("Stream error:", event.message);
                            setIsLoading(false);
                            break;

                        default:
                            console.log("Unknown event type:", eventType);
                    }
                }
            );
        } catch (error) {
            console.error("Failed to send message:", error);
            // Remove optimistic messages on error
            setCurrentConversation((prev) => prev ? ({
                ...prev,
                messages: prev.messages.slice(0, -2),
            }) : null);
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-white text-gray-900">
            <Sidebar
                conversations={conversations}
                currentConversationId={currentConversationId}
                onSelectConversation={handleSelectConversation}
                onNewConversation={handleNewConversation}
                onUpdateTitle={handleUpdateTitle}
            />
            <ChatInterface
                conversation={currentConversation}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
            />
        </div>
    );
}
