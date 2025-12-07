'use client';

import { useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';

interface Message {
  role: 'user' | 'assistant';
  content?: string;
  stage1?: any[];
  stage2?: any[];
  stage3?: any;
  metadata?: any;
}

interface ResultsViewProps {
  messages: Message[];
  conversationTitle: string;
}

export default function ResultsView({ messages, conversationTitle }: ResultsViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    const addText = (text: string, fontSize: number, fontStyle: 'normal' | 'bold' | 'italic' = 'normal', indent: number = 0) => {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', fontStyle);
      const lines = pdf.splitTextToSize(text, contentWidth - indent);

      lines.forEach((line: string) => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(line, margin + indent, yPosition);
        yPosition += fontSize * 0.4; // Dynamic line height based on font size
      });
    };

    const addSpacing = (space: number) => {
      yPosition += space;
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = margin;
      }
    };

    // Title
    addText(conversationTitle || 'LLM Council Results', 18, 'bold');
    addSpacing(3);
    addText(`Generated: ${new Date().toLocaleString()}`, 10, 'normal');
    addSpacing(8);

    // Process each message
    messages.forEach((msg, msgIndex) => {
      if (msg.role === 'user') {
        // User question
        addText('Question:', 12, 'bold');
        addSpacing(2);
        addText(msg.content || '', 11, 'normal');
        addSpacing(8);

      } else if (msg.role === 'assistant') {
        // Stage 1: Individual Responses
        if (msg.stage1 && msg.stage1.length > 0) {
          addText('Stage 1: Individual Responses', 14, 'bold');
          addSpacing(5);

          msg.stage1.forEach((response: any, idx: number) => {
            const modelName = response.model.split('/')[1] || response.model;
            addText(`Model: ${modelName}`, 11, 'bold', 3);
            addSpacing(2);

            // Full response text, not truncated
            addText(response.response, 9, 'normal', 5);
            addSpacing(5);

            // Add separator between models
            if (msg.stage1 && idx < msg.stage1.length - 1) {
              pdf.setDrawColor(200, 200, 200);
              pdf.line(margin, yPosition, pageWidth - margin, yPosition);
              addSpacing(5);
            }
          });
          addSpacing(8);
        }

        // Stage 2: Rankings with detailed evaluations
        if (msg.stage2 && msg.stage2.length > 0) {
          addText('Stage 2: Peer Rankings', 14, 'bold');
          addSpacing(5);

          // Show aggregate rankings first
          if (msg.metadata?.aggregate_rankings && msg.metadata.aggregate_rankings.length > 0) {
            addText('Aggregate Rankings:', 12, 'bold', 3);
            addSpacing(3);

            msg.metadata.aggregate_rankings.forEach((agg: any, index: number) => {
              const modelName = agg.model.split('/')[1] || agg.model;
              addText(
                `#${index + 1}  ${modelName} - Avg: ${agg.average_rank.toFixed(2)} (${agg.rankings_count} votes)`,
                10,
                'normal',
                5
              );
              addSpacing(2);
            });
            addSpacing(5);
          }

          // Show individual rankings
          addText('Individual Evaluations:', 12, 'bold', 3);
          addSpacing(3);

          msg.stage2.forEach((ranking: any, idx: number) => {
            const modelName = ranking.model.split('/')[1] || ranking.model;
            addText(`Evaluator: ${modelName}`, 11, 'bold', 5);
            addSpacing(2);

            // Full ranking text
            addText(ranking.ranking, 9, 'normal', 7);
            addSpacing(3);

            // Show parsed ranking
            if (ranking.parsed_ranking && ranking.parsed_ranking.length > 0) {
              addText('Extracted Ranking:', 9, 'bold', 7);
              addSpacing(2);
              ranking.parsed_ranking.forEach((label: string, i: number) => {
                const displayName = msg.metadata?.label_to_model?.[label]
                  ? msg.metadata.label_to_model[label].split('/')[1] || msg.metadata.label_to_model[label]
                  : label;
                addText(`${i + 1}. ${displayName}`, 9, 'normal', 10);
                addSpacing(1);
              });
              addSpacing(3);
            }

            // Add separator
            if (msg.stage2 && idx < msg.stage2.length - 1) {
              pdf.setDrawColor(200, 200, 200);
              pdf.line(margin + 5, yPosition, pageWidth - margin - 5, yPosition);
              addSpacing(5);
            }
          });
          addSpacing(8);
        }

        // Stage 3: Final Answer
        if (msg.stage3?.response) {
          addText('Stage 3: Final Council Answer', 14, 'bold');
          addSpacing(5);

          const chairman = msg.stage3.model.split('/')[1] || msg.stage3.model;
          addText(`Chairman: ${chairman}`, 10, 'italic', 3);
          addSpacing(3);

          // Full final answer
          addText(msg.stage3.response, 10, 'normal', 3);
          addSpacing(10);
        }
      }
    });

    // Save PDF
    const fileName = `${conversationTitle.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
    pdf.save(fileName);
  };

  // Filter to show only completed conversations (with stage3)
  const completedMessages = messages.filter(
    (msg) => msg.role === 'user' || (msg.role === 'assistant' && msg.stage3)
  );

  if (completedMessages.length === 0) {
    return (
      <Card className="my-6">
        <CardContent className="p-6 text-center text-gray-600">
          No completed responses yet. Results will appear here once the council has finished deliberating.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="my-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base text-gray-900">All Results</CardTitle>
        <Button onClick={handleDownloadPDF} size="sm" variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </CardHeader>
      <CardContent ref={contentRef} className="space-y-6">
        {completedMessages.map((msg, index) => (
          <div key={index}>
            {msg.role === 'user' ? (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-xs font-semibold text-blue-700 mb-2 uppercase">Question</div>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Stage 1 Summary */}
                {msg.stage1 && msg.stage1.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Stage 1: Individual Responses ({msg.stage1.length} models)
                    </h3>
                    <div className="space-y-3">
                      {msg.stage1.map((response: any, i: number) => (
                        <div key={i} className="bg-white p-3 rounded border border-gray-200">
                          <div className="text-xs font-mono text-gray-600 mb-2">
                            {response.model.split('/')[1] || response.model}
                          </div>
                          <div className="prose prose-sm max-w-none text-sm">
                            <ReactMarkdown>{response.response}</ReactMarkdown>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stage 2 Rankings */}
                {msg.metadata?.aggregate_rankings && msg.metadata.aggregate_rankings.length > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="text-sm font-semibold text-blue-700 mb-3">
                      Stage 2: Aggregate Rankings
                    </h3>
                    <div className="space-y-2">
                      {msg.metadata.aggregate_rankings.map((agg: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between bg-white p-3 rounded border border-blue-200"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-blue-700 font-bold text-base">#{i + 1}</span>
                            <span className="font-mono text-sm font-medium text-gray-900">
                              {agg.model.split('/')[1] || agg.model}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            Avg: {agg.average_rank.toFixed(2)} ({agg.rankings_count} votes)
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stage 3 Final Answer */}
                {msg.stage3?.response && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-300">
                    <h3 className="text-sm font-semibold text-green-800 mb-2">
                      Stage 3: Final Council Answer
                    </h3>
                    <div className="text-xs text-green-700 font-mono mb-3">
                      Chairman: {msg.stage3.model.split('/')[1] || msg.stage3.model}
                    </div>
                    <div className="prose prose-sm max-w-none bg-white p-4 rounded border border-green-200">
                      <ReactMarkdown>{msg.stage3.response}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
