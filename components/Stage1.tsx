'use client';

import SafeMarkdown from '@/components/SafeMarkdown';
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
    <Card className="my-6">
      <CardHeader>
        <CardTitle className="text-base text-neutral-100 font-medium tracking-tight">Stage 1: Individual Responses</CardTitle>
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
                <div className="mb-3 text-xs font-mono text-neutral-400">{model}</div>
                <div className="prose prose-sm prose-invert max-w-none">
                  <SafeMarkdown>{content}</SafeMarkdown>
                  {isStreaming && streaming[model] && (
                    <span className="inline-block ml-0.5 animate-pulse font-bold text-primary">▊</span>
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
