import { NewsItem } from '../types';
import { getSeenHeadlines, setSeenHeadlines } from '../utils/storage';

const TRIVIA_ENDPOINT = 'https://opentdb.com/api.php';
const WIKIPEDIA_SEARCH_ENDPOINT = 'https://en.wikipedia.org/w/api.php';
const WIKIPEDIA_SUMMARY_ENDPOINT = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const MAX_RECENT_HEADLINES = 120;
const SUMMARY_TIMEOUT_MS = 3500;
const DEFAULT_ROUND_SIZE = 5;
const QUEUE_TARGET_ITEMS = 10;
const PRELOAD_IMAGE_COUNT = 4;

type GameDifficulty = 'Easy' | 'Medium' | 'Hard';
type WikipediaContext = {
  title: string;
  extract: string;
  pageUrl?: string;
  thumbnailUrl?: string;
};

const onlineQueues: Record<GameDifficulty, NewsItem[]> = {
  Easy: [],
  Medium: [],
  Hard: [],
};

const queueWarmups: Partial<Record<GameDifficulty, Promise<void>>> = {};
const preloadedImageUrls = new Set<string>();
const recentHeadlines: string[] = getSeenHeadlines();

const FALLBACK_ITEMS: Array<Omit<NewsItem, 'id'>> = [
  {
    headline: 'Octopuses have three hearts',
    summary: 'This statement is real. Octopuses have two hearts that move blood through the gills and one that moves blood through the body.',
    type: 'REAL',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Easy',
    explanation: 'This statement is real. Octopuses have a three-heart circulatory system.',
    imagePrompt: 'octopus underwater marine biology',
    title: 'Octopuses have three hearts',
  } as any,
  {
    headline: 'Humans can breathe normally in space without a suit',
    summary: 'This statement is fake. Space is a near-vacuum, and humans need pressure and oxygen to survive there.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Easy',
    explanation: 'This statement is fake. Astronauts need spacesuits or pressurized spacecraft.',
    imagePrompt: 'astronaut spacesuit outer space',
    title: 'Humans can breathe normally in space without a suit',
  } as any,
  {
    headline: 'The Great Wall of China was built in a single weekend',
    summary: 'This statement is fake. The wall system was built, rebuilt, and expanded across many centuries.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Culture',
    difficulty: 'Easy',
    explanation: 'This statement is fake. The Great Wall was a long-term construction effort across multiple dynasties.',
    imagePrompt: 'great wall of china mountain landscape',
    title: 'The Great Wall of China was built in a single weekend',
  } as any,
  {
    headline: 'Lightning can strike the same place more than once',
    summary: 'This statement is real. Tall buildings, towers, and exposed objects can be struck repeatedly.',
    type: 'REAL',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Easy',
    explanation: 'This statement is real. The idea that lightning never strikes twice is a myth.',
    imagePrompt: 'lightning storm tall skyscraper',
    title: 'Lightning can strike the same place more than once',
  } as any,
  {
    headline: 'A computer virus can spread through a glass of water',
    summary: 'This statement is fake. Computer viruses are malicious code, not biological germs in drinking water.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Tech',
    difficulty: 'Easy',
    explanation: 'This statement is fake. Digital malware spreads through computer systems and networks.',
    imagePrompt: 'computer virus warning screen glass water desk',
    title: 'A computer virus can spread through a glass of water',
  } as any,
  {
    headline: 'The human heart has four chambers',
    summary: 'This statement is real. The heart has two atria and two ventricles.',
    type: 'REAL',
    imageUrl: '',
    category: 'Health',
    difficulty: 'Easy',
    explanation: 'This statement is real. A human heart has four chambers.',
    imagePrompt: 'human heart medical illustration doctor',
    title: 'The human heart has four chambers',
  } as any,
  {
    headline: 'Sound travels faster in air than in water',
    summary: 'This statement is fake. Sound usually travels faster in water than in air.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Medium',
    explanation: 'This statement is fake. Sound waves move faster through water because its particles are closer together.',
    imagePrompt: 'sound wave underwater ocean science',
    title: 'Sound travels faster in air than in water',
  } as any,
  {
    headline: 'The first programmable computers were the size of modern smartphones',
    summary: 'This statement is fake. Early programmable computers were room-sized machines.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Tech',
    difficulty: 'Easy',
    explanation: 'This statement is fake. Early computers used large cabinets, cables, tubes, and panels.',
    imagePrompt: 'vintage room sized computer old technology',
    title: 'The first programmable computers were the size of modern smartphones',
  } as any,
  {
    headline: 'Some mushrooms can glow in the dark',
    summary: 'This statement is real. Some fungi are bioluminescent and can produce visible light.',
    type: 'REAL',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Medium',
    explanation: 'This statement is real. Bioluminescent fungi exist in nature.',
    imagePrompt: 'glowing mushrooms dark forest bioluminescent fungi',
    title: 'Some mushrooms can glow in the dark',
  } as any,
  {
    headline: 'Every country in the world uses the exact same currency',
    summary: 'This statement is fake. Countries and regions use many different currencies.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Politics',
    difficulty: 'Easy',
    explanation: 'This statement is fake. Examples include the dollar, euro, yen, rupee, pound, and many more.',
    imagePrompt: 'international money currencies banknotes coins',
    title: 'Every country in the world uses the exact same currency',
  } as any,
  {
    headline: 'Vaccines train the immune system to recognize specific threats',
    summary: 'This statement is real. Vaccines help the immune system prepare defenses against certain diseases.',
    type: 'REAL',
    imageUrl: '',
    category: 'Health',
    difficulty: 'Medium',
    explanation: 'This statement is real. Vaccines work by preparing immune memory.',
    imagePrompt: 'vaccine syringe immune system medical clinic',
    title: 'Vaccines train the immune system to recognize specific threats',
  } as any,
  {
    headline: 'The Moon produces its own sunlight like a small star',
    summary: 'This statement is fake. The Moon appears bright because it reflects sunlight.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Easy',
    explanation: 'This statement is fake. The Moon reflects light from the Sun.',
    imagePrompt: 'moon night sky reflected sunlight',
    title: 'The Moon produces its own sunlight like a small star',
  } as any,
];

