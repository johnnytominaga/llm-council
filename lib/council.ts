/**
 * 3-stage LLM Council orchestration.
 */

import { queryModelsParallel, queryModel, queryModelStream, Message, MessageContent, StreamChunk } from './openrouter';
import { COUNCIL_MODELS, CHAIRMAN_MODEL } from './config';
import { getConversation, getConversationAttachments } from './storage-adapter';
import { CustomPrompts, fillPromptTemplate, getEffectivePrompt } from './prompt-templates';

/**
 * Helper function to build message content with attachments for OpenRouter.
 */
export function buildMessageContent(text: string, attachments?: any[]): MessageContent {
  if (!attachments || attachments.length === 0) {
    return text;
  }

  const contentParts: any[] = [];

  // Add text content if present
  if (text) {
    contentParts.push({ type: 'text', text });
  }

  // Add each attachment in OpenRouter format
  for (const attachment of attachments) {
    // Skip attachments with invalid URLs (local paths, empty, etc.)
    if (!attachment.url ||
        attachment.url.startsWith('/mnt/') ||
        attachment.url.startsWith('file://') ||
        !attachment.url.startsWith('http')) {
      console.warn('Skipping invalid attachment URL:', {
        filename: attachment.filename,
        url: attachment.url,
      });
      continue;
    }

    console.log('Building message content with attachment:', {
      filename: attachment.filename,
      contentType: attachment.contentType,
      url: attachment.url.substring(0, 100) + '...',
    });

    if (attachment.contentType.startsWith('image/')) {
      // Image attachment
      contentParts.push({
        type: 'image_url',
        image_url: { url: attachment.url },
      });
    } else if (attachment.contentType === 'application/pdf') {
      // PDF attachment
      contentParts.push({
        type: 'file',
        file: {
          type: 'application/pdf',
          url: attachment.url,
        },
      });
    }
  }

  console.log('Built content parts:', JSON.stringify(contentParts, null, 2));
  return contentParts;
}

export interface Stage1Result {
  model: string;
  response: string;
}

export interface Stage2Result {
  model: string;
  ranking: string;
  parsed_ranking: string[];
}

export interface Stage3Result {
  model: string;
  response: string;
}

export interface Metadata {
  label_to_model: Record<string, string>;
  aggregate_rankings: AggregateRanking[];
}

export interface AggregateRanking {
  model: string;
  average_rank: number;
  rankings_count: number;
}

export async function stage1CollectResponses(userQuery: string): Promise<Stage1Result[]> {
  /**
   * Stage 1: Collect individual responses from all council models.
   *
   * Args:
   *   userQuery: The user's question
   *
   * Returns:
   *   List of objects with 'model' and 'response' keys
   */
  const messages: Message[] = [{ role: 'user', content: userQuery }];

  // Query all models in parallel
  const responses = await queryModelsParallel(COUNCIL_MODELS, messages);

  // Format results
  const stage1Results: Stage1Result[] = [];
  for (const [model, response] of Object.entries(responses)) {
    if (response !== null) {
      // Only include successful responses
      stage1Results.push({
        model,
        response: response.content || '',
      });
    }
  }

  return stage1Results;
}

