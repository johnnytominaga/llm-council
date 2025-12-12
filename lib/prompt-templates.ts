/**
 * Prompt template system for customizable council prompts.
 *
 * This system allows users to customize the prompts used in each stage of the council deliberation,
 * with template variables that get replaced with actual data at runtime.
 */

export interface PromptVariables {
  // Available in all stages
  question?: string;
  conversationHistory?: string;

  // Stage 2 specific
  responses?: string;

  // Stage 3 specific
  stage1Responses?: string;
  rankings?: string;

  // Preprocessing specific
  currentMessage?: string;
  conversationAttachments?: string;
  currentAttachments?: string;
}

export interface PromptTemplate {
  name: string;
  description: string;
  template: string;
  requiredVariables: string[];
  availableVariables: string[];
}

/**
 * Default prompt templates for each stage
 */
export const DEFAULT_PROMPTS = {
  stage1: `{question}`,

  stage2: `You are evaluating different responses to the following question:

Question: {question}

Here are the responses from different models (anonymized):

{responses}

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

Now provide your evaluation and ranking:`,

  stage3: `You are the Chairman of an LLM Council. Multiple AI models have provided responses to a user's question, and then ranked each other's responses.

Original Question: {question}

STAGE 1 - Individual Responses:
{stage1Responses}

STAGE 2 - Peer Rankings:
{rankings}

Your task as Chairman is to synthesize all of this information into a single, comprehensive, accurate answer to the user's original question. Consider:
- The individual responses and their insights
- The peer rankings and what they reveal about response quality
- Any patterns of agreement or disagreement

Provide a clear, well-reasoned final answer that represents the council's collective wisdom:`,

  preprocessing: `You are a preprocessing assistant. Your task is to analyze the entire conversation history and create a comprehensive context summary that will help AI models provide better responses.

CONVERSATION HISTORY:
{conversationHistory}

{conversationAttachments}

{currentAttachments}

CURRENT USER MESSAGE:
{currentMessage}

YOUR TASK:
Provide a comprehensive summary that:
1. Identifies key topics and themes from the conversation history
2. Notes any relevant information from previous messages that helps understand the current question
3. Highlights important context from attachments if relevant
4. Creates an enhanced version of the current message that includes necessary context

Output ONLY the enhanced message that incorporates relevant context. Do not add meta-commentary or explanations.`
};

/**
 * Template metadata describing each prompt's purpose and available variables
 */
export const PROMPT_TEMPLATES: Record<string, PromptTemplate> = {
  stage1: {
    name: 'Stage 1: Individual Responses',
    description: 'The prompt sent to each council member to get their individual response. Usually just the question itself.',
    template: DEFAULT_PROMPTS.stage1,
    requiredVariables: ['question'],
    availableVariables: ['question', 'conversationHistory'],
  },
  stage2: {
    name: 'Stage 2: Peer Rankings',
    description: 'The prompt that asks each council member to evaluate and rank all the Stage 1 responses.',
    template: DEFAULT_PROMPTS.stage2,
    requiredVariables: ['question', 'responses'],
    availableVariables: ['question', 'responses', 'conversationHistory'],
  },
  stage3: {
    name: 'Stage 3: Chairman Synthesis',
    description: 'The prompt for the chairman model to synthesize all responses and rankings into a final answer.',
    template: DEFAULT_PROMPTS.stage3,
    requiredVariables: ['question', 'stage1Responses', 'rankings'],
    availableVariables: ['question', 'stage1Responses', 'rankings', 'conversationHistory'],
  },
  preprocessing: {
    name: 'Preprocessing: Context Summary',
    description: 'The prompt to summarize conversation history and provide enhanced context before the council deliberates.',
    template: DEFAULT_PROMPTS.preprocessing,
    requiredVariables: ['conversationHistory', 'currentMessage'],
    availableVariables: ['conversationHistory', 'currentMessage', 'conversationAttachments', 'currentAttachments'],
  },
};

/**
 * Validate that a prompt template includes all required variables
 */
export function validatePromptTemplate(
  template: string,
  requiredVariables: string[]
): { valid: boolean; missingVariables: string[] } {
  const missingVariables: string[] = [];

  for (const variable of requiredVariables) {
    const placeholder = `{${variable}}`;
    if (!template.includes(placeholder)) {
      missingVariables.push(variable);
    }
  }

  return {
    valid: missingVariables.length === 0,
    missingVariables,
  };
}

/**
 * Replace template variables with actual values
 */
export function fillPromptTemplate(
  template: string,
  variables: PromptVariables
): string {
  let result = template;

  // Replace each variable in the template
  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    }
  }

  // Remove any unfilled optional variables
  result = result.replace(/\{[^}]+\}/g, '').trim();

  return result;
}

/**
 * Get all custom prompts for a user (from settings)
 */
export interface CustomPrompts {
  stage1Prompt: string | null;
  stage2Prompt: string | null;
  stage3Prompt: string | null;
  preprocessPrompt: string | null;
}

/**
 * Get the effective prompt to use (custom if available, otherwise default)
 */
export function getEffectivePrompt(
  stage: 'stage1' | 'stage2' | 'stage3' | 'preprocessing',
  customPrompts?: CustomPrompts | null
): string {
  if (!customPrompts) {
    return DEFAULT_PROMPTS[stage];
  }

  const customPromptMap = {
    stage1: customPrompts.stage1Prompt,
    stage2: customPrompts.stage2Prompt,
    stage3: customPrompts.stage3Prompt,
    preprocessing: customPrompts.preprocessPrompt,
  };

  return customPromptMap[stage] || DEFAULT_PROMPTS[stage];
}
