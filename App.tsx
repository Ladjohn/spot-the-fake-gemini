import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateQuizRound, getEmergencyFallbackRound, preloadAllDifficulties, preloadRound } from './services/geminiService';
import { playSound, startMusic, stopMusic } from './services/audioService';
import { NewsItem, QuizState } from './types';
import { GAME_CONFIG } from './constants';
import GameCard from './components/GameCard';
import AnalysisModal from './components/AnalysisModal';
import { getHighScore, getThemePreference, setHighScore, setThemePreference } from './utils/storage';

const LOADING_LINES = [
  'Scanning the internet for deadly questions...',
  'Reading people\'s minds for suspicious facts...',
  'Polishing fake facts until they sparkle...',
  'Asking a raccoon if this is real...',
  'Loading questions with maximum drama...',
  'Interrogating the chaos engine for new traps...',
  'Teaching the truth to wear a disguise...',
  'Shuffling lies into the deck...',
  'Calling our unpaid fact goblins...',
  'Warming up the lie detector...',
  'Checking if the Moon has Wi-Fi...',
  'Making easy questions feel overconfident...',
  'Hiding the real answer behind a moustache...',
  'Feeding trivia into the chaos machine...',
  'Preparing fresh traps for clever brains...',
];

let loadingLineBag: string[] = [];

function getRandomLoadingLine() {
  if (!loadingLineBag.length) {
    loadingLineBag = [...LOADING_LINES].sort(() => Math.random() - 0.5);
  }

  return loadingLineBag.pop() || LOADING_LINES[0];
}

function buzz(pattern: number | number[] = 12) {
  navigator.vibrate?.(pattern);
}

const LoadingScreen = () => {
  const [line] = useState(getRandomLoadingLine);

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F5C518',
        color: '#000',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div className="neo-card loading-card" style={{ background: '#fff', padding: '28px 22px', maxWidth: 430 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <LogoMark size={62} fontSize={20} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
          Loading
        </div>
        <div style={{ fontSize: 'clamp(22px, 7vw, 34px)', lineHeight: 1.05, fontWeight: 900, fontFamily: 'Space Grotesk, sans-serif', textTransform: 'uppercase' }}>
          {line}
        </div>
      </div>
    </div>
  );
};

const SpeakerIcon: React.FC<{ muted?: boolean }> = ({ muted = false }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 5L6 9H3v6h3l5 4V5z" />
    {!muted ? (
      <>
        <path d="M15.5 8.5a5 5 0 010 7" />
        <path d="M18.5 6a9 9 0 010 12" />
      </>
    ) : (
      <>
        <path d="M16.5 9.5l4 4" />
        <path d="M20.5 9.5l-4 4" />
      </>
    )}
  </svg>
);

const ThemeIcon: React.FC<{ dark?: boolean }> = ({ dark = false }) => (
  dark ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M6.34 17.66l-1.41 1.41" />
      <path d="M19.07 4.93l-1.41 1.41" />
    </svg>
  )
);

const LogoMark: React.FC<{ size?: number; fontSize?: number; borderColor?: string; shadowColor?: string; rounded?: number }> = ({
  size = 72,
  fontSize = 24,
  borderColor = '#000',
  shadowColor = '#000',
  rounded = 0,
}) => (
  <div
    className="for-logo-build"
    style={{
      width: size,
      height: size,
      background: '#3B7FF5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: `6px 6px 0 ${shadowColor}`,
      border: `3px solid ${borderColor}`,
      borderRadius: rounded,
      flexShrink: 0,
      fontSize,
    }}
  >
    <span className="for-logo-letter for-logo-letter-f">F</span>
    <span className="for-logo-dot">.</span>
    <span className="for-logo-letter for-logo-letter-o">O</span>
    <span className="for-logo-dot for-logo-dot-late">.</span>
    <span className="for-logo-letter for-logo-letter-r">R</span>
  </div>
);