export async function stage2CollectRankings(
  userQuery: string,
  stage1Results: Stage1Result[]
): Promise<[Stage2Result[], Record<string, string>]> {
  /**
   * Stage 2: Each model ranks the anonymized responses.
   *
   * Args:
   *   userQuery: The original user query
   *   stage1Results: Results from Stage 1
   *
   * Returns:
   *   Tuple of (rankings list, label_to_model mapping)
   */
  // Create anonymized labels for responses (Response A, Response B, etc.)
  const labels = stage1Results.map((_, i) => String.fromCharCode(65 + i)); // A, B, C, ...

  // Create mapping from label to model name
  const labelToModel: Record<string, string> = {};
  labels.forEach((label, index) => {
    labelToModel[`Response ${label}`] = stage1Results[index].model;
  });

  // Build the ranking prompt
  const responsesText = stage1Results
    .map((result, index) => `Response ${labels[index]}:\n${result.response}`)
    .join('\n\n');

  const rankingPrompt = `You are evaluating different responses to the following question:

Question: ${userQuery}

Here are the responses from different models (anonymized):

${responsesText}

Your task:
1. First, evaluate each response individually. For each response, explain what it does well and what it does poorly.
2. Then, at the very end of your response, provide a final ranking.

IMPORTANT: Your final ranking MUST be formatted EXACTLY as follows:
- Start with the line "FINAL RANKING:" (all caps, with colon)
- Then list the responses from best to worst as a numbered list
- Each line should be: number, period, space, then ONLY the response label (e.g., "1. Response A")
- Do not add any other text or explanations in the ranking section

Example of the correct format for your ENTIRE response:

Response A provides good detail on X but misses Y...
Response B is accurate but lacks depth on Z...
Response C offers the most comprehensive answer...

FINAL RANKING:
1. Response C
2. Response A
3. Response B

Now provide your evaluation and ranking:`;

  const messages: Message[] = [{ role: 'user', content: rankingPrompt }];

  // Get rankings from all council models in parallel
  const responses = await queryModelsParallel(COUNCIL_MODELS, messages);

  // Format results
  const stage2Results: Stage2Result[] = [];
  for (const [model, response] of Object.entries(responses)) {
    if (response !== null) {
      const fullText = response.content || '';
      const parsed = parseRankingFromText(fullText);
      stage2Results.push({
        model,
        ranking: fullText,
        parsed_ranking: parsed,
      });
    }
  }

  return [stage2Results, labelToModel];
}

export async function stage3SynthesizeFinal(
  userQuery: string,
  stage1Results: Stage1Result[],
  stage2Results: Stage2Result[]
): Promise<Stage3Result> {
  /**
   * Stage 3: Chairman synthesizes final response.
   *
   * Args:
   *   userQuery: The original user query
   *   stage1Results: Individual model responses from Stage 1
   *   stage2Results: Rankings from Stage 2
   *
   * Returns:
   *   Object with 'model' and 'response' keys
   */
  // Build comprehensive context for chairman
  const stage1Text = stage1Results
    .map((result) => `Model: ${result.model}\nResponse: ${result.response}`)
    .join('\n\n');

  const stage2Text = stage2Results
    .map((result) => `Model: ${result.model}\nRanking: ${result.ranking}`)
    .join('\n\n');

  const chairmanPrompt = `You are the Chairman of an LLM Council. Multiple AI models have provided responses to a user's question, and then ranked each other's responses.

Original Question: ${userQuery}

STAGE 1 - Individual Responses:
${stage1Text}

STAGE 2 - Peer Rankings:
${stage2Text}

Your task as Chairman is to synthesize all of this information into a single, comprehensive, accurate answer to the user's original question. Consider:
- The individual responses and their insights
- The peer rankings and what they reveal about response quality
- Any patterns of agreement or disagreement

Provide a clear, well-reasoned final answer that represents the council's collective wisdom:`;

  const messages: Message[] = [{ role: 'user', content: chairmanPrompt }];

  // Query the chairman model
  const response = await queryModel(CHAIRMAN_MODEL, messages);

  if (response === null) {
    // Fallback if chairman fails
    return {
      model: CHAIRMAN_MODEL,
      response: 'Error: Unable to generate final synthesis.',
    };
  }

  return {
    model: CHAIRMAN_MODEL,
    response: response.content || '',
  };
}

export function parseRankingFromText(rankingText: string): string[] {
  /**
   * Parse the FINAL RANKING section from the model's response.
   *
   * Args:
   *   rankingText: The full text response from the model
   *
   * Returns:
   *   List of response labels in ranked order
   */
  // Look for "FINAL RANKING:" section
  if (rankingText.includes('FINAL RANKING:')) {
    // Extract everything after "FINAL RANKING:"
    const parts = rankingText.split('FINAL RANKING:');
    if (parts.length >= 2) {
      const rankingSection = parts[1];
      // Try to extract numbered list format (e.g., "1. Response A")
      // This pattern looks for: number, period, optional space, "Response X"
      const numberedMatches = rankingSection.match(/\d+\.\s*Response [A-Z]/g);
      if (numberedMatches) {
        // Extract just the "Response X" part
        return numberedMatches.map((m) => {
          const match = m.match(/Response [A-Z]/);
          return match ? match[0] : '';
        }).filter(Boolean);
      }

      // Fallback: Extract all "Response X" patterns in order
      const matches = rankingSection.match(/Response [A-Z]/g);
      return matches || [];
    }
  }

  // Fallback: try to find any "Response X" patterns in order
  const matches = rankingText.match(/Response [A-Z]/g);
  return matches || [];
}

