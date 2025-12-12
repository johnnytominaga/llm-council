'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import Stage1 from './Stage1';
import Stage2 from './Stage2';
import Stage3 from './Stage3';
import ResultsView from './ResultsView';
import FilePicker from './FilePicker';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ConversationDetail, Attachment } from '@/types/conversation';

interface ChatInterfaceProps {
  conversation: ConversationDetail | null;
  onSendMessage: (content: string, attachments?: Attachment[]) => void;
  isLoading: boolean;
}

export default function ChatInterface({
  conversation,
  onSendMessage,
  isLoading,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [viewMode, setViewMode] = useState<'conversation' | 'results'>('conversation');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || attachments.length > 0) && !isLoading) {
      onSendMessage(input, attachments);
      setInput('');
      setAttachments([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as React.FormEvent);
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col h-screen bg-neutral-950">
        <div className="flex flex-col items-center justify-center h-full text-center px-6 pt-16 md:pt-0">
          <h2 className="text-2xl font-light text-neutral-100 mb-2 tracking-tight">Welcome to LLM Council</h2>
          <p className="text-neutral-400">Create a new conversation to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-neutral-950">
      {/* View Mode Tabs */}
      {conversation.messages.length > 0 && (
        <div className="border-b border-neutral-800 bg-neutral-900/60 px-6 pt-4 md:pt-4 pt-16">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'conversation' | 'results')}>
            <TabsList>
              <TabsTrigger value="conversation">Conversation</TabsTrigger>
              <TabsTrigger value="results">All Results</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {conversation.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-2xl font-light text-neutral-100 mb-2 tracking-tight">Start a conversation</h2>
            <p className="text-neutral-400">Ask a question to consult the LLM Council</p>
          </div>
        ) : viewMode === 'results' ? (
          <ResultsView
            messages={conversation.messages}
            conversationTitle={conversation.title || 'LLM Council Results'}
          />
        ) : (
          conversation.messages.map((msg, index) => (
            <div key={index} className="mb-8">
              {msg.role === 'user' ? (
                <div className="mb-4">
                  <div className="text-xs font-medium text-neutral-400 mb-2 uppercase tracking-[0.2em]">You</div>
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
                            {attachment.contentType.startsWith('image/') ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400">
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
                  <div className="text-xs font-medium text-neutral-400 mb-2 uppercase tracking-[0.2em]">LLM Council</div>

                  {/* Stage 1 */}
                  {msg.loading?.stage1 && !msg.streaming?.stage1 && Object.keys(msg.streaming?.stage1 || {}).length === 0 && (
                    <div className="flex items-center gap-3 p-4 my-3 bg-neutral-900/60 rounded-2xl ring-1 ring-neutral-800">
                      <div className="w-5 h-5 border-2 border-neutral-700 border-t-primary rounded-full animate-spin"></div>
                      <span className="text-sm text-neutral-300 italic">Running Stage 1: Collecting individual responses...</span>
                    </div>
                  )}
                  {(msg.stage1 || (msg.streaming?.stage1 && Object.keys(msg.streaming.stage1).length > 0)) && (
                    <Stage1
                      responses={msg.stage1 || []}
                      streaming={msg.streaming?.stage1}
                    />
                  )}

                  {/* Stage 2 */}
                  {msg.loading?.stage2 && !msg.streaming?.stage2 && Object.keys(msg.streaming?.stage2 || {}).length === 0 && (
                    <div className="flex items-center gap-3 p-4 my-3 bg-neutral-900/60 rounded-2xl ring-1 ring-neutral-800">
                      <div className="w-5 h-5 border-2 border-neutral-700 border-t-primary rounded-full animate-spin"></div>
                      <span className="text-sm text-neutral-300 italic">Running Stage 2: Peer rankings...</span>
                    </div>
                  )}
                  {(msg.stage2 || (msg.streaming?.stage2 && Object.keys(msg.streaming.stage2).length > 0)) && (
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
                      <span className="text-sm text-neutral-300 italic">Running Stage 3: Final synthesis...</span>
                    </div>
                  )}
                  {(msg.stage3 || msg.streaming?.stage3) && (
                    <Stage3
                      finalResponse={msg.stage3 || { model: '', response: '' }}
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
            <span className="text-sm text-neutral-300">Consulting the council...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form - Always visible */}
      <form className="p-6 border-t border-neutral-800 bg-neutral-900/60" onSubmit={handleSubmit}>
        <div className="space-y-3">
          <FilePicker onFilesSelected={setAttachments} maxFiles={5} />
          <div className="flex items-end gap-3">
            <Textarea
              placeholder="Ask your question... (Shift+Enter for new line, Enter to send)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={3}
              className="flex-1 min-h-[80px] max-h-[300px] resize-y"
            />
            <Button
              type="submit"
              disabled={(!input.trim() && attachments.length === 0) || isLoading}
              size="lg"
            >
              Send
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
