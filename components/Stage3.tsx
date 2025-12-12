'use client';

import SafeMarkdown from '@/components/SafeMarkdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FinalResponse {
  model: string;
  response: string;
}

interface Stage3Props {
  finalResponse: FinalResponse;
  streaming?: string;
}

export default function Stage3({ finalResponse, streaming = '' }: Stage3Props) {
  const isStreaming = streaming.length > 0;
  const content = isStreaming ? streaming : finalResponse?.response || '';
  const modelName = finalResponse?.model || '';

  if (!isStreaming && !finalResponse) {
    return null;
  }

  return (
    <Card className="my-6 border-primary/50 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-base text-primary font-medium tracking-tight">Stage 3: Final Council Answer</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-5 ring-1 ring-neutral-800">
          {modelName && (
            <div className="mb-3 text-xs font-semibold font-mono text-neutral-300">
              Chairman: {modelName.split('/')[1] || modelName}
            </div>
          )}
          <div className="prose prose-sm prose-invert max-w-none leading-relaxed">
            <SafeMarkdown>{content}</SafeMarkdown>
            {isStreaming && (
              <span className="inline-block ml-0.5 animate-pulse font-bold text-primary">▊</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
