import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateQuizRound, getEmergencyFallbackRound, preloadRound } from './services/geminiService';
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
  'Interrogating Wikipedia in a dark room...',
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
