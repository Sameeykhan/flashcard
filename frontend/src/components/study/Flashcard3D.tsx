import React, { useState, useRef } from 'react';
import { Card } from '../../types';
import { CodeBlock } from '../common/CodeBlock';
import { useTheme } from '../../context/ThemeContext';
import { useSound } from '../../context/SoundContext';
import {
  RotateCw,
  CheckCircle,
  XCircle,
  Sparkles,
  Tag,
  Clock,
  Flame,
  HelpCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Flashcard3DProps {
  card: Card;
  isFlipped: boolean;
  onFlip: () => void;
  onGrade: (correct: boolean) => void;
  onAskAI: (card: Card) => void;
}

export const Flashcard3D: React.FC<Flashcard3DProps> = ({
  card,
  isFlipped,
  onFlip,
  onGrade,
  onAskAI,
}) => {
  const { reducedMotion } = useTheme();
  const { playFlip, playCorrect, playWrong } = useSound();

  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // 3D Parallax Mouse Move effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      x: y * -10, // rotateX degrees
      y: x * 10,  // rotateY degrees
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const handleFlipClick = () => {
    playFlip();
    onFlip();
  };

  const handleGrade = (correct: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (correct) {
      playCorrect();
      if (!reducedMotion) {
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.75 },
          colors: ['#10b981', '#6366f1', '#38bdf8', '#fbbf24'],
        });
      }
    } else {
      playWrong();
    }
    onGrade(correct);
  };

  // Compute transform style
  const tiltTransform =
    !reducedMotion
      ? `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y + (isFlipped ? 180 : 0)}deg)`
      : isFlipped
      ? 'rotateY(180deg)'
      : 'rotateY(0deg)';

  return (
    <div
      className="w-full max-w-2xl mx-auto min-h-[440px] perspective-1200 cursor-pointer select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleFlipClick}
    >
      <div
        ref={cardRef}
        className="relative w-full h-full min-h-[440px] transform-style-3d card-flip-transition rounded-3xl"
        style={{
          transform: tiltTransform,
        }}
      >
        {/* =========================================================================
            FRONT FACE (Question & Code Snippet)
            ========================================================================= */}
        <div className="absolute inset-0 w-full h-full backface-hidden rounded-3xl glass-card p-6 sm:p-8 flex flex-col justify-between border-2 border-[var(--border-color)] shadow-2xl bg-[var(--bg-card)]">
          {/* Top Card Info Bar */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                  {card.language}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/5 text-[var(--text-muted)] border border-[var(--border-color)]">
                  {card.category}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-dim)]">
                <span className="flex items-center gap-1" title="Difficulty Weight">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>{card.difficulty.toFixed(1)}x</span>
                </span>
                <span className="flex items-center gap-1" title="SRS Leitner Level">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>Lvl {card.interval_level}</span>
                </span>
              </div>
            </div>

            {/* Question Title */}
            <div className="mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)] block mb-1">
                Question
              </span>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] leading-snug">
                {card.question}
              </h3>
            </div>

            {/* Code Snippet (if available) */}
            {card.code_snippet && (
              <div onClick={(e) => e.stopPropagation()}>
                <CodeBlock code={card.code_snippet} language={card.language} />
              </div>
            )}
          </div>

          {/* Bottom Card Footer */}
          <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)]">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Tag className="w-3.5 h-3.5 text-[var(--text-dim)]" />
              {card.tags.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded-md bg-white/5 text-[11px] text-[var(--text-muted)]"
                >
                  #{t}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-[var(--accent)] font-semibold animate-pulse">
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Click or Space to reveal</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            BACK FACE (Answer, Explanation & Grading Controls)
            ========================================================================= */}
        <div
          className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-3xl glass-card p-6 sm:p-8 flex flex-col justify-between border-2 border-[var(--border-highlight)] shadow-2xl bg-[var(--bg-card)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Answer Revealed
                </span>
                <span className="text-xs text-[var(--text-muted)] font-mono">{card.language}</span>
              </div>

              {/* AI Help Trigger */}
              <button
                type="button"
                onClick={() => onAskAI(card)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent)]/15 hover:bg-[var(--accent)]/25 text-[var(--accent)] border border-[var(--accent)]/30 text-xs font-bold transition-all hover:scale-105"
                title="Ask AI to explain this card differently"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Explain with AI</span>
              </button>
            </div>

            {/* Answer Box */}
            <div className="mb-4 p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                Solution / Output
              </span>
              <div className="text-base sm:text-lg font-mono font-bold text-[var(--text-primary)]">
                {card.answer}
              </div>
            </div>

            {/* Detailed Explanation */}
            {card.explanation && (
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-[var(--border-color)] text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] block mb-1">
                  Why it works:
                </span>
                {card.explanation}
              </div>
            )}
          </div>

          {/* Self-Grading Action Buttons */}
          <div className="pt-4 border-t border-[var(--border-color)]">
            <div className="text-center text-[11px] font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-2.5">
              Did you answer this correctly?
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={(e) => handleGrade(false, e)}
                className="group flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-sm transition-all hover:scale-[1.02] shadow-sm hover:shadow-red-500/20"
              >
                <XCircle className="w-5 h-5 text-red-400 group-hover:rotate-12 transition-transform" />
                <span>Missed it [2]</span>
              </button>

              <button
                type="button"
                onClick={(e) => handleGrade(true, e)}
                className="group flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-sm transition-all hover:scale-[1.02] shadow-sm hover:shadow-emerald-500/20"
              >
                <CheckCircle className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>Got it! [1]</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