const StartScreen: React.FC<{
  onStart: (d: 'Easy' | 'Medium' | 'Hard') => void;
  isDarkMode?: boolean;
}> = ({ onStart, isDarkMode = false }) => {
  const pageBg = isDarkMode ? '#111111' : '#F5C518';
  const panelBg = isDarkMode ? '#1f1f1f' : '#fff';
  const panelBorder = isDarkMode ? '#fff' : '#000';
  const panelText = isDarkMode ? '#fff' : '#000';
  const helperCardBg = isDarkMode ? '#2a2a2a' : '#fff';
  const helperCardText = isDarkMode ? '#f5f5f5' : '#000';
  const labelText = isDarkMode ? '#d4d4d4' : '#111';
  const handleDifficultyClick = (difficulty: 'Easy' | 'Medium' | 'Hard') => {
    onStart(difficulty);
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: pageBg,
        padding: '20px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: panelBg,
          border: `4px solid ${panelBorder}`,
          boxShadow: `10px 10px 0 ${panelBorder}`,
          padding: 'clamp(20px, 5vw, 28px) clamp(18px, 5vw, 24px) 22px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', marginBottom: 24, gap: 16 }}>
          <LogoMark borderColor={panelBorder} shadowColor={panelBorder} />
        </div>

        <div
          style={{
            textAlign: 'left',
            fontWeight: 900,
            fontSize: 'clamp(36px, 10vw, 46px)',
            lineHeight: 0.95,
            letterSpacing: -1.5,
            color: panelText,
            marginBottom: 12,
            fontFamily: 'Space Grotesk, sans-serif',
            textTransform: 'uppercase',
          }}
        >
          Fake
          <br />
          Or Real
        </div>

        <div
          style={{
            border: `3px solid ${panelBorder}`,
            boxShadow: `5px 5px 0 ${panelBorder}`,
            background: helperCardBg,
            padding: '12px 14px',
            marginBottom: 22,
            fontSize: 16,
            fontWeight: 700,
            lineHeight: 1.35,
            color: helperCardText,
          }}
        >
          Can you spot fake statements from real ones?
        </div>

        <div style={{ color: labelText, fontSize: 10, fontWeight: 900, letterSpacing: 1.4, margin: '-8px 0 20px', textTransform: 'uppercase' }}>
          Science, culture, tech, history, sports, geography and more
        </div>

        <div style={{ textAlign: 'left', fontSize: 11, fontWeight: 900, color: labelText, letterSpacing: 2.2, marginBottom: 14, textTransform: 'uppercase' }}>
          Select Difficulty
        </div>

        {(['Easy', 'Medium', 'Hard'] as const).map(d => (
          <button
            key={d}
            onClick={() => handleDifficultyClick(d)}
            className="neo-button neo-shadow"
            style={{
              width: '100%',
              padding: '18px 16px',
              marginBottom: 14,
              border: `3px solid ${panelBorder}`,
              background: d === 'Easy' ? '#F7D548' : d === 'Medium' ? '#A6FCDB' : '#FF5A5F',
              color: '#000',
              fontWeight: 900,
              fontSize: 20,
              letterSpacing: 1.2,
              cursor: 'pointer',
              textAlign: 'left',
              boxShadow: `6px 6px 0 ${panelBorder}`,
              fontFamily: 'Space Grotesk, sans-serif',
              textTransform: 'uppercase',
            }}
          >
            {d}
          </button>
        ))}

      </div>
    </div>
  );
};