async function fetchTriviaQuestions(count: number, difficulty: GameDifficulty) {
  const url = new URL(TRIVIA_ENDPOINT);
  url.searchParams.set('amount', String(count));
  url.searchParams.set('type', 'boolean');
  url.searchParams.set('difficulty', difficulty.toLowerCase());

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Trivia request failed');

  const data = await res.json();
  if (!Array.isArray(data?.results) || data.response_code !== 0) {
    throw new Error('No trivia results');
  }

  return data.results;
}

function withTimeout<T>(promise: Promise<T>, fallback: T, timeoutMs = SUMMARY_TIMEOUT_MS): Promise<T> {
  return new Promise(resolve => {
    const timeout = window.setTimeout(() => resolve(fallback), timeoutMs);

    promise
      .then(resolve)
      .catch(() => resolve(fallback))
      .finally(() => window.clearTimeout(timeout));
  });
}

function decodeHtml(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function normalizeHeadline(headline: string) {
  return headline.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function cleanStatementForSearch(statement: string) {
  return statement
    .replace(/^(is|are|was|were|do|does|did|can|could|would|should)\s+/i, '')
    .replace(/\?$/g, '')
    .replace(/\b(true|false)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchWikipediaContext(statement: string): Promise<WikipediaContext | null> {
  const searchUrl = new URL(WIKIPEDIA_SEARCH_ENDPOINT);
  searchUrl.searchParams.set('action', 'query');
  searchUrl.searchParams.set('list', 'search');
  searchUrl.searchParams.set('format', 'json');
  searchUrl.searchParams.set('origin', '*');
  searchUrl.searchParams.set('srlimit', '1');
  searchUrl.searchParams.set('srsearch', cleanStatementForSearch(statement));

  const searchRes = await fetch(searchUrl.toString());
  if (!searchRes.ok) return null;

  const searchData = await searchRes.json();
  const bestTitle = searchData?.query?.search?.[0]?.title;
  if (!bestTitle) return null;

  const summaryRes = await fetch(`${WIKIPEDIA_SUMMARY_ENDPOINT}/${encodeURIComponent(bestTitle)}`);
  if (!summaryRes.ok) return null;

  const summaryData = await summaryRes.json();
  const extract = String(summaryData?.extract || '').trim();
  if (!extract) return null;

  return {
    title: String(summaryData?.title || bestTitle),
    extract,
    pageUrl: summaryData?.content_urls?.desktop?.page,
    thumbnailUrl: summaryData?.thumbnail?.source,
  };
}

async function getWikipediaContext(statement: string) {
  return withTimeout(fetchWikipediaContext(statement), null);
}

function rememberHeadlines(items: NewsItem[]) {
  for (const item of items) {
    const normalized = normalizeHeadline(item.headline || item.title || '');
    if (!normalized || recentHeadlines.includes(normalized)) continue;
    recentHeadlines.unshift(normalized);
  }

  if (recentHeadlines.length > MAX_RECENT_HEADLINES) {
    recentHeadlines.length = MAX_RECENT_HEADLINES;
  }

  setSeenHeadlines(recentHeadlines);
}

function isRecentHeadline(headline: string) {
  return recentHeadlines.includes(normalizeHeadline(headline));
}

function isQueuedHeadline(headline: string, difficulty: GameDifficulty) {
  const normalized = normalizeHeadline(headline);
  return onlineQueues[difficulty].some(item => normalizeHeadline(item.headline || item.title || '') === normalized);
}

function primeImage(url?: string) {
  if (typeof window === 'undefined' || !url || preloadedImageUrls.has(url)) return;

  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  preloadedImageUrls.add(url);
}

function primeImagesForItems(items: NewsItem[], count = PRELOAD_IMAGE_COUNT) {
  items.slice(0, count).forEach(item => primeImage(item.imageUrl));
}

function getSafeImageUrl(context?: WikipediaContext | null, imagePrompt?: string, category?: string) {
  return context?.thumbnailUrl || getCategoryImageUrl(category || 'Culture');
}

function getCategoryImageUrl(category: string) {
  const imageIds: Record<string, string> = {
    Science: 'photo-1532094349884-543bc11b234d',
    Tech: 'photo-1518770660439-4636190af475',
    Politics: 'photo-1529107386315-e1a2ed48a620',
    Culture: 'photo-1529156069898-49953e39b3ac',
    Health: 'photo-1505751172876-fa1923c5c528',
  };

  const imageId = imageIds[category] || imageIds.Culture;
  return `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=900&q=78`;
}

function getGameCategory(triviaCategory?: string): NewsItem['category'] {
  const category = (triviaCategory || '').toLowerCase();

  if (category.includes('science') || category.includes('nature') || category.includes('math')) return 'Science';
  if (category.includes('computer') || category.includes('gadget')) return 'Tech';
  if (category.includes('politics') || category.includes('history') || category.includes('geography')) return 'Politics';
  if (category.includes('animal') || category.includes('sport') || category.includes('film') || category.includes('music') || category.includes('book')) return 'Culture';
  return 'Culture';
}

function getGameDifficulty(triviaDifficulty?: string): NewsItem['difficulty'] {
  if (triviaDifficulty === 'easy') return 'Easy';
  if (triviaDifficulty === 'hard') return 'Hard';
  return 'Medium';
}

function buildTruthSummary(statement: string, isReal: boolean, context?: WikipediaContext | null) {
  const truthLine = `Correct answer: ${isReal ? 'REAL' : 'FAKE'}.`;

  if (!context) {
    return `${truthLine} This statement was checked against the quiz database, but extra encyclopedia context was not available before the round started.`;
  }

  const trimmedExtract = context.extract.length > 420
    ? `${context.extract.slice(0, 420).replace(/\s+\S*$/, '')}...`
    : context.extract;

  return `${truthLine}\n\nQuick context from Wikipedia (${context.title}): ${trimmedExtract}`;
}

async function mapTriviaToNewsItem(item: any, index: number): Promise<NewsItem> {
  const statement = decodeHtml(String(item.question || 'No statement')).replace(/\s+/g, ' ').trim();
  const isReal = item.correct_answer === 'True';
  const category = getGameCategory(item.category);
  const difficulty = getGameDifficulty(item.difficulty);
  const imagePrompt = `${statement} trivia quiz ${category}`;
  const wikiContext = await getWikipediaContext(statement);
  const summary = buildTruthSummary(statement, isReal, wikiContext);

  return {
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    title: statement,
    headline: statement,
    type: isReal ? 'REAL' : 'FAKE',
    imageUrl: getSafeImageUrl(wikiContext, imagePrompt, category),
    summary,
    explanation: summary,
    category,
    difficulty,
    source: wikiContext?.pageUrl || 'Open Trivia Database',
    imagePrompt,
  };
}

function mapFallbackToNewsItem(item: Omit<NewsItem, 'id'>, index: number): NewsItem {
  const headline = item.headline || item.title || 'No statement';
  const category = item.category || 'Culture';

  return {
    ...item,
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    title: headline,
    headline,
    imageUrl: getSafeImageUrl(null, item.imagePrompt || headline, category),
    source: 'Fallback question bank',
  } as NewsItem;
}

function uniqueOnly(items: NewsItem[], difficulty?: GameDifficulty) {
  const seenThisBatch = new Set<string>();

  return items.filter(item => {
    const normalized = normalizeHeadline(item.headline);
    if (!normalized || isRecentHeadline(item.headline) || seenThisBatch.has(normalized)) {
      return false;
    }

    if (difficulty && isQueuedHeadline(item.headline, difficulty)) {
      return false;
    }

    seenThisBatch.add(normalized);
    return true;
  });
}

function getFallbackRound(count: number, difficulty: GameDifficulty = 'Medium'): NewsItem[] {
  const difficultyPool = FALLBACK_ITEMS.filter(item => item.difficulty === difficulty);
  const sourcePool = difficultyPool.length ? difficultyPool : FALLBACK_ITEMS;
  const shuffled = [...sourcePool].sort(() => Math.random() - 0.5);
  const unique = shuffled
    .filter(item => !isRecentHeadline(item.headline))
    .slice(0, count)
    .map((item, index) => mapFallbackToNewsItem(item, index));

  const mapped = unique.length >= count
    ? unique
    : shuffled.slice(0, count).map((item, index) => mapFallbackToNewsItem(item, index));

  rememberHeadlines(mapped);
  primeImagesForItems(mapped, count);
  return mapped;
}

export function getEmergencyFallbackRound(count = DEFAULT_ROUND_SIZE, difficulty: GameDifficulty = 'Medium') {
  return getFallbackRound(count, difficulty);
}

async function fetchFreshPool(count: number, difficulty: GameDifficulty): Promise<NewsItem[]> {
  const requestedCount = Math.min(50, Math.max(count + 8, count * 3));
  const triviaItems = await fetchTriviaQuestions(requestedCount, difficulty);
  const mappedItems = await Promise.all(triviaItems.map(mapTriviaToNewsItem));
  return uniqueOnly(mappedItems, difficulty);
}

async function requestFreshRound(count: number, difficulty: GameDifficulty): Promise<NewsItem[]> {
  const uniqueItems = await fetchFreshPool(count, difficulty);

  if (uniqueItems.length < count) {
    throw new Error('Not enough unique trivia statements');
  }

  const selected = uniqueItems.slice(0, count);
  rememberHeadlines(selected);
  primeImagesForItems(selected, count);
  return selected;
}

function takeQueuedRound(count: number, difficulty: GameDifficulty): NewsItem[] | null {
  const queue = onlineQueues[difficulty];
  if (queue.length < count) return null;

  const selected = queue.splice(0, count);
  rememberHeadlines(selected);
  primeImagesForItems(selected, count);
  primeImagesForItems(queue, PRELOAD_IMAGE_COUNT);
  return selected;
}

async function fillQueue(difficulty: GameDifficulty, targetItems = QUEUE_TARGET_ITEMS) {
  const queue = onlineQueues[difficulty];

  while (queue.length < targetItems) {
    const needed = Math.max(DEFAULT_ROUND_SIZE, targetItems - queue.length);
    const freshItems = await fetchFreshPool(needed, difficulty);
    const availableItems = freshItems.filter(item => !isQueuedHeadline(item.headline, difficulty));

    if (!availableItems.length) {
      break;
    }

    queue.push(...availableItems.slice(0, needed));
  }

  primeImagesForItems(queue, PRELOAD_IMAGE_COUNT);
}

export async function preloadRound(difficulty: GameDifficulty = 'Medium') {
  if (!queueWarmups[difficulty]) {
    queueWarmups[difficulty] = fillQueue(difficulty).catch(err => {
      console.error(err);
    }).finally(() => {
      delete queueWarmups[difficulty];
    });
  }

  await queueWarmups[difficulty];
}

export function preloadAllDifficulties() {
  void preloadRound('Easy');
  void preloadRound('Medium');
  void preloadRound('Hard');
}

export async function generateQuizRound(count = DEFAULT_ROUND_SIZE, difficulty: GameDifficulty = 'Medium'): Promise<NewsItem[]> {
  try {
    const queuedItems = takeQueuedRound(count, difficulty);
    if (queuedItems) {
      void preloadRound(difficulty);
      return queuedItems;
    }

    const freshItems = await requestFreshRound(count, difficulty);
    void preloadRound(difficulty);
    return freshItems;
  } catch (err) {
    console.error(err);
    return getFallbackRound(count, difficulty);
  }
}
