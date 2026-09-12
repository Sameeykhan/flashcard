import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, AlertCircle, Lightbulb, Code2 } from 'lucide-react';
import { AIMessage, Card } from '../../types';
import { aiService } from '../../services/aiService';

interface AIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeCard?: Card | null;
}

export const AIPanel: React.FC<AIPanelProps> = ({ isOpen, onClose, activeCard }) => {
  const [messages, setMessages] = useState<AIMessage[]>(() => aiService.getInitialMessages());
  const [inputPrompt, setInputPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt || isTyping) return;

    const userMessage: AIMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputPrompt('');
    setIsTyping(true);

    try {
      const response = await aiService.getAIResponse(prompt, activeCard);
      const aiMessage: AIMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch {
      const errorMsg: AIMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: 'Sorry, I encountered an issue processing that request. Please try asking again!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] glass-panel border-l border-[var(--border-color)] shadow-2xl flex flex-col animate-in slide-in-from-right duration-250 bg-[var(--bg-card)]">
      {/* Top Header */}
      <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-secondary)]/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[var(--accent)] to-purple-500 flex items-center justify-center shadow-md shadow-[var(--accent-glow)]">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-extrabold text-[var(--text-primary)]">AI Study Tutor</h3>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30">
                Online
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">Code concepts & analogies</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Active Card Context Pill (if studying) */}
      {activeCard && (
        <div className="px-4 py-2 bg-[var(--accent)]/10 border-b border-[var(--accent)]/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 truncate pr-2">
            <Code2 className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
            <span className="text-[var(--text-muted)]">Context:</span>
            <span className="font-semibold text-[var(--text-primary)] truncate">
              {activeCard.question}
            </span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--accent)]/20 text-[var(--accent)] font-bold shrink-0">
            {activeCard.language}
          </span>
        </div>
      )}

      {/* Quick Action Suggestion Chips */}
      <div className="p-3 border-b border-[var(--border-color)] bg-white/[0.01] flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
        <button
          onClick={() => handleSendMessage('Explain differently with a simple analogy')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0"
        >
          <Lightbulb className="w-3 h-3 text-amber-400" />
          <span>Analogy (ELI5)</span>
        </button>
        <button
          onClick={() => handleSendMessage('What are common pitfalls and edge cases for this?')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0"
        >
          <AlertCircle className="w-3 h-3 text-rose-400" />
          <span>Pitfalls & Gotchas</span>
        </button>
        <button
          onClick={() => handleSendMessage('Show me a real-world production example')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-3 h-3 text-sky-400" />
          <span>Real-world Example</span>
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs sm:text-sm">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 shadow-md leading-relaxed whitespace-pre-line ${
                  isUser
                    ? 'bg-[var(--accent)] text-white font-medium rounded-br-none'
                    : 'glass-card border border-[var(--border-color)] text-[var(--text-primary)] rounded-bl-none'
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[10px] text-[var(--text-dim)] mt-1 px-1 font-mono">
                {msg.timestamp}
              </span>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2 p-3 rounded-2xl glass-card w-24 border border-[var(--border-color)]">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" />
            <span
              className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce"
              style={{ animationDelay: '0.15s' }}
            />
            <span
              className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce"
              style={{ animationDelay: '0.3s' }}
            />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder={activeCard ? 'Ask about this card or code...' : 'Ask about any programming concept...'}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isTyping}
            className="p-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white disabled:opacity-40 transition-colors shadow-md shadow-[var(--accent-glow)]"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
