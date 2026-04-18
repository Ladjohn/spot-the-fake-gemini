import { NewsItem } from '../types';
import { getSeenHeadlines, setSeenHeadlines } from '../utils/storage';

const TRIVIA_ENDPOINT = 'https://opentdb.com/api.php';
const TRIVIA_TOKEN_ENDPOINT = 'https://opentdb.com/api_token.php';
const WIKIPEDIA_SEARCH_ENDPOINT = 'https://en.wikipedia.org/w/api.php';
const MAX_RECENT_HEADLINES = 120;
const SUMMARY_TIMEOUT_MS = 2800;
const DEFAULT_ROUND_SIZE = 5;
const QUEUE_TARGET_ITEMS = 10;
const PRELOAD_IMAGE_COUNT = 4;

type GameDifficulty = 'Easy' | 'Medium' | 'Hard';
type SearchSnippetContext = {
  title: string;
  snippet: string;
  pageUrl?: string;
};

type TriviaTokenResponse = {
  response_code: number;
  response_message?: string;
  token?: string;
};

const recentHeadlines: string[] = getSeenHeadlines();
const onlineQueues: Record<GameDifficulty, NewsItem[]> = {
  Easy: [],
  Medium: [],
  Hard: [],
};
const queueWarmups: Partial<Record<GameDifficulty, Promise<void>>> = {};
const preloadedImageUrls = new Set<string>();
const triviaTokens: Partial<Record<GameDifficulty, string>> = {};

