/**
 * Shared type definitions for conversations and messages.
 */

export interface Attachment {
    key: string;
    url: string;
    filename: string;
    contentType: string;
    size: number;
}

export interface ConversationAttachment extends Attachment {
    id: string;
    conversationId: string;
    createdAt: string;
}

export interface Message {
    role: "user" | "assistant";
    content?: string;
    attachments?: Attachment[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stage1?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stage2?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stage3?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata?: any;
    // Single model response (for single mode)
    singleResponse?: { model: string; response: string };
    streaming?: {
        stage1?: Record<string, string>;
        stage2?: Record<string, string>;
        stage3?: string;
        single?: string; // Single model streaming
    };
    loading?: {
        stage1?: boolean;
        stage2?: boolean;
        stage3?: boolean;
        preprocessing?: boolean; // Preprocessing indicator
        single?: boolean; // Single model loading
    };
}

export interface Conversation {
    id: string;
    created_at: string;
    title: string;
    message_count: number;
    messages?: Message[];
}

export interface ConversationDetail extends Conversation {
    messages: Message[];
}

export interface StageData {
    model: string;
    response?: string;
    ranking?: string;
    parsed_ranking?: string[];
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
