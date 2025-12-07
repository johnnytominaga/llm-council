'use client';

import ReactMarkdown from 'react-markdown';

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
    <div className="stage stage3">
      <h3 className="stage-title">Stage 3: Final Council Answer</h3>
      <div className="final-response">
        {modelName && (
          <div className="chairman-label">
            Chairman: {modelName.split('/')[1] || modelName}
          </div>
        )}
        <div className="final-text markdown-content">
          <ReactMarkdown>{content}</ReactMarkdown>
          {isStreaming && <span className="streaming-cursor">▊</span>}
        </div>
      </div>
    </div>
  );
}
