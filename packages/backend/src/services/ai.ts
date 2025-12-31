import OpenAI from 'openai';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

// Types for AI interactions
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface AIContext {
  type: 'client' | 'project' | 'estimate' | 'invoice' | 'general';
  data?: Record<string, unknown>;
}

// System prompts for different contexts
const SYSTEM_PROMPTS: Record<string, string> = {
  client: `You are an AI assistant for S&G Portal, a business management application for Spades & Ghosts Design LLC.
You help users manage client relationships. You can:
- Draft professional emails to clients
- Suggest follow-up actions
- Analyze client activity and engagement
- Provide insights on client value and history
- Help with client communication strategies

Keep responses concise and professional. When drafting emails, match the tone appropriate for business communication.`,

  project: `You are an AI assistant for S&G Portal, a business management application for Spades & Ghosts Design LLC.
You help users manage projects effectively. You can:
- Suggest task breakdowns for projects
- Estimate timelines based on scope
- Identify potential risks and bottlenecks
- Draft project updates for clients
- Recommend resource allocation
- Help prioritize tasks

Keep responses actionable and focused on project success.`,

  estimate: `You are an AI assistant for S&G Portal, a business management application for Spades & Ghosts Design LLC.
You help users create professional estimates. You can:
- Suggest pricing based on scope
- Draft professional estimate descriptions
- Recommend line items for common services
- Calculate project costs
- Suggest terms and conditions
- Help with competitive pricing strategies

Focus on helping create accurate, professional estimates that win business.`,

  invoice: `You are an AI assistant for S&G Portal, a business management application for Spades & Ghosts Design LLC.
You help users manage invoicing and payments. You can:
- Draft payment reminder emails
- Suggest follow-up strategies for overdue invoices
- Analyze payment patterns
- Help with invoice descriptions
- Provide collection advice
- Draft professional but firm payment requests

Keep responses professional while being effective at securing payment.`,

  general: `You are an AI assistant for S&G Portal, a business management application for Spades & Ghosts Design LLC.
You help users with general business tasks and questions. You can:
- Answer questions about the portal features
- Provide business advice
- Help with general communications
- Assist with data analysis
- Suggest workflow improvements

Be helpful, professional, and concise.`,
};

// Get system prompt based on context
function getSystemPrompt(context: AIContext): string {
  let prompt = SYSTEM_PROMPTS[context.type] || SYSTEM_PROMPTS.general;
  
  // Add context data if available
  if (context.data) {
    prompt += '\n\nContext data for this conversation:\n';
    prompt += JSON.stringify(context.data, null, 2);
  }
  
  return prompt;
}

// Main chat completion function
export async function chat(
  messages: AIMessage[],
  context: AIContext,
  options: AICompletionOptions = {}
): Promise<string> {
  const {
    model = env.OPENAI_MODEL || 'gpt-4-turbo-preview',
    temperature = 0.7,
    maxTokens = 1000,
  } = options;

  try {
    const systemPrompt = getSystemPrompt(context);
    
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature,
      max_tokens: maxTokens,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    logger.debug('AI chat completion', {
      context: context.type,
      model,
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens,
    });

    return content;
  } catch (error) {
    logger.error('AI chat error', { error, context: context.type });
    throw error;
  }
}

// Streaming chat completion
export async function* streamChat(
  messages: AIMessage[],
  context: AIContext,
  options: AICompletionOptions = {}
): AsyncGenerator<string, void, unknown> {
  const {
    model = env.OPENAI_MODEL || 'gpt-4-turbo-preview',
    temperature = 0.7,
    maxTokens = 1000,
  } = options;

  try {
    const systemPrompt = getSystemPrompt(context);
    
    const stream = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  } catch (error) {
    logger.error('AI stream error', { error, context: context.type });
    throw error;
  }
}

// Quick action helpers
export async function draftEmail(
  context: AIContext,
  purpose: string,
  tone: 'formal' | 'friendly' | 'firm' = 'formal'
): Promise<string> {
  const messages: AIMessage[] = [
    {
      role: 'user',
      content: `Draft a ${tone} email for the following purpose: ${purpose}\n\nProvide just the email content (subject line and body), ready to send.`,
    },
  ];
  
  return chat(messages, context);
}

export async function suggestActions(context: AIContext): Promise<string[]> {
  const messages: AIMessage[] = [
    {
      role: 'user',
      content: 'Based on the current context, suggest 3-5 actionable next steps. Return them as a JSON array of strings.',
    },
  ];
  
  const response = await chat(messages, context);
  
  try {
    // Try to parse as JSON
    const parsed = JSON.parse(response);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // If not valid JSON, split by newlines
    return response.split('\n').filter(line => line.trim());
  }
  
  return [response];
}

export async function analyzeData(
  context: AIContext,
  question: string
): Promise<string> {
  const messages: AIMessage[] = [
    {
      role: 'user',
      content: `Analyze the provided data and answer: ${question}`,
    },
  ];
  
  return chat(messages, context);
}

export async function generateDescription(
  context: AIContext,
  itemType: string,
  details: string
): Promise<string> {
  const messages: AIMessage[] = [
    {
      role: 'user',
      content: `Generate a professional description for a ${itemType}. Details: ${details}\n\nProvide just the description text, ready to use.`,
    },
  ];
  
  return chat(messages, context);
}

// Export the service
export const aiService = {
  chat,
  streamChat,
  draftEmail,
  suggestActions,
  analyzeData,
  generateDescription,
};

export default aiService;
