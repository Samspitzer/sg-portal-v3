import { useMutation } from '@tanstack/react-query';
import { api } from './client';

// Types
export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIContext {
  type: 'client' | 'project' | 'estimate' | 'invoice' | 'general';
  entityId?: string;
}

export interface ChatRequest {
  messages: AIMessage[];
  context: AIContext;
  options?: {
    temperature?: number;
    maxTokens?: number;
  };
}

export interface ChatResponse {
  response: string;
}

export interface DraftEmailRequest {
  context: {
    type: 'client' | 'project' | 'estimate' | 'invoice';
    entityId: string;
  };
  purpose: string;
  tone?: 'formal' | 'friendly' | 'firm';
}

export interface SuggestActionsRequest {
  context: {
    type: 'client' | 'project' | 'estimate' | 'invoice';
    entityId: string;
  };
}

export interface GenerateDescriptionRequest {
  context: {
    type: 'estimate' | 'invoice' | 'project';
    entityId?: string;
  };
  itemType: string;
  details: string;
}

// API functions
async function chat(request: ChatRequest): Promise<ChatResponse> {
  const response = await api.post<ChatResponse>('/api/ai/chat', request);
  if (!response.data) throw new Error('No response data');
  return response.data;
}

async function draftEmail(request: DraftEmailRequest): Promise<{ email: string }> {
  const response = await api.post<{ email: string }>('/api/ai/draft-email', request);
  if (!response.data) throw new Error('No response data');
  return response.data;
}

async function suggestActions(request: SuggestActionsRequest): Promise<{ actions: string[] }> {
  const response = await api.post<{ actions: string[] }>('/api/ai/suggest-actions', request);
  if (!response.data) throw new Error('No response data');
  return response.data;
}

async function generateDescription(request: GenerateDescriptionRequest): Promise<{ description: string }> {
  const response = await api.post<{ description: string }>('/api/ai/generate-description', request);
  if (!response.data) throw new Error('No response data');
  return response.data;
}

// Quick action API functions
async function draftClientFollowup(clientId: string, purpose?: string): Promise<{ email: string }> {
  const response = await api.post<{ email: string }>(`/api/ai/client/${clientId}/draft-followup`, { purpose });
  if (!response.data) throw new Error('No response data');
  return response.data;
}

async function draftInvoiceReminder(invoiceId: string, urgency?: 'gentle' | 'firm' | 'final'): Promise<{ email: string }> {
  const response = await api.post<{ email: string }>(`/api/ai/invoice/${invoiceId}/draft-reminder`, { urgency });
  if (!response.data) throw new Error('No response data');
  return response.data;
}

async function improveEstimate(estimateId: string): Promise<{ suggestions: string }> {
  const response = await api.post<{ suggestions: string }>(`/api/ai/estimate/${estimateId}/improve`, {});
  if (!response.data) throw new Error('No response data');
  return response.data;
}

async function getProjectNextSteps(projectId: string): Promise<{ actions: string[] }> {
  const response = await api.post<{ actions: string[] }>(`/api/ai/project/${projectId}/next-steps`, {});
  if (!response.data) throw new Error('No response data');
  return response.data;
}

// React Query hooks

/**
 * Hook for AI chat conversations
 */
export function useAIChat() {
  return useMutation({
    mutationFn: chat,
  });
}

/**
 * Hook for drafting emails
 */
export function useDraftEmail() {
  return useMutation({
    mutationFn: draftEmail,
  });
}

/**
 * Hook for suggesting actions
 */
export function useSuggestActions() {
  return useMutation({
    mutationFn: suggestActions,
  });
}

/**
 * Hook for generating descriptions
 */
export function useGenerateDescription() {
  return useMutation({
    mutationFn: generateDescription,
  });
}

// Quick action hooks

/**
 * Hook for drafting client follow-up emails
 */
export function useDraftClientFollowup() {
  return useMutation({
    mutationFn: ({ clientId, purpose }: { clientId: string; purpose?: string }) =>
      draftClientFollowup(clientId, purpose),
  });
}

/**
 * Hook for drafting invoice payment reminders
 */
export function useDraftInvoiceReminder() {
  return useMutation({
    mutationFn: ({ invoiceId, urgency }: { invoiceId: string; urgency?: 'gentle' | 'firm' | 'final' }) =>
      draftInvoiceReminder(invoiceId, urgency),
  });
}

/**
 * Hook for getting estimate improvement suggestions
 */
export function useImproveEstimate() {
  return useMutation({
    mutationFn: (estimateId: string) => improveEstimate(estimateId),
  });
}

/**
 * Hook for getting project next steps
 */
export function useProjectNextSteps() {
  return useMutation({
    mutationFn: (projectId: string) => getProjectNextSteps(projectId),
  });
}

// Streaming chat hook (for real-time responses)
export function useStreamingChat() {
  return useMutation({
    mutationFn: async (request: ChatRequest & { onChunk: (chunk: string) => void }) => {
      const { onChunk, ...chatRequest } = request;
      
      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('internal_token') || sessionStorage.getItem('azure_token')}`,
        },
        body: JSON.stringify(chatRequest),
      });

      if (!response.ok) {
        throw new Error('Stream request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.chunk) {
                fullResponse += data.chunk;
                onChunk(data.chunk);
              }
            } catch {
              // Ignore parsing errors
            }
          }
        }
      }

      return fullResponse;
    },
  });
}

// Export the AI service
export const aiService = {
  chat,
  draftEmail,
  suggestActions,
  generateDescription,
  draftClientFollowup,
  draftInvoiceReminder,
  improveEstimate,
  getProjectNextSteps,
};

export default aiService;
