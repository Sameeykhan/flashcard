import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Volume2,
  VolumeX,
  Lightbulb,
  PenTool,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Flashcard3DProps {
  card: Card;
  isFlipped: boolean;
  onFlip: () => void;
  onGrade: (correct: boolean) => void;
  onAskAI: (card: Card) => void;
}

const Flashcard3DInner: React.FC<Flashcard3DProps> = ({
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
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  // 4D Interactive Features State
  const [showHint, setShowHint] = useState(false);
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [scratchpadAnswer, setScratchpadAnswer] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Text-To-Speech (TTS) Voice narration callback
  const handleToggleSpeech = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }

      window.speechSynthesis.cancel();
      const textToSpeak = isFlipped
        ? `Answer: ${card.answer}. ${card.explanation ? 'Explanation: ' + card.explanation : ''}`
        : `Question: ${card.question}. ${card.code_snippet ? 'Code snippet in ' + card.language : ''}`;

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [card, isFlipped, isSpeaking]
  );

  // Keyboard shortcuts (H: Hint, S: Scratchpad, R: Read aloud)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setShowHint((prev) => !prev);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setShowScratchpad((prev) => !prev);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleToggleSpeech();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleSpeech]);

  // 4D Parallax Mouse Move & Holographic Sheen effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x: xPct, y: yPct });

    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      x: y * -12, // rotateX degrees
      y: x * 12,  // rotateY degrees
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setMousePos({ x: 50, y: 50 });
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
          colors: ['#10b981', '#6366f1', '#38bdf8', '#fbbf24', '#e1306c', '#25d366'],
        });
      }
    } else {
      playWrong();
    }
    onGrade(correct);
  };

  // Compute 3D transform style with perspective
  const tiltTransform =
    !reducedMotion
      ? `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y + (isFlipped ? 180 : 0)}deg)`
      : isFlipped
      ? 'rotateY(180deg)'
      : 'rotateY(0deg)';

  return (
    <div
      className="w-full max-w-2xl mx-auto min-h-[460px] perspective-1200 cursor-pointer select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleFlipClick}
    >
      <div
        ref={cardRef}
        className="relative w-full h-full min-h-[460px] transform-style-3d card-flip-transition rounded-3xl"
        style={
          {
            transform: tiltTransform,
            '--mouse-x': `${mousePos.x}%`,
            '--mouse-y': `${mousePos.y}%`,
          } as React.CSSProperties
        }
      >
        {/* =========================================================================
            FRONT FACE (Question, Code Snippet, Hint & 4D Controls)
            ========================================================================= */}
        <div className="absolute inset-0 w-full h-full backface-hidden rounded-3xl glass-card p-6 sm:p-8 flex flex-col justify-between border-2 border-[var(--border-color)] shadow-2xl bg-[var(--bg-card)] overflow-hidden">
          {/* 4D Holographic Sheen Dynamic Glare Layer */}
          <div className="holographic-sheen" />

          {/* Top Card Info Bar & 4D Toolbar */}
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                  {card.language}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/5 text-[var(--text-muted)] border border-[var(--border-color)]">
                  {card.category}
                </span>
              </div>

              {/* 4D Sensory Toolbar (Voice TTS, Hint Clue, Scratchpad) */}
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                {/* Voice Speech Narration Button */}
                <button
                  type="button"
                  onClick={handleToggleSpeech}
                  className={`p-1.5 rounded-lg border text-xs transition-all ${
                    isSpeaking
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)] animate-pulse'
                      : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5'
                  }`}
                  title={isSpeaking ? 'Stop voice reader [R]' : 'Read aloud with voice TTS [R]'}
                >
                  {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>

                {/* Hint Button */}
                {card.hint && (
                  <button
                    type="button"
                    onClick={() => setShowHint(!showHint)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                      showHint
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm shadow-amber-500/20'
                        : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-amber-400 hover:bg-white/5'
                    }`}
                    title="Toggle Hint [H]"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Hint [H]</span>
                  </button>
                )}

                {/* Scratchpad Button */}
                <button
                  type="button"
                  onClick={() => setShowScratchpad(!showScratchpad)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                    showScratchpad
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                      : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5'
                  }`}
                  title="Draft your answer before flipping [S]"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Draft [S]</span>
                </button>

                <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-dim)] pl-1 border-l border-[var(--border-color)]">
                  <span className="flex items-center gap-1" title="Difficulty Weight">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    <span>{card.difficulty.toFixed(1)}x</span>
                  </span>
                  <span className="flex items-center gap-1" title="SRS Leitner Level">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <span>L{card.interval_level}</span>
                  </span>
                </div>
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
              <div onClick={(e) => e.stopPropagation()} className="mb-3">
                <CodeBlock code={card.code_snippet} language={card.language} />
              </div>
            )}

            {/* Hint Box (if toggled) */}
            {showHint && card.hint && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-200 mb-3"
              >
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase tracking-wider text-[10px] block text-amber-400">
                    Clue / Hint:
                  </span>
                  {card.hint}
                </div>
              </div>
            )}

            {/* Active Recall Scratchpad Input (if toggled) */}
            {showScratchpad && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-highlight)] animate-in fade-in slide-in-from-top-2 duration-200 mb-2"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                    Active Recall Scratchpad (Type before flipping)
                  </span>
                  {scratchpadAnswer.trim() && (
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Drafted
                    </span>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={scratchpadAnswer}
                  onChange={(e) => setScratchpadAnswer(e.target.value)}
                  placeholder="Type your expected output or code here to test yourself..."
                  className="w-full px-2.5 py-1.5 bg-black/25 border border-[var(--border-color)] rounded-lg text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>
            )}
          </div>

          {/* Bottom Card Footer */}
          <div className="relative z-10 pt-4 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)]">
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
              <span className="hidden sm:inline">Click or Space to flip</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            BACK FACE (Answer, Explanation, Scratchpad Review & Self-Grading)
            ========================================================================= */}
        <div
          className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-3xl glass-card p-6 sm:p-8 flex flex-col justify-between border-2 border-[var(--border-highlight)] shadow-2xl bg-[var(--bg-card)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 4D Holographic Sheen Dynamic Glare Layer */}
          <div className="holographic-sheen" />

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Answer Revealed
                </span>
                <span className="text-xs text-[var(--text-muted)] font-mono">{card.language}</span>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2">
                {/* Voice speech toggle on back face */}
                <button
                  type="button"
                  onClick={handleToggleSpeech}
                  className={`p-1.5 rounded-lg border text-xs transition-all ${
                    isSpeaking
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)] animate-pulse'
                      : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5'
                  }`}
                  title={isSpeaking ? 'Stop voice reader [R]' : 'Read answer aloud [R]'}
                >
                  {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>

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
            </div>

            {/* Answer Box */}
            <div className="mb-3 p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                Solution / Output
              </span>
              <div className="text-base sm:text-lg font-mono font-bold text-[var(--text-primary)]">
                {card.answer}
              </div>
            </div>

            {/* Side-by-Side Scratchpad Comparison (if user typed something) */}
            {scratchpadAnswer.trim() && (
              <div className="mb-3 p-3 rounded-xl bg-white/[0.02] border border-[var(--border-color)] text-xs font-mono">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] block mb-1">
                  Your Drafted Answer:
                </span>
                <span className="text-[var(--text-muted)]">{scratchpadAnswer}</span>
              </div>
            )}

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
          <div className="relative z-10 pt-3 border-t border-[var(--border-color)]">
            <div className="text-center text-[11px] font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-2">
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

export const Flashcard3D: React.FC<Flashcard3DProps> = (props) => {
  return <Flashcard3DInner key={props.card.id} {...props} />;
};
