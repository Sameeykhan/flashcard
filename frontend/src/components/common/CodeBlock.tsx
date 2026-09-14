import React, { useEffect, useRef, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  compact?: boolean;
  maxHeight?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language,
  showLineNumbers = true,
  compact = false,
  maxHeight,
}) => {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  const langMap: Record<string, string> = {
    python: 'python',
    py: 'python',
    javascript: 'javascript',
    js: 'javascript',
    typescript: 'typescript',
    ts: 'typescript',
    go: 'go',
    rust: 'rust',
    rs: 'rust',
    sql: 'sql',
    bash: 'bash',
    shell: 'bash',
    json: 'json',
  };

  const normalizedLang = langMap[language.toLowerCase()] || 'javascript';

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, normalizedLang]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const lines = code.trim().split('\n');

  if (compact) {
    return (
      <div className="relative group my-1.5 rounded-xl overflow-hidden border border-[var(--color-code-border)] bg-[var(--color-code-bg)] text-left transition-colors">
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-[10px] flex items-center gap-1 shadow-sm"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-500" />
              <span className="text-emerald-500 font-medium">Copied</span>
            </>
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>

        <div
          className="p-3.5 overflow-x-auto text-[11px] font-mono leading-relaxed scrollbar-thin text-[var(--color-code-text)]"
          style={{ maxHeight: maxHeight || 'none' }}
        >
          <pre className="m-0 overflow-visible font-mono">
            <code ref={codeRef} className={`language-${normalizedLang}`}>
              {code.trim()}
            </code>
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group my-2 rounded-xl overflow-hidden border border-[var(--color-code-border)] bg-[var(--color-code-bg)] text-left shadow-sm transition-colors">
      <div className="flex items-center justify-between px-3.5 py-2 bg-[var(--color-code-header)] border-b border-[var(--color-code-border)] text-xs text-[var(--color-text-secondary)] font-mono">
        <span className="flex items-center gap-1.5 uppercase font-bold tracking-wider text-[10px] text-[var(--color-accent)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] inline-block"></span>
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors text-[11px]"
          title="Copy code snippet"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-500">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <div
        className="flex p-3.5 overflow-x-auto text-xs font-mono leading-relaxed scrollbar-thin text-[var(--color-code-text)]"
        style={{ maxHeight: maxHeight || 'none' }}
      >
        {showLineNumbers && (
          <div className="select-none pr-3 text-right text-[var(--color-text-tertiary)] font-mono text-xs border-r border-[var(--color-border)] flex flex-col">
            {lines.map((_, i) => (
              <span key={i} className="leading-relaxed">
                {i + 1}
              </span>
            ))}
          </div>
        )}
        <pre className="pl-3 m-0 overflow-visible font-mono">
          <code ref={codeRef} className={`language-${normalizedLang}`}>
            {code.trim()}
          </code>
        </pre>
      </div>
    </div>
  );
};
