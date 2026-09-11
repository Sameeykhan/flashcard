import React, { useState, useEffect } from 'react';
import { Card } from '../../types';
import { CodeBlock } from '../common/CodeBlock';
import { X, Code2, Plus, Sparkles, Check } from 'lucide-react';

interface CardFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cardData: Omit<Card, 'id' | 'interval_level' | 'difficulty' | 'next_due' | 'last_reviewed' | 'wrong_count' | 'correct_count'>) => void;
  editingCard?: Card | null;
}

export const CardFormModal: React.FC<CardFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingCard,
}) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [language, setLanguage] = useState('python');
  const [category, setCategory] = useState('Syntax');
  const [tagsStr, setTagsStr] = useState('');
  const [explanation, setExplanation] = useState('');

  useEffect(() => {
    if (editingCard) {
      setQuestion(editingCard.question);
      setAnswer(editingCard.answer);
      setCodeSnippet(editingCard.code_snippet || '');
      setLanguage(editingCard.language.toLowerCase());
      setCategory(editingCard.category);
      setTagsStr(editingCard.tags.join(', '));
      setExplanation(editingCard.explanation || '');
    } else {
      setQuestion('');
      setAnswer('');
      setCodeSnippet('');
      setLanguage('python');
      setCategory('Syntax');
      setTagsStr('');
      setExplanation('');
    }
  }, [editingCard, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;

    const tags = tagsStr
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    onSave({
      question: question.trim(),
      answer: answer.trim(),
      code_snippet: codeSnippet.trim() ? codeSnippet.trim() : undefined,
      language: language.charAt(0).toUpperCase() + language.slice(1),
      category: category.trim(),
      tags: tags.length > 0 ? tags : ['general'],
      explanation: explanation.trim() ? explanation.trim() : undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl glass-panel rounded-3xl p-6 sm:p-8 border border-[var(--border-color)] shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Top Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[var(--accent)] to-purple-500" />

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                {editingCard ? 'Edit Flashcard' : 'Add New Flashcard'}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">Customize questions, code snippets, and explanations</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Question */}
          <div>
            <label className="block font-semibold text-[var(--text-muted)] mb-1">
              Question / Prompt <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What will this Python list comprehension output?"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Language & Category Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[var(--text-muted)] mb-1">
                Programming Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="sql">SQL</option>
                <option value="bash">Bash / Shell</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-muted)] mb-1">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Syntax, Algorithms, Concurrency"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          {/* Code Snippet Input & Live Preview */}
          <div>
            <label className="block font-semibold text-[var(--text-muted)] mb-1">
              Code Snippet (Optional)
            </label>
            <textarea
              rows={3}
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              placeholder="Paste code snippet here..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] leading-relaxed"
            />
            {codeSnippet.trim() && (
              <div className="mt-2">
                <span className="text-[10px] uppercase font-bold text-[var(--text-dim)]">Live Preview:</span>
                <CodeBlock code={codeSnippet} language={language} showLineNumbers={false} />
              </div>
            )}
          </div>

          {/* Answer */}
          <div>
            <label className="block font-semibold text-[var(--text-muted)] mb-1">
              Answer / Expected Output <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="e.g. [0, 4, 16]"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Explanation */}
          <div>
            <label className="block font-semibold text-[var(--text-muted)] mb-1">
              Explanation (Optional)
            </label>
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Detailed explanation of why this code works this way..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block font-semibold text-[var(--text-muted)] mb-1">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="e.g. python, lists, loops, comprehensions"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold transition-all shadow-md shadow-[var(--accent-glow)] flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{editingCard ? 'Save Changes' : 'Create Card'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