const FALLBACK_ITEMS: Array<Omit<NewsItem, 'id'>> = [
  {
    headline: 'Octopuses have three hearts',
    summary: 'Correct answer: REAL. Fact check: Octopuses really do have three hearts - two move blood through the gills and one pumps it through the body.',
    type: 'REAL',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Easy',
    explanation: 'Correct answer: REAL. Fact check: Octopuses really do have three hearts - two move blood through the gills and one pumps it through the body.',
    imagePrompt: 'octopus underwater marine biology',
    title: 'Octopuses have three hearts',
  } as any,
  {
    headline: 'Humans can breathe normally in space without a suit',
    summary: 'Correct answer: FAKE. Fact check: Space is a near-vacuum, so humans need pressure and oxygen support to survive there.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Easy',
    explanation: 'Correct answer: FAKE. Fact check: Space is a near-vacuum, so humans need pressure and oxygen support to survive there.',
    imagePrompt: 'astronaut spacesuit outer space',
    title: 'Humans can breathe normally in space without a suit',
  } as any,
  {
    headline: 'The Great Wall of China was built in a single weekend',
    summary: 'Correct answer: FAKE. Fact check: The Great Wall was built and rebuilt over many centuries by different dynasties.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Culture',
    difficulty: 'Easy',
    explanation: 'Correct answer: FAKE. Fact check: The Great Wall was built and rebuilt over many centuries by different dynasties.',
    imagePrompt: 'great wall of china mountain landscape',
    title: 'The Great Wall of China was built in a single weekend',
  } as any,
  {
    headline: 'Lightning can strike the same place more than once',
    summary: 'Correct answer: REAL. Fact check: Tall buildings and exposed structures can be struck repeatedly during storms.',
    type: 'REAL',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Easy',
    explanation: 'Correct answer: REAL. Fact check: Tall buildings and exposed structures can be struck repeatedly during storms.',
    imagePrompt: 'lightning storm tall skyscraper',
    title: 'Lightning can strike the same place more than once',
  } as any,
  {
    headline: 'A computer virus can spread through a glass of water',
    summary: 'Correct answer: FAKE. Fact check: Computer viruses are malicious code, not biological germs that move through drinking water.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Tech',
    difficulty: 'Easy',
    explanation: 'Correct answer: FAKE. Fact check: Computer viruses are malicious code, not biological germs that move through drinking water.',
    imagePrompt: 'computer virus warning screen glass water desk',
    title: 'A computer virus can spread through a glass of water',
  } as any,
  {
    headline: 'The human heart has four chambers',
    summary: 'Correct answer: REAL. Fact check: A human heart is divided into two atria and two ventricles.',
    type: 'REAL',
    imageUrl: '',
    category: 'Health',
    difficulty: 'Easy',
    explanation: 'Correct answer: REAL. Fact check: A human heart is divided into two atria and two ventricles.',
    imagePrompt: 'human heart medical illustration doctor',
    title: 'The human heart has four chambers',
  } as any,
  {
    headline: 'Sound travels faster in air than in water',
    summary: 'Correct answer: FAKE. Fact check: Sound generally moves faster through water because the particles are packed more closely together.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Medium',
    explanation: 'Correct answer: FAKE. Fact check: Sound generally moves faster through water because the particles are packed more closely together.',
    imagePrompt: 'sound wave underwater ocean science',
    title: 'Sound travels faster in air than in water',
  } as any,
  {
    headline: 'Some mushrooms can glow in the dark',
    summary: 'Correct answer: REAL. Fact check: Some fungi are bioluminescent and can emit visible light in dark environments.',
    type: 'REAL',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Medium',
    explanation: 'Correct answer: REAL. Fact check: Some fungi are bioluminescent and can emit visible light in dark environments.',
    imagePrompt: 'glowing mushrooms dark forest bioluminescent fungi',
    title: 'Some mushrooms can glow in the dark',
  } as any,
  {
    headline: 'Vaccines train the immune system to recognize specific threats',
    summary: 'Correct answer: REAL. Fact check: Vaccines help build immune memory so the body can respond faster to certain diseases.',
    type: 'REAL',
    imageUrl: '',
    category: 'Health',
    difficulty: 'Medium',
    explanation: 'Correct answer: REAL. Fact check: Vaccines help build immune memory so the body can respond faster to certain diseases.',
    imagePrompt: 'vaccine syringe immune system medical clinic',
    title: 'Vaccines train the immune system to recognize specific threats',
  } as any,
  {
    headline: 'Bananas are naturally radioactive because they contain potassium',
    summary: 'Correct answer: REAL. Fact check: Bananas contain potassium, including a tiny amount of radioactive potassium-40.',
    type: 'REAL',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Medium',
    explanation: 'Correct answer: REAL. Fact check: Bananas contain potassium, including a tiny amount of radioactive potassium-40.',
    imagePrompt: 'bananas science radiation potassium',
    title: 'Bananas are naturally radioactive because they contain potassium',
  } as any,
  {
    headline: 'The speed of light changes depending on who is watching it in a vacuum',
    summary: 'Correct answer: FAKE. Fact check: In a vacuum, the speed of light is treated as a constant in modern physics.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Hard',
    explanation: 'Correct answer: FAKE. Fact check: In a vacuum, the speed of light is treated as a constant in modern physics.',
    imagePrompt: 'physics light beam vacuum relativity',
    title: 'The speed of light changes depending on who is watching it in a vacuum',
  } as any,
  {
    headline: 'A leap second is added because Earth rotates at a perfectly constant speed',
    summary: 'Correct answer: FAKE. Fact check: Leap seconds exist because Earth’s rotation is not perfectly uniform over time.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Hard',
    explanation: 'Correct answer: FAKE. Fact check: Leap seconds exist because Earth’s rotation is not perfectly uniform over time.',
    imagePrompt: 'earth rotation atomic clock astronomy',
    title: 'A leap second is added because Earth rotates at a perfectly constant speed',
  } as any,
  {
    headline: 'Sharks are older than trees in evolutionary history',
    summary: 'Correct answer: REAL. Fact check: Sharks appeared hundreds of millions of years ago, before the earliest trees evolved.',
    type: 'REAL',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Hard',
    explanation: 'Correct answer: REAL. Fact check: Sharks appeared hundreds of millions of years ago, before the earliest trees evolved.',
    imagePrompt: 'ancient shark evolution prehistoric ocean',
    title: 'Sharks are older than trees in evolutionary history',
  } as any,
  {
    headline: 'The first programmable computers were the size of modern smartphones',
    summary: 'Correct answer: FAKE. Fact check: Early programmable computers filled rooms with hardware, cables, and vacuum tubes.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Tech',
    difficulty: 'Easy',
    explanation: 'Correct answer: FAKE. Fact check: Early programmable computers filled rooms with hardware, cables, and vacuum tubes.',
    imagePrompt: 'vintage room sized computer old technology',
    title: 'The first programmable computers were the size of modern smartphones',
  } as any,
  {
    headline: 'Every country in the world uses the exact same currency',
    summary: 'Correct answer: FAKE. Fact check: Different countries and regions use many different currencies around the world.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Politics',
    difficulty: 'Easy',
    explanation: 'Correct answer: FAKE. Fact check: Different countries and regions use many different currencies around the world.',
    imagePrompt: 'international money currencies banknotes coins',
    title: 'Every country in the world uses the exact same currency',
  } as any,
  {
    headline: 'The Moon produces its own sunlight like a small star',
    summary: 'Correct answer: FAKE. Fact check: The Moon looks bright because it reflects sunlight rather than producing its own light.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Easy',
    explanation: 'Correct answer: FAKE. Fact check: The Moon looks bright because it reflects sunlight rather than producing its own light.',
    imagePrompt: 'moon night sky reflected sunlight',
    title: 'The Moon produces its own sunlight like a small star',
  } as any,
];

async function requestTriviaToken(difficulty: GameDifficulty, reset = false) {
  const url = new URL(TRIVIA_TOKEN_ENDPOINT);
  url.searchParams.set('command', reset ? 'reset' : 'request');

  if (reset && triviaTokens[difficulty]) {
    url.searchParams.set('token', triviaTokens[difficulty]!);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error('Token request failed');
  }

  const data = await res.json() as TriviaTokenResponse;
  if (data.token) {
    triviaTokens[difficulty] = data.token;
  }

  return data;
}

