import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  Mail, 
  Lightbulb, 
  FileText, 
  AlertCircle,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { 
  useAIChat, 
  useDraftClientFollowup, 
  useDraftInvoiceReminder, 
  useImproveEstimate, 
  useProjectNextSteps,
  AIMessage,
  AIContext,
} from '../../services/api/ai';

interface AIAssistantProps {
  context: AIContext;
  entityName?: string;
  className?: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const QUICK_ACTIONS: Record<AIContext['type'], QuickAction[]> = {
  client: [
    { id: 'followup', label: 'Draft Follow-up', icon: <Mail className="w-4 h-4" />, description: 'Create a follow-up email' },
    { id: 'suggest', label: 'Suggest Actions', icon: <Lightbulb className="w-4 h-4" />, description: 'Get recommended next steps' },
  ],
  project: [
    { id: 'nextsteps', label: 'Next Steps', icon: <Lightbulb className="w-4 h-4" />, description: 'Suggest next steps for project' },
    { id: 'update', label: 'Draft Update', icon: <Mail className="w-4 h-4" />, description: 'Create a status update email' },
  ],
  estimate: [
    { id: 'improve', label: 'Improve Estimate', icon: <Sparkles className="w-4 h-4" />, description: 'Get suggestions to improve' },
    { id: 'description', label: 'Generate Description', icon: <FileText className="w-4 h-4" />, description: 'Create line item descriptions' },
  ],
  invoice: [
    { id: 'reminder-gentle', label: 'Gentle Reminder', icon: <Mail className="w-4 h-4" />, description: 'Friendly payment reminder' },
    { id: 'reminder-firm', label: 'Firm Reminder', icon: <Mail className="w-4 h-4" />, description: 'Formal payment reminder' },
    { id: 'reminder-final', label: 'Final Notice', icon: <AlertCircle className="w-4 h-4" />, description: 'Final payment notice' },
  ],
  general: [
    { id: 'help', label: 'Get Help', icon: <Lightbulb className="w-4 h-4" />, description: 'Ask for assistance' },
  ],
};

export function AIAssistant({ context, entityName, className }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatMutation = useAIChat();
  const clientFollowupMutation = useDraftClientFollowup();
  const invoiceReminderMutation = useDraftInvoiceReminder();
  const improveEstimateMutation = useImproveEstimate();
  const projectNextStepsMutation = useProjectNextSteps();

  const isLoading = chatMutation.isPending || 
    clientFollowupMutation.isPending || 
    invoiceReminderMutation.isPending || 
    improveEstimateMutation.isPending ||
    projectNextStepsMutation.isPending;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: AIMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const response = await chatMutation.mutateAsync({
        messages: [...messages, userMessage],
        context,
      });

      const assistantMessage: AIMessage = { role: 'assistant', content: response.response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: AIMessage = { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleQuickAction = async (actionId: string) => {
    if (!context.entityId) return;

    let response: string;
    
    try {
      switch (actionId) {
        case 'followup': {
          const result = await clientFollowupMutation.mutateAsync({ clientId: context.entityId });
          response = result.email;
          break;
        }
        case 'reminder-gentle': {
          const result = await invoiceReminderMutation.mutateAsync({ invoiceId: context.entityId, urgency: 'gentle' });
          response = result.email;
          break;
        }
        case 'reminder-firm': {
          const result = await invoiceReminderMutation.mutateAsync({ invoiceId: context.entityId, urgency: 'firm' });
          response = result.email;
          break;
        }
        case 'reminder-final': {
          const result = await invoiceReminderMutation.mutateAsync({ invoiceId: context.entityId, urgency: 'final' });
          response = result.email;
          break;
        }
        case 'improve': {
          const result = await improveEstimateMutation.mutateAsync(context.entityId);
          response = result.suggestions;
          break;
        }
        case 'nextsteps': {
          const result = await projectNextStepsMutation.mutateAsync(context.entityId);
          response = result.actions.join('\n');
          break;
        }
        default:
          response = 'Action not implemented yet.';
      }

      const assistantMessage: AIMessage = { role: 'assistant', content: response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: AIMessage = { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error performing that action.' 
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickActions = QUICK_ACTIONS[context.type] || QUICK_ACTIONS.general;

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className={clsx(
          'fixed bottom-6 right-6 z-40',
          'w-14 h-14 rounded-full',
          'bg-gradient-to-r from-primary-500 to-primary-600',
          'text-white shadow-lg shadow-primary-500/25',
          'flex items-center justify-center',
          'hover:from-primary-600 hover:to-primary-700',
          'transition-all duration-200',
          isOpen && 'opacity-0 pointer-events-none',
          className
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Bot className="w-6 h-6" />
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={clsx(
              'fixed bottom-6 right-6 z-50',
              'w-[400px] h-[600px]',
              'bg-white dark:bg-slate-800',
              'rounded-2xl shadow-2xl',
              'border border-slate-200 dark:border-slate-700',
              'flex flex-col overflow-hidden'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-primary-500 to-primary-600">
              <div className="flex items-center gap-3 text-white">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">AI Assistant</h3>
                  {entityName && (
                    <p className="text-xs text-white/80">{entityName}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions */}
            {messages.length === 0 && (
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Quick Actions</p>
                <div className="flex flex-wrap gap-2">
                  {quickActions.map(action => (
                    <button
                      key={action.id}
                      onClick={() => handleQuickAction(action.id)}
                      disabled={isLoading || !context.entityId}
                      className={clsx(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                        'bg-slate-100 dark:bg-slate-700',
                        'text-slate-700 dark:text-slate-200',
                        'hover:bg-slate-200 dark:hover:bg-slate-600',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        'transition-colors'
                      )}
                    >
                      {action.icon}
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
                  <Sparkles className="w-12 h-12 mb-3" />
                  <p className="text-center">
                    Ask me anything about this {context.type}!
                  </p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={clsx(
                      'flex',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={clsx(
                        'max-w-[85%] rounded-2xl px-4 py-3 relative group',
                        message.role === 'user'
                          ? 'bg-primary-500 text-white rounded-br-md'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-md'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      
                      {/* Copy button for assistant messages */}
                      {message.role === 'assistant' && (
                        <button
                          onClick={() => copyToClipboard(message.content, `msg-${index}`)}
                          className={clsx(
                            'absolute -right-2 -top-2 w-7 h-7 rounded-full',
                            'bg-white dark:bg-slate-600 shadow-md',
                            'flex items-center justify-center',
                            'opacity-0 group-hover:opacity-100 transition-opacity',
                            'text-slate-500 dark:text-slate-300 hover:text-slate-700'
                          )}
                        >
                          {copiedId === `msg-${index}` ? (
                            <Check className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-bl-md px-4 py-3">
                    <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Ask anything..."
                  disabled={isLoading}
                  className={clsx(
                    'flex-1 px-4 py-2 rounded-xl',
                    'bg-slate-100 dark:bg-slate-700',
                    'border-0 outline-none',
                    'text-slate-800 dark:text-slate-200',
                    'placeholder-slate-400 dark:placeholder-slate-500',
                    'focus:ring-2 focus:ring-primary-500',
                    'disabled:opacity-50'
                  )}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={clsx(
                    'w-10 h-10 rounded-xl',
                    'bg-primary-500 text-white',
                    'flex items-center justify-center',
                    'hover:bg-primary-600',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'transition-colors'
                  )}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default AIAssistant;