const ScoreBoard: React.FC<{
  score: number;
  highScore: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  onPlayAgain: () => void;
  onChangeDifficulty: () => void;
}> = ({ score, highScore, difficulty, onPlayAgain, onChangeDifficulty }) => {
  const previousBest = Math.max(highScore, getHighScore());
  const personalBest = Math.max(score, previousBest);
  const isNewBest = score > previousBest;
  const headline = isNewBest ? 'LEGEND!' : 'BUSTED!';
  const subtitle = isNewBest ? 'New personal best. Suspiciously brilliant.' : 'You believed the lies.';

  const handleShare = async () => {
    buzz([10, 25, 10]);
    const text = `I scored ${score} in Fake Or Real on ${difficulty} mode. Can you beat me?`;

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Fake Or Real', text });
      } else {
        await navigator.clipboard?.writeText(text);
        alert('Score copied. Send it to someone brave.');
      }
    } catch {
      // Sharing can be cancelled by the player; keep the score screen calm.
    }
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#EF4338',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 22,
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 22px)',
        color: '#000',
      }}
    >
      <div
        className="score-card neo-card"
        style={{
          width: '100%',
          maxWidth: 430,
          background: '#fff',
          borderRadius: 14,
          padding: 'clamp(22px, 6vw, 34px) clamp(18px, 5vw, 26px)',
          textAlign: 'center',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 'clamp(36px, 12vw, 62px)', lineHeight: 0.9, fontWeight: 900, letterSpacing: -2, fontFamily: 'Space Grotesk, sans-serif' }}>
          {headline}
        </h1>
        <p style={{ margin: '12px 0 26px', fontSize: 14, fontWeight: 900 }}>
          {subtitle}
        </p>

        <div
          style={{
            background: '#050505',
            color: '#fff',
            padding: '22px 16px',
            margin: '0 auto 24px',
            borderRadius: 8,
            transform: 'rotate(1.5deg)',
            border: '3px solid #000',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>
            Final Score
          </div>
          <div className="score-pop" style={{ fontSize: 'clamp(56px, 18vw, 96px)', lineHeight: 0.9, fontWeight: 900, color: '#F5C518', letterSpacing: -4 }}>
            {score}
          </div>
        </div>

        <div className="neo-border" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 14px', marginBottom: 22, fontWeight: 900, fontSize: 13 }}>
          <span>Your Personal Best</span>
          <span style={{ color: '#3B7FF5' }}>{personalBest}</span>
        </div>

        <div className="neo-border" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 14px', marginBottom: 24, fontWeight: 900, fontSize: 13 }}>
          <span>Mode Played</span>
          <span>{difficulty}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
          <button
            className="neo-border neo-shadow neo-button"
            onClick={() => {
              buzz(20);
              onPlayAgain();
            }}
            style={{ minHeight: 58, background: '#3B7FF5', color: '#fff', borderRadius: 8, fontWeight: 900, letterSpacing: 1.5, cursor: 'pointer', textTransform: 'uppercase' }}
          >
            Play Again
          </button>
          <button
            className="neo-border neo-shadow neo-button"
            onClick={handleShare}
            style={{ minHeight: 58, background: '#fff', color: '#000', borderRadius: 8, fontWeight: 900, letterSpacing: 1.5, cursor: 'pointer', textTransform: 'uppercase' }}
          >
            Share
          </button>
        </div>

        <button
          className="neo-button score-link-button"
          onClick={() => {
            buzz(12);
            onChangeDifficulty();
          }}
          style={{ marginTop: 20, background: 'transparent', border: 0, color: '#000', fontWeight: 900, letterSpacing: 1.5, cursor: 'pointer', textTransform: 'uppercase' }}
        >
          Change Difficulty
        </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [quizItems, setQuizItems] = useState<NewsItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const savedTheme = getThemePreference();
    if (savedTheme) return savedTheme === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [timeLeft, setTimeLeft] = useState(GAME_CONFIG.TIMER_SECONDS);
  const [userGuess, setUserGuess] = useState<'REAL' | 'FAKE' | 'TIMEOUT' | null>(null);
  const timerRef = useRef<number | null>(null);
  const imagePreloadRef = useRef<Set<string>>(new Set());
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window === 'undefined' ? 0 : window.innerHeight
  );

  const [gameState, setGameState] = useState<QuizState>({
    currentRound: 1,
    totalRoundsPlayed: 0,
    score: 0,
    streak: 0,
    lives: GAME_CONFIG.MAX_LIVES,
    history: [],
    status: 'IDLE',
    difficulty: 'Medium',
    highScore: getHighScore(),
  });

  useEffect(() => {
    preloadAllDifficulties();
    startMusic();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateViewportHeight = () => {
      setViewportHeight(window.innerHeight);
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    };

    updateViewportHeight();
    window.addEventListener('resize', updateViewportHeight);
    window.addEventListener('orientationchange', updateViewportHeight);
    window.visualViewport?.addEventListener('resize', updateViewportHeight);

    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('orientationchange', updateViewportHeight);
      window.visualViewport?.removeEventListener('resize', updateViewportHeight);
    };
  }, []);

  const preloadImage = useCallback((url?: string) => {
    if (typeof window === 'undefined' || !url || imagePreloadRef.current.has(url)) return;

    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    imagePreloadRef.current.add(url);
  }, []);

  const preloadUpcomingImages = useCallback((items: NewsItem[], startIndex: number, count = 4) => {
    items.slice(startIndex, startIndex + count).forEach(item => preloadImage(item.imageUrl));
  }, [preloadImage]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopMusic();
        return;
      }

      if (soundOn) {
        startMusic();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', stopMusic);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', stopMusic);
    };
  }, [soundOn]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const savedTheme = getThemePreference();

    if (!savedTheme) {
      setIsDarkMode(mediaQuery.matches);
    }

    const handleThemeChange = (event: MediaQueryListEvent) => {
      if (!getThemePreference()) {
        setIsDarkMode(event.matches);
      }
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleThemeChange);
      return () => mediaQuery.removeEventListener('change', handleThemeChange);
    }

    mediaQuery.addListener(handleThemeChange);
    return () => mediaQuery.removeListener(handleThemeChange);
  }, []);

  useEffect(() => {
    if (gameState.status === 'GAME_OVER') {
      const saved = getHighScore();
      if (gameState.score > saved) {
        setHighScore(gameState.score);
      }
      playSound('GAMEOVER');
    }
  }, [gameState.status, gameState.score]);

  useEffect(() => {
    if (!quizItems.length) return;
    preloadUpcomingImages(quizItems, currentIndex, 4);
  }, [quizItems, currentIndex, preloadUpcomingImages]);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setTimeLeft(GAME_CONFIG.TIMER_SECONDS);
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          stopTimer();
          setGameState(s => ({ ...s, status: 'GAME_OVER' }));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stopTimer]);

  useEffect(() => {
    if (gameState.status === 'PLAYING') {
      startTimer();
    } else {
      stopTimer();
    }
    return stopTimer;
  }, [gameState.status, currentIndex, startTimer, stopTimer]);

  const toggleSound = () => {
    buzz(12);
    if (soundOn) {
      stopMusic();
    } else {
      startMusic();
    }
    setSoundOn(prev => !prev);
  };

  const toggleTheme = () => {
    buzz(12);
    setIsDarkMode(prev => {
      const nextIsDark = !prev;
      setThemePreference(nextIsDark ? 'dark' : 'light');
      return nextIsDark;
    });
  };

  const startGame = async (difficulty: 'Easy' | 'Medium' | 'Hard') => {
    buzz(20);
    playSound('CLICK');
    setLoading(true);
    stopTimer();
    setUserGuess(null);
    setGameState(prev => ({
      ...prev,
      score: 0,
      streak: 0,
      lives: GAME_CONFIG.MAX_LIVES,
      status: 'IDLE',
      difficulty,
    }));

    try {
      const items = await Promise.race([
        generateQuizRound(5, difficulty),
        new Promise<NewsItem[]>(res => setTimeout(() => res([]), 15000)),
      ]);
      setQuizItems(items && items.length ? items : getEmergencyFallbackRound(5, difficulty));
      preloadRound(difficulty);
    } catch {
      setQuizItems(getEmergencyFallbackRound(5, difficulty));
      preloadRound(difficulty);
    }
    setCurrentIndex(0);

    setTimeout(() => {
      setLoading(false);
      setGameState(prev => ({ ...prev, status: 'PLAYING' }));
    }, 300);
  };

  const handleVote = useCallback(
    (vote: 'REAL' | 'FAKE') => {
      if (gameState.status !== 'PLAYING') return;
      navigator.vibrate?.(15);

      const currentItem = quizItems[currentIndex];
      if (!currentItem) return;

      const isCorrect = vote === currentItem.type;
      const newLives = isCorrect ? gameState.lives : gameState.lives - 1;
      const willGameOver = newLives <= 0;

      setUserGuess(vote);
      setGameState(prev => {
        const newStreak = isCorrect ? prev.streak + 1 : 0;
        const bonus = newStreak >= 3 ? newStreak * 20 : 0;
        const newScore = prev.score + (isCorrect ? 100 + bonus : 0);
        return {
          ...prev,
          score: newScore,
          streak: newStreak,
          lives: newLives,
          status: willGameOver ? 'GAME_OVER' : 'ANALYSIS',
        };
      });
    },
    [quizItems, currentIndex, gameState.status, gameState.lives]
  );

  const nextQuestion = useCallback(async () => {
    setUserGuess(null);
    if (currentIndex < quizItems.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setGameState(prev => ({ ...prev, status: 'PLAYING' }));
      return;
    }

    setLoading(true);
    try {
      const nextItems = await generateQuizRound(5, gameState.difficulty);
      setQuizItems(nextItems && nextItems.length ? nextItems : getEmergencyFallbackRound(5, gameState.difficulty));
      preloadRound(gameState.difficulty);
    } catch {
      setQuizItems(getEmergencyFallbackRound(5, gameState.difficulty));
    }
    setCurrentIndex(0);
    setGameState(prev => ({ ...prev, status: 'PLAYING' }));
    setLoading(false);
  }, [currentIndex, quizItems.length, gameState.difficulty]);

  const skipQuestion = () => {
    buzz(10);
    playSound('CLICK');
    nextQuestion();
  };

  const showDifficultyScreen = () => {
    stopTimer();
    setUserGuess(null);
    setGameState(prev => ({ ...prev, status: 'IDLE' }));
  };

  useEffect(() => {
    if (gameState.status !== 'ANALYSIS') return;
    const t = setTimeout(() => {
      nextQuestion();
    }, 10000);
    return () => clearTimeout(t);
  }, [gameState.status, nextQuestion]);

  if (loading) return <LoadingScreen />;
  if (gameState.status === 'IDLE') {
    return (
      <StartScreen
        onStart={startGame}
        isDarkMode={isDarkMode}
      />
    );
  }
  if (gameState.status === 'GAME_OVER') {
    return (
      <ScoreBoard
        score={gameState.score}
        highScore={Math.max(gameState.highScore, getHighScore())}
        difficulty={gameState.difficulty}
        onPlayAgain={() => startGame(gameState.difficulty)}
        onChangeDifficulty={showDifficultyScreen}
      />
    );
  }

  const currentItem = quizItems[currentIndex];
  const isUrgent = timeLeft <= 8;
  const totalItems = quizItems.length || 5;
  const timerPercentage = (timeLeft / GAME_CONFIG.TIMER_SECONDS) * 100;

  const bgColor = '#F5C518';
  const cardBg = isDarkMode ? '#2a2a2a' : '#fff';
  const textColor = isDarkMode ? '#fff' : '#000';
  const headerBg = isDarkMode ? '#111' : '#fff';
  const borderColor = isDarkMode ? '#fff' : '#000';
  const mutedTextColor = isDarkMode ? '#aaa' : '#666';
  const appHeight = viewportHeight ? `${viewportHeight}px` : '100dvh';

  return (
    <div
      style={{
        height: appHeight,
        minHeight: appHeight,
        maxHeight: appHeight,
        background: bgColor,
        display: 'flex',
        flexDirection: 'column',
        color: textColor,
        overflow: 'hidden',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {gameState.status === 'ANALYSIS' && currentItem && userGuess && (
        <AnalysisModal item={currentItem} userGuess={userGuess} onNext={nextQuestion} />
      )}

      <header
        style={{
          background: headerBg,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          borderBottom: `3px solid ${borderColor}`,
        }}
      >
        <LogoMark size={42} fontSize={14} borderColor={borderColor} shadowColor={borderColor} rounded={8} />

        <div style={{ display: 'flex', gap: 24, flex: 1, justifyContent: 'center', flexWrap: 'wrap', minWidth: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: mutedTextColor, letterSpacing: 1.2, textTransform: 'uppercase' }}>STREAK</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: textColor, lineHeight: 1 }}>{gameState.streak}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: mutedTextColor, letterSpacing: 1.2, textTransform: 'uppercase' }}>SCORE</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#3B7FF5', lineHeight: 1 }}>{gameState.score}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexShrink: 0, marginLeft: 'auto' }}>
          <button
            onClick={toggleSound}
            className="neo-border neo-shadow-sm neo-button"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: soundOn ? '#2DBD6E' : '#E53E3E',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <SpeakerIcon muted={!soundOn} />
          </button>
          <button
            onClick={toggleTheme}
            className="neo-border neo-shadow-sm neo-button"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#F5C518',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000',
            }}
          >
            <ThemeIcon dark={isDarkMode} />
          </button>
        </div>
      </header>

      <div
        style={{
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          background: headerBg,
          borderBottom: isDarkMode ? '1px solid #333' : '1px solid #eee',
        }}
      >
        <div
          className="neo-border"
          style={{
            background: isDarkMode ? '#333' : '#000',
            color: '#fff',
            fontWeight: 900,
            fontSize: 12,
            letterSpacing: 1.5,
            padding: '6px 14px',
            borderRadius: 4,
            textTransform: 'uppercase',
          }}
        >
          ROUND {currentIndex + 1}/{totalItems}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Array.from({ length: GAME_CONFIG.MAX_LIVES }).map((_, i) => (
            <div
              key={i}
              className="neo-border"
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: i < gameState.lives ? '#E53E3E' : isDarkMode ? '#444' : '#ddd',
              }}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 680,
          boxSizing: 'border-box',
          margin: '0 auto',
          padding: '10px 16px 12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {currentItem ? (
          <GameCard
            item={currentItem}
            onVote={handleVote}
            disabled={gameState.status === 'ANALYSIS'}
            difficulty={gameState.difficulty}
            isDarkMode={isDarkMode}
          />
        ) : (
          <div style={{ fontSize: 18, fontWeight: 800, color: textColor }}>LOADING...</div>
        )}
      </div>

      <div
        style={{
          padding: '12px 16px calc(env(safe-area-inset-bottom, 0px) + 12px)',
          background: headerBg,
          borderTop: `3px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div
          className="neo-border"
          style={{
            flex: '1 1 240px',
            height: 32,
            background: cardBg,
            borderRadius: 16,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: `${Math.max(timerPercentage, 0)}%`,
              height: '100%',
              background: isUrgent ? '#E53E3E' : '#3B7FF5',
              transition: 'width 1s linear, background 0.3s',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 900,
              color: timerPercentage < 55 ? textColor : '#fff',
              letterSpacing: 0.5,
            }}
          >
            {timeLeft}s
          </div>
        </div>

        <button
          onClick={skipQuestion}
          className="neo-border neo-shadow-sm neo-button"
          style={{
            flex: '1 1 160px',
            padding: '0 20px',
            minHeight: 44,
            background: cardBg,
            color: textColor,
            fontWeight: 900,
            fontSize: 14,
            letterSpacing: 1,
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ fontSize: 16 }}>{'>>'}</span> SKIP
        </button>
      </div>
    </div>
  );
};

export default App;