export function calculateAggregateRankings(
  stage2Results: Stage2Result[],
  labelToModel: Record<string, string>
): AggregateRanking[] {
  /**
   * Calculate aggregate rankings across all models.
   *
   * Args:
   *   stage2Results: Rankings from each model
   *   labelToModel: Mapping from anonymous labels to model names
   *
   * Returns:
   *   List of objects with model name and average rank, sorted best to worst
   */
  // Track positions for each model
  const modelPositions: Record<string, number[]> = {};

  for (const ranking of stage2Results) {
    // Parse the ranking from the structured format
    const parsedRanking = parseRankingFromText(ranking.ranking);

    parsedRanking.forEach((label, index) => {
      const position = index + 1;
      if (label in labelToModel) {
        const modelName = labelToModel[label];
        if (!modelPositions[modelName]) {
          modelPositions[modelName] = [];
        }
        modelPositions[modelName].push(position);
      }
    });
  }

  // Calculate average position for each model
  const aggregate: AggregateRanking[] = [];
  for (const [model, positions] of Object.entries(modelPositions)) {
    if (positions.length > 0) {
      const avgRank = positions.reduce((a, b) => a + b, 0) / positions.length;
      aggregate.push({
        model,
        average_rank: Math.round(avgRank * 100) / 100,
        rankings_count: positions.length,
      });
    }
  }

  // Sort by average rank (lower is better)
  aggregate.sort((a, b) => a.average_rank - b.average_rank);

  return aggregate;
}

