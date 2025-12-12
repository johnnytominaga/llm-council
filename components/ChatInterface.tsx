"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import Stage1 from "./Stage1";
import Stage2 from "./Stage2";
import Stage3 from "./Stage3";
import ResultsView from "./ResultsView";
import PromptSettings from "./PromptSettings";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import type {
  ConversationDetail,
  Attachment,
  ConversationAttachment,
} from "@/types/conversation";

interface ChatInterfaceProps {
  conversation: ConversationDetail | null;
  onSendMessage: (
    content: string,
    attachments?: Attachment[],
    useCouncil?: boolean
  ) => void;
  isLoading: boolean;
}

export default function ChatInterface({
  conversation,
  onSendMessage,
  isLoading,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [conversationAttachments, setConversationAttachments] = useState<
    ConversationAttachment[]
  >([]);
  const [useCouncil, setUseCouncil] = useState(false);
  const [viewMode, setViewMode] = useState<
    "conversation" | "results" | "attachments"
  >("conversation");
  const [currentModel, setCurrentModel] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  // Load conversation attachments when conversation changes
  useEffect(() => {
    if (conversation?.id) {
      loadConversationAttachments();
    } else {
      setConversationAttachments([]);
    }
  }, [conversation?.id]);

  const loadConversationAttachments = async () => {
    if (!conversation?.id) return;
    try {
      const result = await api.getConversationAttachments(conversation.id);
      setConversationAttachments(result.attachments || []);
    } catch (error) {
      console.error("Failed to load conversation attachments:", error);
    }
  };

  // Load user settings to get current model
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await api.getSettings();
        // Show current model based on mode
        if (settings.mode === "council") {
          setCurrentModel(settings.chairmanModel);
        } else {
          setCurrentModel(settings.singleModel);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    };
    loadSettings();
  }, []);

  // Handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const result = await response.json();
        // The API returns { file: { key, url, filename, contentType, size } }
        return {
          key: result.file.key,
          url: result.file.url,
          filename: result.file.filename,
          contentType: result.file.contentType,
          size: result.file.size,
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      setAttachments((prev) => [...prev, ...uploadedFiles]);
    } catch (error) {
      console.error("File upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    handleFileUpload(files);
  };

  // Remove attachment
  const handleRemoveAttachment = async (index: number) => {
    const fileToRemove = attachments[index];

    // Optimistically update UI
    const newAttachments = attachments.filter((_, i) => i !== index);
    setAttachments(newAttachments);

    // Try to delete from S3 in background
    try {
      await api.deleteUploadedFile(fileToRemove.key);
    } catch (err) {
      console.error("Failed to delete file from S3:", err);
    }
  };

  const handleDeleteConversationAttachment = async (attachmentId: string) => {
    if (!conversation?.id) return;
    try {
      await api.deleteConversationAttachment(conversation.id, attachmentId);
      setConversationAttachments((prev) =>
        prev.filter((a) => a.id !== attachmentId)
      );
    } catch (error) {
      console.error("Failed to delete attachment:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || attachments.length > 0) && !isLoading) {
      // Capture current values before clearing
      const currentInput = input;
      const currentAttachments = attachments;
      const currentUseCouncil = useCouncil;

      // Clear input state immediately
      setInput("");
      setAttachments([]);
      setUseCouncil(false);

      // Send message with captured values
      onSendMessage(currentInput, currentAttachments, currentUseCouncil);

      // After sending, move captured attachments to conversation pool
      if (currentAttachments.length > 0 && conversation?.id) {
        try {
          for (const attachment of currentAttachments) {
            await api.addConversationAttachment(conversation.id, attachment);
          }
          // Reload conversation attachments to include newly added ones
          await loadConversationAttachments();
        } catch (error) {
          console.error(
            "Failed to add attachments to conversation pool:",
            error
          );
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as React.FormEvent);
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col h-screen bg-neutral-950">
        <div className="flex flex-col items-center justify-center h-full text-center px-6 pt-16 md:pt-0">
          <h2 className="text-2xl font-light text-neutral-100 mb-2 tracking-tight">
            Welcome to LLM Council
          </h2>
          <p className="text-neutral-400">
            Create a new conversation to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-neutral-950">
      {/* View Mode Tabs */}
      {conversation.messages.length > 0 && (
        <div className="border-b border-neutral-800 bg-neutral-900/60 px-6 pt-4 md:pt-4 pt-16">
          <Tabs
            value={viewMode}
            onValueChange={(v) =>
              setViewMode(v as "conversation" | "results" | "attachments")
            }
          >
            <TabsList>
              <TabsTrigger value="conversation">Conversation</TabsTrigger>
              <TabsTrigger value="results">All Results</TabsTrigger>
              <TabsTrigger value="attachments">
                Attachments
                {conversationAttachments.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
                    {conversationAttachments.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {conversation.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-2xl font-light text-neutral-100 mb-2 tracking-tight">
              Start a conversation
            </h2>
            <p className="text-neutral-400">
              Ask a question to consult the LLM Council
            </p>
          </div>
        ) : viewMode === "attachments" ? (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-neutral-100">
                  Conversation Attachments
                </h3>
                <p className="text-sm text-neutral-400 mt-1">
                  Files uploaded and available for this entire conversation
                </p>
              </div>
            </div>

            {conversationAttachments.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="mx-auto mb-4 text-neutral-600"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <p className="text-neutral-400">No attachments yet</p>
                <p className="text-sm text-neutral-500 mt-2">
                  Upload files using the attachment button when sending messages
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {conversationAttachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-4 p-4 bg-neutral-900/60 rounded-xl ring-1 ring-neutral-800"
                  >
                    <div className="text-neutral-400">
                      {attachment.contentType.startsWith("image/") ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                          ></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-neutral-100 font-medium truncate">
                        {attachment.filename}
                      </div>
                      <div className="text-xs text-neutral-500 mt-1">
                        {(attachment.size / 1024).toFixed(1)} KB · Added{" "}
                        {new Date(attachment.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        handleDeleteConversationAttachment(attachment.id)
                      }
                      className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete attachment"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : viewMode === "results" ? (
          <ResultsView
            messages={conversation.messages}
            conversationTitle={conversation.title || "LLM Council Results"}
          />
        ) : (
          conversation.messages.map((msg, index) => (
            <div key={index} className="mb-8">
              {msg.role === "user" ? (
                <div className="mb-4">
                  <div className="text-xs font-medium text-neutral-400 mb-2 uppercase tracking-[0.2em]">
                    You
                  </div>
                  <div className="bg-neutral-900/60 p-4 rounded-2xl ring-1 ring-neutral-800 max-w-[80%]">
                    {msg.content && (
                      <div className="prose prose-sm max-w-none prose-invert">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {msg.attachments.map((attachment, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-xl"
                          >
                            {attachment.contentType.startsWith("image/") ? (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="text-neutral-400"
                              >
                                <rect
                                  x="3"
                                  y="3"
                                  width="18"
                                  height="18"
                                  rx="2"
                                  ry="2"
                                ></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                              </svg>
                            ) : (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="text-neutral-400"
                              >
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                              </svg>
                            )}
                            <span className="text-sm text-neutral-300 truncate">
                              {attachment.filename}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <div className="text-xs font-medium text-neutral-400 mb-2 uppercase tracking-[0.2em]">
                    Assistant
                  </div>

                  {/* Preprocessing */}
                  {msg.loading?.preprocessing && (
                    <div className="flex items-center gap-3 p-4 my-3 bg-neutral-900/60 rounded-2xl ring-1 ring-neutral-800">
                      <div className="w-5 h-5 border-2 border-neutral-700 border-t-primary rounded-full animate-spin"></div>
                      <span className="text-sm text-neutral-300 italic">
                        Preprocessing conversation history...
                      </span>
                    </div>
                  )}

                  {/* Single Model Response */}
                  {msg.loading?.single && !msg.streaming?.single && (
                    <div className="flex items-center gap-3 p-4 my-3 bg-neutral-900/60 rounded-2xl ring-1 ring-neutral-800">
                      <div className="w-5 h-5 border-2 border-neutral-700 border-t-primary rounded-full animate-spin"></div>
                      <span className="text-sm text-neutral-300 italic">
                        Generating response...
                      </span>
                    </div>
                  )}
                  {(msg.singleResponse || msg.streaming?.single) && (
                    <div className="bg-neutral-900/60 p-6 rounded-2xl ring-1 ring-neutral-800">
                      <div className="prose prose-sm max-w-none prose-invert">
                        <ReactMarkdown>
                          {msg.streaming?.single ||
                            msg.singleResponse?.response ||
                            ""}
                        </ReactMarkdown>
                      </div>
                      {msg.singleResponse && (
                        <div className="mt-4 pt-4 border-t border-neutral-800">
                          <div className="text-xs text-neutral-500">
                            Model: {msg.singleResponse.model}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Stage 1 */}
                  {msg.loading?.stage1 &&
                    !msg.streaming?.stage1 &&
                    Object.keys(msg.streaming?.stage1 || {}).length === 0 && (
                      <div className="flex items-center gap-3 p-4 my-3 bg-neutral-900/60 rounded-2xl ring-1 ring-neutral-800">
                        <div className="w-5 h-5 border-2 border-neutral-700 border-t-primary rounded-full animate-spin"></div>
                        <span className="text-sm text-neutral-300 italic">
                          Running Stage 1: Collecting individual responses...
                        </span>
                      </div>
                    )}
                  {(msg.stage1 ||
                    (msg.streaming?.stage1 &&
                      Object.keys(msg.streaming.stage1).length > 0)) && (
                    <Stage1
                      responses={msg.stage1 || []}
                      streaming={msg.streaming?.stage1}
                    />
                  )}

                  {/* Stage 2 */}
                  {msg.loading?.stage2 &&
                    !msg.streaming?.stage2 &&
                    Object.keys(msg.streaming?.stage2 || {}).length === 0 && (
                      <div className="flex items-center gap-3 p-4 my-3 bg-neutral-900/60 rounded-2xl ring-1 ring-neutral-800">
                        <div className="w-5 h-5 border-2 border-neutral-700 border-t-primary rounded-full animate-spin"></div>
                        <span className="text-sm text-neutral-300 italic">
                          Running Stage 2: Peer rankings...
                        </span>
                      </div>
                    )}
                  {(msg.stage2 ||
                    (msg.streaming?.stage2 &&
                      Object.keys(msg.streaming.stage2).length > 0)) && (
                    <Stage2
                      rankings={msg.stage2 || []}
                      labelToModel={msg.metadata?.label_to_model}
                      aggregateRankings={msg.metadata?.aggregate_rankings}
                      streaming={msg.streaming?.stage2}
                    />
                  )}

                  {/* Stage 3 */}
                  {msg.loading?.stage3 && !msg.streaming?.stage3 && (
                    <div className="flex items-center gap-3 p-4 my-3 bg-neutral-900/60 rounded-2xl ring-1 ring-neutral-800">
                      <div className="w-5 h-5 border-2 border-neutral-700 border-t-primary rounded-full animate-spin"></div>
                      <span className="text-sm text-neutral-300 italic">
                        Running Stage 3: Final synthesis...
                      </span>
                    </div>
                  )}
                  {(msg.stage3 || msg.streaming?.stage3) && (
                    <Stage3
                      finalResponse={msg.stage3 || { model: "", response: "" }}
                      streaming={msg.streaming?.stage3}
                    />
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-3 p-4">
            <div className="w-5 h-5 border-2 border-neutral-700 border-t-primary rounded-full animate-spin"></div>
            <span className="text-sm text-neutral-300">Thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form - Always visible */}
      <div className="border-t border-neutral-800 bg-neutral-900/60">
        <div className="max-w-4xl mx-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* File attachments display (inline chips) */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 rounded-lg text-sm group"
                  >
                    {attachment.contentType?.startsWith("image/") ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-neutral-400"
                      >
                        <rect
                          x="3"
                          y="3"
                          width="18"
                          height="18"
                          rx="2"
                          ry="2"
                        />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-neutral-400"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    )}
                    <span className="text-neutral-300 truncate max-w-[200px]">
                      {attachment.filename}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(index)}
                      className="text-neutral-500 hover:text-neutral-200 opacity-70 group-hover:opacity-100 transition-opacity"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Main input area with drag-and-drop */}
            <div
              className={`relative rounded-xl ring-1 transition-all ${
                isDragging
                  ? "ring-2 ring-primary bg-primary/5"
                  : "ring-neutral-800 bg-neutral-900"
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <Textarea
                ref={textareaRef}
                placeholder="Ask your question... (Shift+Enter for new line, Enter to send)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                rows={3}
                className="w-full min-h-[100px] max-h-[300px] resize-none border-0 bg-transparent focus:ring-0 pr-32 pb-12 text-neutral-100 placeholder:text-neutral-500"
              />

              {/* Bottom controls */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                {/* Left controls */}
                <div className="flex items-center gap-2">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                  />

                  {/* Plus button for file upload */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isLoading}
                    className="p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 rounded-lg transition-colors disabled:opacity-50"
                    title="Attach files"
                  >
                    {isUploading ? (
                      <div className="w-5 h-5 border-2 border-neutral-700 border-t-primary rounded-full animate-spin" />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    )}
                  </button>

                  {/* Settings popover */}
                  <PromptSettings
                    useCouncil={useCouncil}
                    onCouncilChange={setUseCouncil}
                  />
                </div>

                {/* Right side - model name and submit */}
                <div className="flex items-center gap-3">
                  {currentModel && (
                    <span className="text-xs text-neutral-500">
                      {currentModel.split("/").pop()}
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={
                      (!input.trim() && attachments.length === 0) || isLoading
                    }
                    className="p-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="19" x2="12" y2="5" />
                        <polyline points="5 12 12 5 19 12" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Drag overlay */}
              {isDragging && (
                <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-xl pointer-events-none">
                  <div className="text-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="mx-auto mb-2 text-primary"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <p className="text-sm text-primary font-medium">
                      Drop files to upload
                    </p>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
