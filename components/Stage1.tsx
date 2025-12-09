'use client';

import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Response {
  model: string;
  response: string;
}

interface Stage1Props {
  responses: Response[];
  streaming?: Record<string, string>;
}

export default function Stage1({ responses, streaming = {} }: Stage1Props) {
  // If streaming, show streaming models; otherwise show final responses
  const isStreaming = Object.keys(streaming).length > 0;
  const displayModels = isStreaming
    ? Object.keys(streaming)
    : responses?.map((r) => r.model) || [];

  if (!isStreaming && (!responses || responses.length === 0)) {
    return null;
  }

  if (displayModels.length === 0) {
    return null;
  }

  return (
    <Card className="my-6 bg-gray-50 border-gray-200">
      <CardHeader>
        <CardTitle className="text-base text-gray-900">Stage 1: Individual Responses</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={displayModels[0]} className="w-full">
          <TabsList className="flex-wrap h-auto">
            {displayModels.map((model) => (
              <TabsTrigger key={model} value={model} className="text-xs">
                {model.split('/')[1] || model}
              </TabsTrigger>
            ))}
          </TabsList>
          {displayModels.map((model) => {
            const content = isStreaming
              ? streaming[model] || ''
              : responses?.find((r) => r.model === model)?.response || '';

            return (
              <TabsContent key={model} value={model} className="mt-4">
                <div className="text-gray-600 text-xs font-mono mb-3">{model}</div>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{content}</ReactMarkdown>
                  {isStreaming && streaming[model] && (
                    <span className="inline-block ml-0.5 font-bold text-blue-500 animate-pulse">▊</span>
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
