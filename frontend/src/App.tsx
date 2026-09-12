import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SoundProvider } from './context/SoundContext';
import { Navbar } from './components/common/Navbar';
import { AmbientBackground } from './components/common/AmbientBackground';
import { ToastContainer, ToastItem } from './components/common/ToastContainer';
import { AuthCard } from './components/auth/AuthCard';
import { StudentProfile } from './components/dashboard/StudentProfile';
import { MarksOverview } from './components/dashboard/MarksOverview';
import { SessionHistory } from './components/dashboard/SessionHistory';
import { LeaderboardCard } from './components/dashboard/LeaderboardCard';
import { BadgesCard } from './components/dashboard/BadgesCard';
import { Flashcard3D } from './components/study/Flashcard3D';
import { StudyHeader } from './components/study/StudyHeader';
import { SessionSummaryModal } from './components/study/SessionSummaryModal';
import { ShortcutsModal } from './components/study/ShortcutsModal';
import { AIPanel } from './components/ai/AIPanel';
import { CardLibrary } from './components/library/CardLibrary';
import { CardFormModal } from './components/library/CardFormModal';
import { Card, SessionResult } from './types';
import { cardService } from './services/cardService';
import { srsService } from './services/srsService';
import { progressService } from './services/progressService';
import { motivationalService } from './services/motivationalService';
import { Bot, PlayCircle, Sparkles } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, updateUserStats } = useAuth();

  // Navigation Tab
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'study' | 'library' | 'leaderboard'>('dashboard');

  // Cards & Library State
  const [cards, setCards] = useState<Card[]>(() => cardService.getCards());
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  // Study Session State
  const [activeQueue, setActiveQueue] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionWrong, setSessionWrong] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number>(() => Date.now());
  const [sessionDuration, setSessionDuration] = useState(0);
  const [missedCards, setMissedCards] = useState<Card[]>([]);
  const [filterLabel, setFilterLabel] = useState<string>('All Cards (SRS Priority)');

  // Analytics & History
  const [sessions, setSessions] = useState<SessionResult[]>(() => progressService.getSessions());
  const stats = useMemo(() => progressService.getStats(sessions), [sessions]);
  const peers = useMemo(() => progressService.getLeaderboard(), []);
  const achievements = useMemo(() => progressService.getAchievements(), []);

  // Modals & Panels
  const [authOpen, setAuthOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [cardFormOpen, setCardFormOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (toast: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Start study session
  const startStudySession = useCallback(
    (deckCards?: Card[], label: string = 'All Cards (SRS Priority)') => {
      const source = deckCards && deckCards.length > 0 ? deckCards : cards;
      const queue = srsService.getSessionQueue(source, Math.min(10, source.length));

      setActiveQueue(queue);
      setCurrentIndex(0);
      setIsFlipped(false);
      setSessionCorrect(0);
      setSessionWrong(0);
      setMissedCards([]);
      setSessionStartTime(Date.now());
      setFilterLabel(label);
      motivationalService.reset();
      setCurrentTab('study');
    },
    [cards]
  );

  // Card self-grading handler
  const handleGradeCard = useCallback(
    (correct: boolean) => {
      const currentCard = activeQueue[currentIndex];
      if (!currentCard) return;

      // Update card via SRS logic
      const updatedCard = correct
        ? srsService.updateOnCorrect(currentCard)
        : srsService.updateOnWrong(currentCard);

      cardService.updateCard(updatedCard);
      setCards((prev) => prev.map((c) => (c.id === updatedCard.id ? updatedCard : c)));

      // Motivational Quote trigger on consecutive failures
      const quote = motivationalService.recordAnswer(correct);
      if (quote) {
        addToast({
          type: 'motivational',
          title: 'Keep Going — Growth Happens in Struggle!',
          message: quote,
        });
      }

      // Update session tallies
      if (correct) {
        setSessionCorrect((prev) => prev + 1);
      } else {
        setSessionWrong((prev) => prev + 1);
        setMissedCards((prev) => [...prev, currentCard]);
      }

      // Check if session finished
      if (currentIndex + 1 >= activeQueue.length) {
        const totalDuration = Math.max(1, Math.round((Date.now() - sessionStartTime) / 1000));
        setSessionDuration(totalDuration);

        const finalCorrect = sessionCorrect + (correct ? 1 : 0);
        const finalWrong = sessionWrong + (correct ? 0 : 1);
        const total = finalCorrect + finalWrong;
        const accuracyPct = Math.round((finalCorrect / total) * 100);

        const newSessionResult: SessionResult = {
          id: `sess-${Date.now()}`,
          date: new Date().toISOString(),
          cards_studied: total,
          correct_count: finalCorrect,
          wrong_count: finalWrong,
          accuracy_pct: accuracyPct,
          duration_seconds: totalDuration,
          filter_applied: {
            language: filterLabel.includes('Deck') ? filterLabel.split(' ')[0] : 'All',
          },
        };

        progressService.recordSession(newSessionResult);
        setSessions(progressService.getSessions());

        // Update user stats
        updateUserStats((prev) => ({
          ...prev,
          totalCardsStudied: prev.totalCardsStudied + total,
          streakDays: prev.streakDays + 1,
        }));

        setSummaryOpen(true);
      } else {
        // Advance to next card
        setCurrentIndex((prev) => prev + 1);
        setIsFlipped(false);
      }
    },
    [activeQueue, currentIndex, sessionCorrect, sessionWrong, sessionStartTime, filterLabel, updateUserStats]
  );

  // Review Missed Cards
  const handleReviewMissed = () => {
    setSummaryOpen(false);
    if (missedCards.length > 0) {
      startStudySession(missedCards, 'Review: Missed Cards');
    } else {
      startStudySession();
    }
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid hotkeys when typing in inputs/textareas
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      if (currentTab === 'study' && activeQueue.length > 0 && !summaryOpen && !shortcutsOpen) {
        if (e.code === 'Space' || e.key === 'Enter') {
          e.preventDefault();
          setIsFlipped((prev) => !prev);
        } else if (e.key === '1' || e.key.toLowerCase() === 'y') {
          if (isFlipped) {
            e.preventDefault();
            handleGradeCard(true);
          }
        } else if (e.key === '2' || e.key.toLowerCase() === 'n') {
          if (isFlipped) {
            e.preventDefault();
            handleGradeCard(false);
          }
        }
      }

      if (e.key.toLowerCase() === 'a') {
        setAiPanelOpen((prev) => !prev);
      } else if (e.key === '?') {
        setShortcutsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setShortcutsOpen(false);
        setCardFormOpen(false);
        setAiPanelOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTab, activeQueue, isFlipped, summaryOpen, shortcutsOpen, handleGradeCard]);

  const currentCard = activeQueue[currentIndex] || null;

  return (
    <div className="relative min-h-screen flex flex-col selection:bg-[var(--accent)] selection:text-white">
      {/* Dynamic 3D Ambient Constellation Background */}
      <AmbientBackground />

      {/* Persistent App Header */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenAuth={() => setAuthOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* TAB 1: STUDENT DASHBOARD */}
        {currentTab === 'dashboard' && (
          <div className="animate-in fade-in duration-200">
            {user && (
              <StudentProfile
                user={user}
                stats={stats}
                onStartStudy={() => startStudySession()}
              />
            )}
            <MarksOverview stats={stats} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <LeaderboardCard peers={peers} currentUsername={user?.username} />
              <BadgesCard achievements={achievements} />
            </div>
            <SessionHistory sessions={sessions} />
          </div>
        )}

        {/* TAB 2: STUDY SESSION */}
        {currentTab === 'study' && (
          <div className="animate-in fade-in duration-200">
            {activeQueue.length === 0 ? (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="glass-panel rounded-3xl p-8 sm:p-10 text-center border border-[var(--border-color)] shadow-2xl">
                  <PlayCircle className="w-14 h-14 text-[var(--accent)] mx-auto mb-3 animate-bounce" />
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] mb-2">
                    Ready to Supercharge Your Memory?
                  </h2>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] mb-6 max-w-lg mx-auto leading-relaxed">
                    Choose a focused subject deck or launch our adaptive 4D Spaced Repetition queue sorted by urgency, difficulty multiplier, and Leitner intervals.
                  </p>
                  <button
                    onClick={() => startStudySession()}
                    className="px-8 py-3.5 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-sm shadow-xl shadow-[var(--accent-glow)] transition-all hover:scale-105 flex items-center gap-2 mx-auto"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Start All-Subject Session (SRS Priority)</span>
                  </button>
                </div>

                {/* Subject-Specific Practice Decks */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] mb-3 px-1">
                    Or Practice by Subject
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { name: 'Python', desc: 'Comprehensions, GIL, Yield' },
                      { name: 'JavaScript', desc: 'Event Loop, Closures, Async' },
                      { name: 'TypeScript', desc: 'Generics, Discriminated Unions' },
                      { name: 'React', desc: 'Hooks, Transitions, Cleanup' },
                      { name: 'DSA', desc: 'Trees, LRU, Two Pointers' },
                      { name: 'SQL', desc: 'B-Trees, ACID, Window Funcs' },
                      { name: 'System Design', desc: 'CAP, Rate Limiting, Queues' },
                      { name: 'DevOps', desc: 'Docker, Multi-Stage, Alpine' },
                    ].map((subj) => {
                      const subjCards = cards.filter((c) => c.language.toLowerCase() === subj.name.toLowerCase());
                      return (
                        <button
                          key={subj.name}
                          onClick={() => startStudySession(subjCards, `${subj.name} Deck`)}
                          className="p-4 rounded-2xl glass-card text-left border border-[var(--border-color)] hover:border-[var(--accent)] transition-all group"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                              {subj.name}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-[var(--text-dim)]">
                              {subjCards.length}
                            </span>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] line-clamp-1">{subj.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <StudyHeader
                  currentIndex={currentIndex}
                  totalCards={activeQueue.length}
                  correctCount={sessionCorrect}
                  wrongCount={sessionWrong}
                  onOpenShortcuts={() => setShortcutsOpen(true)}
                  onExit={() => setCurrentTab('dashboard')}
                  filterLabel={filterLabel}
                  sessionStartTime={sessionStartTime}
                />

                {currentCard && (
                  <Flashcard3D
                    card={currentCard}
                    isFlipped={isFlipped}
                    onFlip={() => setIsFlipped(!isFlipped)}
                    onGrade={handleGradeCard}
                    onAskAI={(_card) => {
                      setAiPanelOpen(true);
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CARD LIBRARY & MANAGER */}
        {currentTab === 'library' && (
          <div className="animate-in fade-in duration-200">
            <CardLibrary
              cards={cards}
              onRefreshCards={() => setCards(cardService.getCards())}
              onEditCard={(card) => {
                setEditingCard(card);
                setCardFormOpen(true);
              }}
              onAddNewCard={() => {
                setEditingCard(null);
                setCardFormOpen(true);
              }}
              onStartStudyWithFilter={(filtered, label) => {
                startStudySession(filtered, label);
              }}
            />
          </div>
        )}

        {/* TAB 4: LEADERBOARD & RANKS */}
        {currentTab === 'leaderboard' && (
          <div className="animate-in fade-in duration-200 max-w-4xl mx-auto space-y-6">
            <LeaderboardCard peers={peers} currentUsername={user?.username} />
            <BadgesCard achievements={achievements} />
          </div>
        )}
      </main>

      {/* Floating AI Helper Action Button (FAB) */}
      <button
        onClick={() => setAiPanelOpen(!aiPanelOpen)}
        className="fixed bottom-6 left-6 z-40 p-3.5 rounded-2xl glass-panel border border-[var(--border-highlight)] shadow-xl shadow-[var(--accent-glow)] text-[var(--accent)] hover:scale-110 transition-all group flex items-center gap-2"
        title="Open AI Study Tutor [A]"
      >
        <div className="w-8 h-8 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center">
          <Bot className="w-5 h-5" />
        </div>
        <span className="hidden sm:inline text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] pr-1">
          Ask AI
        </span>
      </button>

      {/* AI Help Drawer */}
      <AIPanel
        isOpen={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        activeCard={currentTab === 'study' ? currentCard : null}
      />

      {/* Auth Modal */}
      <AuthCard
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => {
          addToast({
            type: 'success',
            title: 'Welcome!',
            message: 'Signed in successfully. Your study progress is synced.',
          });
        }}
      />

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      {/* Session Completion Summary Modal */}
      <SessionSummaryModal
        isOpen={summaryOpen}
        totalCards={activeQueue.length}
        correctCount={sessionCorrect}
        wrongCount={sessionWrong}
        durationSeconds={sessionDuration}
        onRestart={() => startStudySession(activeQueue, filterLabel)}
        onReviewMissed={missedCards.length > 0 ? handleReviewMissed : undefined}
        onGoToDashboard={() => {
          setSummaryOpen(false);
          setCurrentTab('dashboard');
        }}
      />

      {/* Add / Edit Card Modal */}
      <CardFormModal
        isOpen={cardFormOpen}
        onClose={() => {
          setCardFormOpen(false);
          setEditingCard(null);
        }}
        editingCard={editingCard}
        onSave={(data) => {
          if (editingCard) {
            const updated: Card = { ...editingCard, ...data };
            cardService.updateCard(updated);
            addToast({
              type: 'info',
              title: 'Card Updated',
              message: `Successfully updated "${data.question}"`,
            });
          } else {
            cardService.addCard(data);
            addToast({
              type: 'success',
              title: 'Card Created',
              message: `Added new ${data.language} flashcard to your deck!`,
            });
          }
          setCards(cardService.getCards());
        }}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <SoundProvider>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </SoundProvider>
    </ThemeProvider>
  );
}

export default App;
