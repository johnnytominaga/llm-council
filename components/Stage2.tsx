'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

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
  const [activeTab, setActiveTab] = useState(0);

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

  const currentModel = displayModels[activeTab];
  const content = isStreaming
    ? streaming[currentModel] || ''
    : rankings?.find((r) => r.model === currentModel)?.ranking || '';
  const parsedRanking = rankings?.find((r) => r.model === currentModel)?.parsed_ranking || [];

  return (
    <div className="stage stage2">
      <h3 className="stage-title">Stage 2: Peer Rankings</h3>

      <h4>Raw Evaluations</h4>
      <p className="stage-description">
        Each model evaluated all responses (anonymized as Response A, B, C, etc.) and provided rankings.
        Below, model names are shown in <strong>bold</strong> for readability, but the original evaluation used anonymous labels.
      </p>

      <div className="tabs">
        {displayModels.map((model, index) => (
          <button
            key={index}
            className={`tab ${activeTab === index ? 'active' : ''}`}
            onClick={() => setActiveTab(index)}
          >
            {model.split('/')[1] || model}
          </button>
        ))}
      </div>

      <div className="tab-content">
        <div className="ranking-model">
          {currentModel}
        </div>
        <div className="ranking-content markdown-content">
          <ReactMarkdown>
            {deAnonymizeText(content, labelToModel)}
          </ReactMarkdown>
          {isStreaming && <span className="streaming-cursor">▊</span>}
        </div>

        {!isStreaming && parsedRanking && parsedRanking.length > 0 && (
          <div className="parsed-ranking">
            <strong>Extracted Ranking:</strong>
            <ol>
              {parsedRanking.map((label, i) => (
                <li key={i}>
                  {labelToModel && labelToModel[label]
                    ? labelToModel[label].split('/')[1] || labelToModel[label]
                    : label}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {aggregateRankings && aggregateRankings.length > 0 && (
        <div className="aggregate-rankings">
          <h4>Aggregate Rankings (Street Cred)</h4>
          <p className="stage-description">
            Combined results across all peer evaluations (lower score is better):
          </p>
          <div className="aggregate-list">
            {aggregateRankings.map((agg, index) => (
              <div key={index} className="aggregate-item">
                <span className="rank-position">#{index + 1}</span>
                <span className="rank-model">
                  {agg.model.split('/')[1] || agg.model}
                </span>
                <span className="rank-score">
                  Avg: {agg.average_rank.toFixed(2)}
                </span>
                <span className="rank-count">
                  ({agg.rankings_count} votes)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
