'use client';

import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Ranking {
  model: string;
  ranking: string;
  parsed_ranking: string[];
}

interface AggregateRanking {
  model: string;
  average_rank: number;
  rankings_count: number;
}

interface Stage2Props {
  rankings: Ranking[];
  labelToModel?: Record<string, string>;
  aggregateRankings?: AggregateRanking[];
  streaming?: Record<string, string>;
}

function deAnonymizeText(text: string, labelToModel?: Record<string, string>): string {
  if (!labelToModel) return text;

  let result = text;
  // Replace each "Response X" with the actual model name
  Object.entries(labelToModel).forEach(([label, model]) => {
    const modelShortName = model.split('/')[1] || model;
    result = result.replace(new RegExp(label, 'g'), `**${modelShortName}**`);
  });
  return result;
}

export default function Stage2({ rankings, labelToModel, aggregateRankings, streaming = {} }: Stage2Props) {
  const isStreaming = Object.keys(streaming).length > 0;
  const displayModels = isStreaming
    ? Object.keys(streaming)
    : rankings?.map((r) => r.model) || [];

  if (!isStreaming && (!rankings || rankings.length === 0)) {
    return null;
  }

  if (displayModels.length === 0) {
    return null;
  }

  return (
    <Card className="my-6 bg-gray-50 border-gray-200">
      <CardHeader>
        <CardTitle className="text-base text-gray-900">Stage 2: Peer Rankings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {aggregateRankings && aggregateRankings.length > 0 && (
          <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
            <h4 className="text-sm font-semibold text-blue-700 mb-3">Aggregate Rankings (Street Cred)</h4>
            <p className="text-xs text-gray-600 mb-3">
              Combined results across all peer evaluations (lower score is better):
            </p>
            <div className="space-y-2">
              {aggregateRankings.map((agg, index) => (
                <div key={index} className="flex items-center gap-3 p-2.5 bg-white rounded border border-blue-200">
                  <span className="text-blue-700 font-bold text-base min-w-[35px]">#{index + 1}</span>
                  <span className="flex-1 text-gray-900 font-mono text-sm font-medium">
                    {agg.model.split('/')[1] || agg.model}
                  </span>
                  <span className="text-gray-600 text-xs font-mono">
                    Avg: {agg.average_rank.toFixed(2)}
                  </span>
                  <span className="text-gray-600 text-xs">
                    ({agg.rankings_count} votes)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Raw Evaluations</h4>
          <p className="text-xs text-gray-600 mb-4">
            Each model evaluated all responses (anonymized as Response A, B, C, etc.) and provided rankings.
            Below, model names are shown in <strong>bold</strong> for readability, but the original evaluation used anonymous labels.
          </p>

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
                : rankings?.find((r) => r.model === model)?.ranking || '';
              const parsedRanking = rankings?.find((r) => r.model === model)?.parsed_ranking || [];

              return (
                <TabsContent key={model} value={model} className="mt-4 space-y-4">
                  <div className="bg-white p-4 rounded border border-gray-200">
                    <div className="text-gray-600 text-xs font-mono mb-3">{model}</div>
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>
                        {deAnonymizeText(content, labelToModel)}
                      </ReactMarkdown>
                      {isStreaming && (
                        <span className="inline-block ml-0.5 font-bold text-blue-500 animate-pulse">▊</span>
                      )}
                    </div>

                    {!isStreaming && parsedRanking && parsedRanking.length > 0 && (
                      <div className="mt-4 pt-4 border-t-2 border-gray-200">
                        <strong className="text-blue-700 text-xs">Extracted Ranking:</strong>
                        <ol className="mt-2 pl-6 space-y-1">
                          {parsedRanking.map((label, i) => (
                            <li key={i} className="text-sm font-mono text-gray-900">
                              {labelToModel && labelToModel[label]
                                ? labelToModel[label].split('/')[1] || labelToModel[label]
                                : label}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}
