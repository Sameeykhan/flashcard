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
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, showLineNumbers = true }) => {
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

  return (
    <div className="relative group my-2 rounded-xl overflow-hidden border border-[var(--border-color)] bg-[#0d1117] text-left shadow-lg">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#161b22] border-b border-[var(--border-color)] text-xs text-gray-400 font-mono">
        <span className="flex items-center gap-1.5 uppercase font-bold tracking-wider text-[11px] text-[var(--accent)]">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] inline-block"></span>
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10 text-gray-300 hover:text-white transition-colors text-[11px]"
          title="Copy code snippet"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <div className="flex p-3 overflow-x-auto text-sm font-mono leading-relaxed">
        {showLineNumbers && (
          <div className="select-none pr-3 text-right text-gray-600 font-mono text-xs border-r border-gray-800 flex flex-col">
            {lines.map((_, i) => (
              <span key={i} className="leading-relaxed">
                {i + 1}
              </span>
            ))}
          </div>
        )}
        <pre className="pl-3 m-0 overflow-visible">
          <code ref={codeRef} className={`language-${normalizedLang}`}>
            {code.trim()}
          </code>
        </pre>
      </div>
    </div>
  );
};