async function getTriviaToken(difficulty: GameDifficulty) {
  if (!triviaTokens[difficulty]) {
    await requestTriviaToken(difficulty);
  }

  return triviaTokens[difficulty];
}

async function fetchTriviaQuestions(count: number, difficulty: GameDifficulty, retry = true) {
  const token = await getTriviaToken(difficulty);
  const url = new URL(TRIVIA_ENDPOINT);
  url.searchParams.set('amount', String(count));
  url.searchParams.set('type', 'boolean');
  url.searchParams.set('difficulty', difficulty.toLowerCase());

  if (token) {
    url.searchParams.set('token', token);
  }

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Trivia request failed');

  const data = await res.json();
  if (data?.response_code === 4 && retry) {
    await requestTriviaToken(difficulty, true);
    return fetchTriviaQuestions(count, difficulty, false);
  }

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

function stripHtml(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
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

async function fetchSearchSnippetContext(statement: string): Promise<SearchSnippetContext | null> {
  const searchUrl = new URL(WIKIPEDIA_SEARCH_ENDPOINT);
  searchUrl.searchParams.set('action', 'query');
  searchUrl.searchParams.set('list', 'search');
  searchUrl.searchParams.set('format', 'json');
  searchUrl.searchParams.set('origin', '*');
  searchUrl.searchParams.set('utf8', '1');
  searchUrl.searchParams.set('srlimit', '1');
  searchUrl.searchParams.set('srprop', 'snippet');
  searchUrl.searchParams.set('srsearch', cleanStatementForSearch(statement));

  const searchRes = await fetch(searchUrl.toString());
  if (!searchRes.ok) return null;

  const searchData = await searchRes.json();
  const bestResult = searchData?.query?.search?.[0];
  if (!bestResult?.title) return null;

  const snippet = stripHtml(String(bestResult.snippet || ''));
  if (!snippet) return null;

  const pageId = bestResult.pageid;

  return {
    title: String(bestResult.title),
    snippet,
    pageUrl: pageId ? `https://en.wikipedia.org/?curid=${pageId}` : undefined,
  };
}

async function getSearchSnippetContext(statement: string) {
  return withTimeout(fetchSearchSnippetContext(statement), null);
}

function rememberHeadlines(items: NewsItem[]) {
  for (const item of items) {
    const normalized = normalizeHeadline(item.headline || (item as any).title || '');
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
  return onlineQueues[difficulty].some(item => normalizeHeadline(item.headline || (item as any).title || '') === normalized);
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

function getSafeImageUrl(_context?: SearchSnippetContext | null, _imagePrompt?: string, category?: string) {
  return getCategoryImageUrl(category || 'Culture');
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

function buildTruthSummary(statement: string, isReal: boolean, context?: SearchSnippetContext | null) {
  const truthLine = `Correct answer: ${isReal ? 'REAL' : 'FAKE'}.`;

  if (!context?.snippet) {
    return `${truthLine} Fact check: This result matched the quiz source, but extra supporting detail was limited in this round.`;
  }

  const compactSnippet = context.snippet.length > 220
    ? `${context.snippet.slice(0, 220).replace(/\s+\S*$/, '')}...`
    : context.snippet;

  return `${truthLine} Fact check: ${compactSnippet}`;
}

async function mapTriviaToNewsItem(
  item: any,
  index: number,
  requestedDifficulty: GameDifficulty
): Promise<NewsItem | null> {
  const statement = decodeHtml(String(item.question || 'No statement')).replace(/\s+/g, ' ').trim();
  const isReal = item.correct_answer === 'True';
  const category = getGameCategory(item.category);
  const apiDifficulty = getGameDifficulty(item.difficulty);

  if (apiDifficulty !== requestedDifficulty) {
    return null;
  }

  const imagePrompt = `${statement} trivia quiz ${category}`;
  const snippetContext = await getSearchSnippetContext(statement);
  const summary = buildTruthSummary(statement, isReal, snippetContext);

  return {
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    title: statement,
    headline: statement,
    type: isReal ? 'REAL' : 'FAKE',
    imageUrl: getSafeImageUrl(snippetContext, imagePrompt, category),
    summary,
    explanation: summary,
    category,
    difficulty: requestedDifficulty,
    source: snippetContext?.pageUrl || 'Open Trivia Database',
    imagePrompt,
  } as NewsItem;
}

function mapFallbackToNewsItem(item: Omit<NewsItem, 'id'>, index: number): NewsItem {
  const headline = item.headline || (item as any).title || 'No statement';
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

function uniqueOnly(items: Array<NewsItem | null>, difficulty?: GameDifficulty) {
  const seenThisBatch = new Set<string>();

  return items.filter((item): item is NewsItem => {
    if (!item) return false;

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
  const requestedCount = Math.min(50, Math.max(count + 12, count * 4));
  const triviaItems = await fetchTriviaQuestions(requestedCount, difficulty);
  const mappedItems = await Promise.all(
    triviaItems.map((item: any, index: number) => mapTriviaToNewsItem(item, index, difficulty))
  );
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
