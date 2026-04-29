import { NewsItem } from '../types';
import { getSeenHeadlines, setSeenHeadlines } from '../utils/storage';

const TRIVIA_ENDPOINT = 'https://opentdb.com/api.php';
const TRIVIA_TOKEN_ENDPOINT = 'https://opentdb.com/api_token.php';
const WIKIPEDIA_SEARCH_ENDPOINT = 'https://en.wikipedia.org/w/api.php';
const WIKIPEDIA_PAGE_ENDPOINT = 'https://en.wikipedia.org/w/api.php';
const OPENROUTER_PROXY_ENDPOINT = '/api/openrouter';
const MAX_RECENT_HEADLINES = 120;
const SUMMARY_TIMEOUT_MS = 2800;
const OPENROUTER_TIMEOUT_MS = 9000;
const DEFAULT_ROUND_SIZE = 5;
const QUEUE_TARGET_ITEMS = 10;
const PRELOAD_IMAGE_COUNT = 4;
const TRIVIA_MIN_INTERVAL_MS = 5200;

type GameDifficulty = 'Easy' | 'Medium' | 'Hard';
type SearchSnippetContext = {
  title: string;
  snippet: string;
  pageUrl?: string;
  imageUrl?: string;
};

type TriviaTokenResponse = {
  response_code: number;
  response_message?: string;
  token?: string;
};

type OpenRouterQuizItem = {
  headline?: string;
  statement?: string;
  type?: string;
  answer?: string;
  category?: string;
  difficulty?: string;
  explanation?: string;
  imagePrompt?: string;
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
let lastTriviaRequestAt = 0;

const FALLBACK_ITEMS: Array<Omit<NewsItem, 'id'>> = [
  {
    headline: 'Octopuses have three hearts',
    summary: 'Correct answer: REAL. Quick snippet: Octopuses really do have three hearts - two move blood through the gills and one pumps it through the body.',
    type: 'REAL',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Easy',
    explanation: 'Correct answer: REAL. Quick snippet: Octopuses really do have three hearts - two move blood through the gills and one pumps it through the body.',
    imagePrompt: 'octopus underwater marine biology',
    title: 'Octopuses have three hearts',
  } as any,
  {
    headline: 'Humans can breathe normally in space without a suit',
    summary: 'Correct answer: FAKE. Quick snippet: Space is a near-vacuum, so humans need pressure and oxygen support to survive there.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Easy',
    explanation: 'Correct answer: FAKE. Quick snippet: Space is a near-vacuum, so humans need pressure and oxygen support to survive there.',
    imagePrompt: 'astronaut spacesuit outer space',
    title: 'Humans can breathe normally in space without a suit',
  } as any,
  {
    headline: 'The Great Wall of China was built in a single weekend',
    summary: 'Correct answer: FAKE. Quick snippet: The Great Wall was built and rebuilt over many centuries by different dynasties.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Culture',
    difficulty: 'Easy',
    explanation: 'Correct answer: FAKE. Quick snippet: The Great Wall was built and rebuilt over many centuries by different dynasties.',
    imagePrompt: 'great wall of china mountain landscape',
    title: 'The Great Wall of China was built in a single weekend',
  } as any,
  {
    headline: 'Lightning can strike the same place more than once',
    summary: 'Correct answer: REAL. Quick snippet: Tall buildings and exposed structures can be struck repeatedly during storms.',
    type: 'REAL',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Easy',
    explanation: 'Correct answer: REAL. Quick snippet: Tall buildings and exposed structures can be struck repeatedly during storms.',
    imagePrompt: 'lightning storm tall skyscraper',
    title: 'Lightning can strike the same place more than once',
  } as any,
  {
    headline: 'A computer virus can spread through a glass of water',
    summary: 'Correct answer: FAKE. Quick snippet: Computer viruses are malicious code, not biological germs that move through drinking water.',
