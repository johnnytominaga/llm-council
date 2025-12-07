'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import Stage1 from './Stage1';
import Stage2 from './Stage2';
import Stage3 from './Stage3';
import ResultsView from './ResultsView';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Message {
  role: 'user' | 'assistant';
  content?: string;
  stage1?: any[];
  stage2?: any[];
  stage3?: any;
  metadata?: any;
  streaming?: {
    stage1?: Record<string, string>;
    stage2?: Record<string, string>;
    stage3?: string;
  };
  loading?: {
    stage1?: boolean;
    stage2?: boolean;
    stage3?: boolean;
  };
}

interface Conversation {
  id: string;
  messages: Message[];
  title: string;
  created_at: string;
}

interface ChatInterfaceProps {
  conversation: Conversation | null;
  onSendMessage: (content: string) => void;
  isLoading: boolean;
}

export default function ChatInterface({
  conversation,
  onSendMessage,
  isLoading,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
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
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col h-screen bg-white">
        <div className="flex flex-col items-center justify-center h-full text-center px-6 pt-16 md:pt-0">
          <h2 className="text-2xl font-medium text-gray-900 mb-2">Welcome to LLM Council</h2>
          <p className="text-gray-600">Create a new conversation to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-white">
      {/* View Mode Tabs */}
      {conversation.messages.length > 0 && (
        <div className="border-b border-gray-200 bg-gray-50 px-6 pt-4 md:pt-4 pt-16">
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
            <h2 className="text-2xl font-medium text-gray-900 mb-2">Start a conversation</h2>
            <p className="text-gray-600">Ask a question to consult the LLM Council</p>
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
                  <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">You</div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 max-w-[80%]">
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">LLM Council</div>

                  {/* Stage 1 */}
                  {msg.loading?.stage1 && !msg.streaming?.stage1 && Object.keys(msg.streaming?.stage1 || {}).length === 0 && (
                    <div className="flex items-center gap-3 p-4 my-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                      <span className="text-sm text-gray-600 italic">Running Stage 1: Collecting individual responses...</span>
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
                    <div className="flex items-center gap-3 p-4 my-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                      <span className="text-sm text-gray-600 italic">Running Stage 2: Peer rankings...</span>
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
                    <div className="flex items-center gap-3 p-4 my-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                      <span className="text-sm text-gray-600 italic">Running Stage 3: Final synthesis...</span>
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
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            <span className="text-sm text-gray-600">Consulting the council...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {conversation.messages.length === 0 && (
        <form className="flex items-end gap-3 p-6 border-t bg-gray-50" onSubmit={handleSubmit}>
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
            disabled={!input.trim() || isLoading}
            size="lg"
          >
            Send
          </Button>
        </form>
      )}
    </div>
  );
}
