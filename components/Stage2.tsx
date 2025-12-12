'use client';

import SafeMarkdown from '@/components/SafeMarkdown';
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
    <Card className="my-6">
      <CardHeader>
        <CardTitle className="text-base text-neutral-100 font-medium tracking-tight">Stage 2: Peer Rankings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {aggregateRankings && aggregateRankings.length > 0 && (
          <div className="rounded-2xl border-2 border-primary/30 bg-primary/10 p-4 ring-1 ring-primary/20">
            <h4 className="mb-3 text-sm font-semibold text-primary">Aggregate Rankings (Street Cred)</h4>
            <p className="mb-3 text-xs text-neutral-300">
              Combined results across all peer evaluations (lower score is better):
            </p>
            <div className="space-y-2">
              {aggregateRankings.map((agg, index) => (
                <div key={index} className="flex items-center gap-3 rounded-xl border border-neutral-700 bg-neutral-800/60 p-2.5">
                  <span className="min-w-[35px] text-base font-bold text-primary">#{index + 1}</span>
                  <span className="flex-1 text-sm font-medium font-mono text-neutral-100">
                    {agg.model.split('/')[1] || agg.model}
                  </span>
                  <span className="text-xs font-mono text-neutral-400">
                    Avg: {agg.average_rank.toFixed(2)}
                  </span>
                  <span className="text-xs text-neutral-400">
                    ({agg.rankings_count} votes)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="mb-2 text-sm font-semibold text-neutral-100">Raw Evaluations</h4>
          <p className="mb-4 text-xs text-neutral-400">
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
                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4 ring-1 ring-neutral-800">
                    <div className="mb-3 text-xs font-mono text-neutral-400">{model}</div>
                    <div className="prose prose-sm prose-invert max-w-none">
                      <SafeMarkdown>
                        {deAnonymizeText(content, labelToModel)}
                      </SafeMarkdown>
                      {isStreaming && (
                        <span className="inline-block ml-0.5 animate-pulse font-bold text-primary">▊</span>
                      )}
                    </div>

                    {!isStreaming && parsedRanking && parsedRanking.length > 0 && (
                      <div className="mt-4 border-t-2 border-neutral-800 pt-4">
                        <strong className="text-xs text-primary">Extracted Ranking:</strong>
                        <ol className="mt-2 space-y-1 pl-6">
                          {parsedRanking.map((label, i) => (
                            <li key={i} className="text-sm font-mono text-neutral-100">
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
