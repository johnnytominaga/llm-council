'use client';

import ReactMarkdown from 'react-markdown';
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
    <Card className="my-6 bg-green-50 border-green-300">
      <CardHeader>
        <CardTitle className="text-base text-green-800">Stage 3: Final Council Answer</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-white p-5 rounded border border-green-200">
          {modelName && (
            <div className="text-green-700 text-xs font-mono font-semibold mb-3">
              Chairman: {modelName.split('/')[1] || modelName}
            </div>
          )}
          <div className="prose prose-sm max-w-none leading-relaxed">
            <ReactMarkdown>{content}</ReactMarkdown>
            {isStreaming && (
              <span className="inline-block ml-0.5 font-bold text-blue-500 animate-pulse">▊</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
