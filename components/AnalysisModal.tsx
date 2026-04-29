import React from 'react';
import { NewsItem, VerificationResult } from '../types';
import { playSound } from '../services/audioService';

interface Props {
  item: NewsItem;
  userGuess: 'REAL' | 'FAKE' | 'TIMEOUT';
  verification?: VerificationResult | string | any;
  onClose?: () => void;
  onNext: () => void;
}

function buildFallbackExplanation(item: NewsItem) {
  const verdict = item.type === 'REAL' ? 'REAL' : 'FAKE';
  const category = item.category ? `${item.category.toLowerCase()} reference material` : 'trusted reference material';

  if (item.type === 'REAL') {
    return `Correct answer: ${verdict}. This statement matches the quiz source and aligns with ${category}.`;
  }

  return `Correct answer: ${verdict}. This claim does not line up with the quiz source and was treated as false against ${category}.`;
}

function formatFactCheckText(item: NewsItem, fallbackReasoning?: string) {
  const rawText = (item.summary || item.explanation || fallbackReasoning || '').trim();

  if (!rawText) {
    return {
      title: item.type === 'REAL' ? 'Why This Is Real' : 'Why This Is Fake',
      verdictLine: `Correct answer: ${item.type}.`,
      detailLine: buildFallbackExplanation(item).replace(`Correct answer: ${item.type}. `, ''),
    };
  }

  const cleanedText = rawText
    .replace(/^Quick snippet:\s*/i, '')
    .replace(/^Fact check:\s*/i, '')
    .replace(/snippet was not ready in time/gi, 'supporting details were limited in this round')
    .trim();

  const verdictMatch = cleanedText.match(/^Correct answer:\s*(REAL|FAKE)\.\s*/i);
  const verdictLine = verdictMatch ? `Correct answer: ${verdictMatch[1].toUpperCase()}.` : `Correct answer: ${item.type}.`;
  let detailLine = verdictMatch ? cleanedText.replace(verdictMatch[0], '').trim() : cleanedText;

  detailLine = detailLine
    .replace(/^Quick context from Wikipedia\s*\([^)]*\):\s*/i, '')
    .replace(/^Quick snippet:\s*/i, '')
    .replace(/^Fact check:\s*/i, '')
    .replace(/^This statement was checked against the quiz database,\s*/i, '')
    .replace(
      /^but extra encyclopedia context was not available before the round started\.?/i,
      'This one was checked against the quiz source, but extra supporting context was limited in this round.'
    )
    .trim();

  if (!detailLine) {
    detailLine = buildFallbackExplanation(item).replace(`Correct answer: ${item.type}. `, '');
  }

  return {
    title: item.type === 'REAL' ? 'Why This Is Real' : 'Why This Is Fake',
    verdictLine,
    detailLine,
  };
}

const AnalysisModal: React.FC<Props> = ({ item, userGuess, verification, onNext }) => {
  let v: VerificationResult = {
    authenticityScore: 50,
    verdict: 'UNCERTAIN',
    reasoning: 'No verification available.',
    sources: [],
    usedSearch: false,
    visualArtifacts: [],
  };

  try {
    if (typeof verification === 'string') {
      const maybe = JSON.parse(verification);
      v = {
        authenticityScore: Number(maybe.authenticityScore ?? 50),
        verdict: (maybe.verdict ?? 'UNCERTAIN').toUpperCase(),
        reasoning: maybe.reasoning ?? 'No explanation provided.',
        sources: maybe.sources ?? [],
        usedSearch: !!maybe.usedSearch,
        visualArtifacts: maybe.visualArtifacts ?? [],
      };
    } else if (verification) {
      v = {
        authenticityScore: Number(verification.authenticityScore ?? 50),
        verdict: (verification.verdict ?? 'UNCERTAIN').toUpperCase(),
        reasoning: verification.reasoning ?? 'No explanation provided.',
        sources: verification.sources ?? [],
        usedSearch: !!verification.usedSearch,
        visualArtifacts: verification.visualArtifacts ?? [],
      };
    }
  } catch (e) {
    console.warn('Error parsing verification:', e, verification);
  }

  const correct = userGuess === item.type;
  const playerLabel = userGuess === 'TIMEOUT' ? 'TIME UP' : userGuess;
  const factCheck = formatFactCheckText(item, v.reasoning);
  const sourceLabel = item.source && item.source !== 'Fallback question bank' ? item.source : '';
  const cardTitle = userGuess === 'TIMEOUT' ? 'TOO SLOW!' : correct ? 'NAILED IT!' : 'NOPE!';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '20px',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          width: '100%',
          maxWidth: 420,
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div
          style={{
            background: correct ? '#2DBD6E' : '#E53E3E',
            padding: '28px 24px',
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              fontSize: 36,
              fontWeight: 900,
              color: '#fff',
              margin: 0,
              letterSpacing: 1.2,
            }}
          >
            {cardTitle}
          </h1>
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.9)',
              margin: '8px 0 0',
              letterSpacing: 0.5,
            }}
          >
            You: <b>{playerLabel}</b> &nbsp; vs &nbsp; Truth: <b>{item.type}</b>
          </p>
        </div>

        <div style={{ padding: '24px 24px 20px' }}>
          <div
            style={{
              border: '2px solid #111',
              borderRadius: 12,
              padding: '16px',
              marginBottom: 18,
              background: '#fafafa',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  background: '#3B7FF5',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                i
              </div>
              <h3
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#3B7FF5',
                  margin: 0,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                {factCheck.title}
              </h3>
            </div>

            <div
              style={{
                fontSize: 15,
                fontWeight: 900,
                color: '#111',
                marginBottom: 8,
                lineHeight: 1.4,
              }}
            >
              {factCheck.verdictLine}
            </div>

            <p
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: '#333',
                margin: 0,
                lineHeight: 1.6,
                wordWrap: 'break-word',
              }}
            >
              {factCheck.detailLine}
            </p>

            {sourceLabel ? (
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: '1px solid #d9d9d9',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#555',
                  wordBreak: 'break-word',
                }}
              >
                Source: {sourceLabel}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          <button
            className="neo-button"
            onClick={() => {
              navigator.vibrate?.(12);
              playSound('CLICK');
              onNext();
            }}
            style={{
              width: '100%',
              padding: '16px 0',
              background: '#111',
              color: '#fff',
              fontWeight: 900,
              fontSize: 16,
              letterSpacing: 1.5,
              border: '3px solid #000',
              borderRadius: 12,
              cursor: 'pointer',
              textTransform: 'uppercase',
              boxShadow: '4px 4px 0px 0px #000',
            }}
          >
            Next Round
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;
