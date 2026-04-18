import React, { useState, useEffect, useRef } from 'react';
import { NewsItem } from '../types';
import { playSound } from '../services/audioService';

interface GameCardProps {
  item: NewsItem;
  onVote: (type: 'REAL' | 'FAKE') => void;
  disabled: boolean;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  isDarkMode?: boolean;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Science: { bg: '#F5C518', text: '#000' },
  Tech: { bg: '#3B7FF5', text: '#fff' },
  Politics: { bg: '#9B51E0', text: '#fff' },
  Culture: { bg: '#FF6B35', text: '#fff' },
  Health: { bg: '#2DBD6E', text: '#fff' },
};

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  Easy: { bg: '#fff7cc', text: '#000' },
  Medium: { bg: '#eef4ff', text: '#000' },
  Hard: { bg: '#ffe7e7', text: '#000' },
};

const FALLBACK_IMAGE = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
  <rect width="900" height="600" fill="#F5C518"/>
  <rect x="55" y="55" width="790" height="490" rx="28" fill="#fff" stroke="#000" stroke-width="18"/>
  <rect x="140" y="145" width="620" height="115" rx="10" fill="#111"/>
  <text x="450" y="224" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" font-weight="900" fill="#fff">FAKE?</text>
  <rect x="140" y="335" width="620" height="115" rx="10" fill="#3B7FF5"/>
  <text x="450" y="414" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" font-weight="900" fill="#fff">REAL?</text>
</svg>
`)}`;

const CATEGORY_IMAGE_URLS: Record<string, string> = {
  Science: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=900&q=78',
  Tech: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=78',
  Politics: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=900&q=78',
  Culture: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=78',
  Health: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=900&q=78',
};

const GameCard: React.FC<GameCardProps> = ({ item, onVote, disabled, difficulty, isDarkMode = false }) => {
  const [imgSrc, setImgSrc] = useState(item?.imageUrl || FALLBACK_IMAGE);
  const [loaded, setLoaded] = useState(false);
  const [imageFallbackStep, setImageFallbackStep] = useState(0);

  const hasVoted = useRef(false);

  useEffect(() => {
    setLoaded(false);
    setImageFallbackStep(0);
    setImgSrc(item?.imageUrl || FALLBACK_IMAGE);
    hasVoted.current = false;
  }, [item]);

  const handleInteraction = (type: 'REAL' | 'FAKE') => {
    if (disabled || hasVoted.current) return;
    hasVoted.current = true;
    navigator.vibrate?.([10, 30, 10]);
    playSound(type === 'REAL' ? 'SUCCESS' : 'FAIL');
    onVote(type);
  };

  const category = (item as any).category as string | undefined;
  const catStyle = category && CATEGORY_COLORS[category] ? CATEGORY_COLORS[category] : { bg: '#F5C518', text: '#000' };
  const diffStyle = DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS.Medium;
  const cardBg = isDarkMode ? '#2a2a2a' : '#fff';
  const imagePlaceholderBg = isDarkMode ? 'linear-gradient(90deg, #3a3a3a 25%, #4a4a4a 50%, #3a3a3a 75%)' : 'linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%)';

  return (
    <div className="select-none" style={{ width: '100%', maxWidth: 560, margin: '0 auto', minHeight: 0 }}>
      <div
        style={{
          position: 'relative',
        }}
      >
        <div className="neo-card" style={{ background: cardBg, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ position: 'relative', minHeight: 180, height: 'clamp(180px, 31vh, 280px)', background: isDarkMode ? '#444' : '#ddd', overflow: 'hidden', borderBottom: '3px solid #000' }}>
            {!loaded && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: imagePlaceholderBg,
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                }}
              />
            )}
            <img
              src={imgSrc}
              alt=""
              loading="eager"
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => {
                const categoryFallback = (category && CATEGORY_IMAGE_URLS[category]) || CATEGORY_IMAGE_URLS.Culture;

                if (imageFallbackStep === 0 && imgSrc !== categoryFallback) {
                  setImageFallbackStep(1);
                  setImgSrc(categoryFallback);
                  return;
                }

                if (imageFallbackStep <= 1 && imgSrc !== FALLBACK_IMAGE) {
                  setImageFallbackStep(2);
                  setImgSrc(FALLBACK_IMAGE);
                  return;
                }

                setLoaded(true);
              }}
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}
            />

            <div
              className="neo-border neo-shadow-sm"
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                background: isDarkMode ? '#333' : diffStyle.bg,
                color: isDarkMode ? '#fff' : diffStyle.text,
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: 1,
                padding: '4px 12px',
                borderRadius: 4,
                textTransform: 'uppercase',
              }}
            >
              {difficulty}
            </div>

            <div
              className="neo-border neo-shadow-sm"
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: catStyle.bg,
                color: catStyle.text,
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: 1,
                padding: '4px 12px',
                borderRadius: 4,
                textTransform: 'uppercase',
              }}
            >
              {category || 'SCIENCE'}
            </div>
          </div>

          <div style={{ padding: 'clamp(14px, 3.2vw, 22px)', background: cardBg }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
              <h2
                style={{
                  flex: 1,
                  margin: 0,
                  fontWeight: 900,
                  fontSize: 'clamp(18px, 3.8vw, 28px)',
                  lineHeight: 1.15,
                  color: isDarkMode ? '#fff' : '#000',
                  fontFamily: 'Space Grotesk, sans-serif',
                }}
              >
                {item.headline || (item as any).title}
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 4 }}>
              <button
                onClick={() => handleInteraction('FAKE')}
                disabled={disabled}
                className="neo-border neo-shadow neo-button"
                style={{
                  minHeight: 54,
                  padding: '14px 12px',
                  background: '#E53E3E',
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: 18,
                  letterSpacing: 1.5,
                  borderRadius: 12,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.7 : 1,
                }}
              >
                FAKE!
              </button>

              <button
                onClick={() => handleInteraction('REAL')}
                disabled={disabled}
                className="neo-border neo-shadow neo-button"
                style={{
                  minHeight: 54,
                  padding: '14px 12px',
                  background: '#2DBD6E',
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: 18,
                  letterSpacing: 1.5,
                  borderRadius: 12,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.7 : 1,
                }}
              >
                REAL!
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameCard;
