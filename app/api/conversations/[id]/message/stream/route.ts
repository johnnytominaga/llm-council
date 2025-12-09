/**
 * API route for streaming message processing through the council.
 */

import { NextResponse } from 'next/server';
import {
  addUserMessage,
  addAssistantMessage,
  updateConversationTitle,
  getConversation,
} from '@/lib/storage-adapter';
import {
  stage1CollectResponsesStream,
  stage2CollectRankingsStream,
  stage3SynthesizeFinalStream,
  calculateAggregateRankings,
  generateConversationTitle,
  Stage1Result,
} from '@/lib/council';
import { getSession } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { userSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { COUNCIL_MODELS, CHAIRMAN_MODEL } from '@/lib/config';

// Set maximum duration for Vercel Pro/Enterprise plans
// Hobby: 10s (default), Pro: 60s, Enterprise: 900s
// Set to 300s (5 minutes) to allow for slower paid models
export const maxDuration = 300;

/**
 * Get models for a user (from settings or config defaults).
 */
async function getUserModels(userId: string): Promise<{ councilModels: string[]; chairmanModel: string }> {
  const settings = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });

  if (settings) {
    return {
      councilModels: JSON.parse(settings.councilModels),
      chairmanModel: settings.chairmanModel,
    };
  }

  // Return defaults from config
  return {
    councilModels: COUNCIL_MODELS,
    chairmanModel: CHAIRMAN_MODEL,
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's model settings
    const { councilModels, chairmanModel } = await getUserModels(userId);

    const { id } = await params;
    const { content } = await request.json();

    // Check if conversation exists
    const conversation = await getConversation(id, userId);
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Add user message to storage
    await addUserMessage(id, content, userId);

    // Create a readable stream for SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function sendEvent(type: string, data: Record<string, unknown>) {
          const message = `data: ${JSON.stringify({ type, ...data })}\n\n`;
          controller.enqueue(encoder.encode(message));
        }

        try {
          // Initialize partial results for streaming
          const stage1Partial: Record<string, string> = {};
          const stage2Partial: Record<string, string> = {};
          let stage3Partial = '';

          // Stage 1: Collect responses with streaming
          sendEvent('stage1_start', {});
          const stage1Results = await stage1CollectResponsesStream(
            content,
            councilModels,
            (model, chunk) => {
              // Accumulate chunks for each model
              if (!stage1Partial[model]) {
                stage1Partial[model] = '';
              }
              stage1Partial[model] += chunk;

              // Send streaming update
              sendEvent('stage1_chunk', {
                model,
                chunk,
                partial: stage1Partial[model],
              });
            }
          );
          sendEvent('stage1_complete', { data: stage1Results });

          // Stage 2: Collect rankings with streaming
          sendEvent('stage2_start', {});
          const [stage2Results, labelToModel] = await stage2CollectRankingsStream(
            content,
            stage1Results,
            councilModels,
            (model, chunk) => {
              // Accumulate chunks for each model
              if (!stage2Partial[model]) {
                stage2Partial[model] = '';
              }
              stage2Partial[model] += chunk;

              // Send streaming update
              sendEvent('stage2_chunk', {
                model,
                chunk,
                partial: stage2Partial[model],
              });
            }
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

          // Stage 3: Synthesize final with streaming
          sendEvent('stage3_start', {});
          const stage3Result = await stage3SynthesizeFinalStream(
            content,
            stage1Results,
            stage2Results,
            chairmanModel,
            (chunk) => {
              // Accumulate chunks
              stage3Partial += chunk;

              // Send streaming update
              sendEvent('stage3_chunk', {
                chunk,
                partial: stage3Partial,
              });
            }
          );
          sendEvent('stage3_complete', { data: stage3Result });

          // Save assistant message
          await addAssistantMessage(id, stage1Results, stage2Results, stage3Result, userId);

          // Generate and update title if this is the first message
          if (conversation.messages.length === 0) {
            const title = await generateConversationTitle(content);
            await updateConversationTitle(id, title, userId);
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