export async function generateConversationTitle(userQuery: string): Promise<string> {
  /**
   * Generate a short title for a conversation based on the first user message.
   *
   * Args:
   *   userQuery: The first user message
   *
   * Returns:
   *   A short title (3-5 words)
   */
  const titlePrompt = `Generate a very short title (3-5 words maximum) that summarizes the following question.
The title should be concise and descriptive. Do not use quotes or punctuation in the title.

Question: ${userQuery}

Title:`;

  const messages: Message[] = [{ role: 'user', content: titlePrompt }];

  // Use a free model for title generation
  const response = await queryModel('meta-llama/llama-3.2-3b-instruct:free', messages, 30000);

  if (response === null) {
    // Fallback to a generic title
    return 'New Conversation';
  }

  let title = (response.content || 'New Conversation').trim();

  // Clean up the title - remove quotes, limit length
  title = title.replace(/^["']|["']$/g, '');

  // Truncate if too long
  if (title.length > 50) {
    title = title.substring(0, 47) + '...';
  }

  return title;
}

export async function preprocessConversationHistory(
  conversationId: string,
  userId: string,
  preprocessModel: string,
  currentMessage: string,
  attachments?: any[],
  customPrompts?: CustomPrompts | null
): Promise<string> {
  /**
   * Preprocess conversation history and attachments before sending to council.
   * Creates a comprehensive context summary using a preprocessing model.
   *
   * Args:
   *   conversationId: Conversation identifier
   *   userId: User ID to scope conversation to user
   *   preprocessModel: Model ID to use for preprocessing
   *   currentMessage: The current user message
   *   attachments: Optional current message attachments
   *   customPrompts: Optional custom prompts to use
   *
   * Returns:
   *   Enhanced message with conversation context, or original message if preprocessing fails
   */
  try {
    // Load full conversation history
    const conversation = await getConversation(conversationId, userId);

    if (!conversation) {
      console.warn('Conversation not found for preprocessing, using original message');
      return currentMessage;
    }

    // Load conversation-level attachments
    const conversationAttachments = await getConversationAttachments(conversationId, userId);

    // Build conversation history text
    let conversationHistoryText = '';
    for (const msg of conversation.messages) {
      if (msg.role === 'user') {
        conversationHistoryText += `\nUser: ${msg.content || ''}`;
        if (msg.attachments && msg.attachments.length > 0) {
          conversationHistoryText += `\n[User included ${msg.attachments.length} attachment(s): ${msg.attachments.map((a: any) => a.filename).join(', ')}]`;
        }
      } else if (msg.role === 'assistant') {
        // For assistant messages, use stage3 if available (final synthesis), otherwise use stage1
        if (msg.stage3) {
          conversationHistoryText += `\nAssistant: ${msg.stage3.response || ''}`;
        } else if (msg.stage1 && msg.stage1.length > 0) {
          conversationHistoryText += `\nAssistant: ${msg.stage1[0].response || ''}`;
        }
      }
    }

    // Build conversation attachments text
    let conversationAttachmentsText = '';
    if (conversationAttachments.length > 0) {
      conversationAttachmentsText = `CONVERSATION ATTACHMENTS:
The user has uploaded ${conversationAttachments.length} file(s) for this conversation:
${conversationAttachments.map((a) => `- ${a.filename} (${a.contentType})`).join('\n')}`;
    }

    // Build current attachments text
    let currentAttachmentsText = '';
    if (attachments && attachments.length > 0) {
      currentAttachmentsText = `CURRENT MESSAGE ATTACHMENTS:
${attachments.map((a) => `- ${a.filename} (${a.contentType})`).join('\n')}`;
    }

    // Get the effective prompt (custom or default)
    const promptTemplate = getEffectivePrompt('preprocessing', customPrompts);

    // Fill template with variables
    const contextPrompt = fillPromptTemplate(promptTemplate, {
      conversationHistory: conversationHistoryText,
      currentMessage,
      conversationAttachments: conversationAttachmentsText,
      currentAttachments: currentAttachmentsText,
    });

    // Query preprocessing model with 60s timeout
    const messages: Message[] = [{ role: 'user', content: contextPrompt }];
    const response = await queryModel(preprocessModel, messages, 60000);

    if (response === null) {
      console.warn('Preprocessing failed, using original message');
      return currentMessage;
    }

    const enhancedMessage = response.content || currentMessage;

    console.log('Preprocessing successful:', {
      originalLength: currentMessage.length,
      enhancedLength: enhancedMessage.length,
      historyMessages: conversation.messages.length,
      conversationAttachments: conversationAttachments.length,
    });

    return enhancedMessage;
  } catch (error) {
    console.error('Error during preprocessing:', error);
    // Fallback to original message on any error
    return currentMessage;
  }
}

export async function runFullCouncil(
  userQuery: string
): Promise<[Stage1Result[], Stage2Result[], Stage3Result, Metadata]> {
  /**
   * Run the complete 3-stage council process.
   *
   * Args:
   *   userQuery: The user's question
   *
   * Returns:
   *   Tuple of (stage1_results, stage2_results, stage3_result, metadata)
   */
  // Stage 1: Collect individual responses
  const stage1Results = await stage1CollectResponses(userQuery);

  // If no models responded successfully, return error
  if (stage1Results.length === 0) {
    return [
      [],
      [],
      {
        model: 'error',
        response: 'All models failed to respond. Please try again.',
      },
      { label_to_model: {}, aggregate_rankings: [] },
    ];
  }

  // Stage 2: Collect rankings
  const [stage2Results, labelToModel] = await stage2CollectRankings(userQuery, stage1Results);

  // Calculate aggregate rankings
  const aggregateRankings = calculateAggregateRankings(stage2Results, labelToModel);

  // Stage 3: Synthesize final answer
  const stage3Result = await stage3SynthesizeFinal(userQuery, stage1Results, stage2Results);

  // Prepare metadata
  const metadata: Metadata = {
    label_to_model: labelToModel,
    aggregate_rankings: aggregateRankings,
  };

  return [stage1Results, stage2Results, stage3Result, metadata];
}

// ============================================================================
// STREAMING VERSIONS
// ============================================================================

export interface StreamCallbacks {
  onStage1Chunk?: (model: string, chunk: string) => void;
  onStage2Chunk?: (model: string, chunk: string) => void;
  onStage3Chunk?: (chunk: string) => void;
}

export async function stage1CollectResponsesStream(
  userQuery: string,
  councilModels: string[],
  onChunk: (model: string, chunk: string) => void,
  attachments?: any[],
  customPrompts?: CustomPrompts | null
): Promise<Stage1Result[]> {
  /**
   * Stage 1 with streaming: Collect individual responses from all council models.
   * Calls onChunk for each text chunk received from any model.
   */
  // Get the effective prompt (custom or default)
  const promptTemplate = getEffectivePrompt('stage1', customPrompts);

  // Fill template with variables
  const promptText = fillPromptTemplate(promptTemplate, {
    question: userQuery,
  });

  const messages: Message[] = [{
    role: 'user',
    content: buildMessageContent(promptText, attachments)
  }];

  // Query all models in parallel with streaming
  const promises = councilModels.map(async (model) => {
    const response = await queryModelStream(model, messages, (streamChunk) => {
      if (!streamChunk.done && streamChunk.content) {
        onChunk(model, streamChunk.content);
      }
    });

    if (response !== null) {
      return {
        model,
        response: response.content || '',
      };
    }
    return null;
  });

  const results = await Promise.all(promises);

  // Filter out null results (failed models)
  return results.filter((r): r is Stage1Result => r !== null);
}

export async function stage2CollectRankingsStream(
  userQuery: string,
  stage1Results: Stage1Result[],
  councilModels: string[],
  onChunk: (model: string, chunk: string) => void,
  customPrompts?: CustomPrompts | null
): Promise<[Stage2Result[], Record<string, string>]> {
  /**
   * Stage 2 with streaming: Each model ranks the anonymized responses.
   * Calls onChunk for each text chunk received from any model.
   */
  // Create anonymized labels
  const labels = stage1Results.map((_, i) => String.fromCharCode(65 + i));

  const labelToModel: Record<string, string> = {};
  labels.forEach((label, index) => {
    labelToModel[`Response ${label}`] = stage1Results[index].model;
  });

  // Build the responses text for the template
  const responsesText = stage1Results
    .map((result, index) => `Response ${labels[index]}:\n${result.response}`)
    .join('\n\n');

  // Get the effective prompt (custom or default)
  const promptTemplate = getEffectivePrompt('stage2', customPrompts);

  // Fill template with variables
  const rankingPrompt = fillPromptTemplate(promptTemplate, {
    question: userQuery,
    responses: responsesText,
  });

  const messages: Message[] = [{ role: 'user', content: rankingPrompt }];

  // Query all models in parallel with streaming
  const promises = councilModels.map(async (model) => {
    const response = await queryModelStream(model, messages, (streamChunk) => {
      if (!streamChunk.done && streamChunk.content) {
        onChunk(model, streamChunk.content);
      }
    });

    if (response !== null) {
      return {
        model,
        ranking: response.content || '',
        parsed_ranking: parseRankingFromText(response.content || ''),
      };
    }
    return null;
  });

  const results = await Promise.all(promises);

  // Filter out null results
  const stage2Results = results.filter((r): r is Stage2Result => r !== null);

  return [stage2Results, labelToModel];
}

export async function stage3SynthesizeFinalStream(
  userQuery: string,
  stage1Results: Stage1Result[],
  stage2Results: Stage2Result[],
  chairmanModel: string,
  onChunk: (chunk: string) => void,
  customPrompts?: CustomPrompts | null
): Promise<Stage3Result> {
  /**
   * Stage 3 with streaming: Chairman synthesizes the final answer.
   * Calls onChunk for each text chunk received.
   */
  // Build context from Stage 1 and Stage 2 for template
  const stage1Text = stage1Results
    .map((r) => `Model: ${r.model}\nResponse: ${r.response}`)
    .join('\n\n');

  const rankingsText = stage2Results
    .map((r) => `Model: ${r.model}\nRanking: ${r.ranking}`)
    .join('\n\n');

  // Get the effective prompt (custom or default)
  const promptTemplate = getEffectivePrompt('stage3', customPrompts);

  // Fill template with variables
  const synthesisPrompt = fillPromptTemplate(promptTemplate, {
    question: userQuery,
    stage1Responses: stage1Text,
    rankings: rankingsText,
  });

  const messages: Message[] = [{ role: 'user', content: synthesisPrompt }];

  const response = await queryModelStream(chairmanModel, messages, (streamChunk) => {
    if (!streamChunk.done && streamChunk.content) {
      onChunk(streamChunk.content);
    }
  });

  if (response === null) {
    return {
      model: chairmanModel,
      response: 'Error: Failed to synthesize final answer.',
    };
  }

  return {
    model: chairmanModel,
    response: response.content || '',
  };
}
