'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface Response {
  model: string;
  response: string;
}

interface Stage1Props {
  responses: Response[];
  streaming?: Record<string, string>;
}

export default function Stage1({ responses, streaming = {} }: Stage1Props) {
  const [activeTab, setActiveTab] = useState(0);

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

  const currentModel = displayModels[activeTab];
  const content = isStreaming
    ? streaming[currentModel] || ''
    : responses?.find((r) => r.model === currentModel)?.response || '';

  return (
    <div className="stage stage1">
      <h3 className="stage-title">Stage 1: Individual Responses</h3>

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
        <div className="model-name">{currentModel}</div>
        <div className="response-text markdown-content">
          <ReactMarkdown>{content}</ReactMarkdown>
          {isStreaming && <span className="streaming-cursor">▊</span>}
        </div>
      </div>
    </div>
  );
}
