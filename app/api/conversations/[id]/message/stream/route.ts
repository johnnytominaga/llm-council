/**
 * API route for streaming message processing through the council.
 */

import { NextResponse } from 'next/server';
import {
  addUserMessage,
  addAssistantMessage,
  updateConversationTitle,
  getConversation,
} from '@/lib/storage';
import {
  stage1CollectResponses,
  stage2CollectRankings,
  stage3SynthesizeFinal,
  calculateAggregateRankings,
  generateConversationTitle,
} from '@/lib/council';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { content } = await request.json();

    // Check if conversation exists
    const conversation = getConversation(id);
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Add user message to storage
    addUserMessage(id, content);

    // Create a readable stream for SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function sendEvent(type: string, data: any) {
          const message = `data: ${JSON.stringify({ type, ...data })}\n\n`;
          controller.enqueue(encoder.encode(message));
        }

        try {
          // Stage 1: Collect responses
          sendEvent('stage1_start', {});
          const stage1Results = await stage1CollectResponses(content);
          sendEvent('stage1_complete', { data: stage1Results });

          // Stage 2: Collect rankings
          sendEvent('stage2_start', {});
          const [stage2Results, labelToModel] = await stage2CollectRankings(
            content,
            stage1Results
          );
          const aggregateRankings = calculateAggregateRankings(
            stage2Results,
            labelToModel
          );
          sendEvent('stage2_complete', {
            data: stage2Results,
            metadata: {
              label_to_model: labelToModel,
              aggregate_rankings: aggregateRankings,
            },
          });

          // Stage 3: Synthesize final
          sendEvent('stage3_start', {});
          const stage3Result = await stage3SynthesizeFinal(
            content,
            stage1Results,
            stage2Results
          );
          sendEvent('stage3_complete', { data: stage3Result });

          // Save assistant message
          addAssistantMessage(id, stage1Results, stage2Results, stage3Result);

          // Generate and update title if this is the first message
          if (conversation.messages.length === 0) {
            const title = await generateConversationTitle(content);
            updateConversationTitle(id, title);
            sendEvent('title_complete', { title });
          }

          // Send completion event
          sendEvent('complete', {});

          // Close the stream
          controller.close();
        } catch (error) {
          console.error('Error processing message:', error);
          sendEvent('error', {
            message: error instanceof Error ? error.message : 'Unknown error',
          });
          controller.close();
        }
      },
    });

    // Return the stream as SSE
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in stream route:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
