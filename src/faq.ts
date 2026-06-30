import type {
  FAQItem,
  FAQKeywordEntry,
  FAQKeyword,
  ServerData,
} from "./types.js";

const DEFAULT_KEYWORD_WEIGHT = 1;
const PHRASE_BOOST = 0.18;
const SYNONYM_BOOST = 0.15;
const MIN_SIMILARITY_SCORE = 0.3;

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\u0131/g, "i")
    .replace(/\u0130/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

export function parseKeywordEntry(entry: FAQKeywordEntry): FAQKeyword {
  if (typeof entry === "string") {
    const raw = entry.trim();
    const [mainPart, metadata] = raw.split("~", 2).map((part) => part.trim());
    const [keywordText, weightPart] = mainPart
      .split("|", 2)
      .map((part) => part.trim());

    const keyword: FAQKeyword = {
      text: keywordText,
      weight: weightPart
        ? Number(weightPart) || DEFAULT_KEYWORD_WEIGHT
        : DEFAULT_KEYWORD_WEIGHT,
      synonyms: [],
    };

    if (metadata) {
      keyword.synonyms = metadata
        .split(";")
        .map((synonym) => synonym.trim())
        .filter(Boolean);
    }

    return keyword;
  }

  return {
    text: entry.text,
    weight: entry.weight ?? DEFAULT_KEYWORD_WEIGHT,
    synonyms: entry.synonyms ? entry.synonyms.map(normalizeText) : [],
  };
}

function buildSynonymMap(entries: FAQKeywordEntry[]): Map<string, string[]> {
  const map = new Map<string, string[]>();

  for (const entry of entries) {
    const keyword = parseKeywordEntry(entry);
    if (keyword.synonyms?.length) {
      map.set(normalizeText(keyword.text), keyword.synonyms.map(normalizeText));
    }
  }

  return map;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => []);

  for (let i = 0; i <= a.length; i += 1) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= b.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

function fuzzyScore(source: string, target: string): number {
  if (source.length === 0 || target.length === 0) {
    return 0;
  }

  const distance = levenshteinDistance(source, target);
  return Math.max(0, 1 - distance / Math.max(source.length, target.length));
}

function getBestPhraseScore(query: string, keywordText: string): number {
  const normalizedKeyword = normalizeText(keywordText);
  const queryTokens = tokenize(query);
  const keywordTokens = tokenize(normalizedKeyword);

  const phrase = keywordTokens.join(" ");
  const normalizedQuery = queryTokens.join(" ");

  if (!phrase) {
    return 0;
  }

  if (normalizedQuery.includes(phrase)) {
    return 0.98;
  }

  if (keywordTokens.length > 1) {
    const slidingCandidates = [];
    for (let i = 0; i <= queryTokens.length - keywordTokens.length; i += 1) {
      slidingCandidates.push(
        queryTokens.slice(i, i + keywordTokens.length).join(" "),
      );
    }

    const bestNgramScore = slidingCandidates.reduce((best, candidate) => {
      return Math.max(best, fuzzyScore(phrase, candidate));
    }, 0);

    return bestNgramScore;
  }

  return Math.max(
    ...queryTokens.map((token) => fuzzyScore(normalizedKeyword, token)),
    0,
  );
}

function scoreKeywordMatch(
  query: string,
  keyword: FAQKeyword,
  synonymMap: Map<string, string[]>,
): number {
  const normalizedQuery = normalizeText(query);
  const normalizedKeyword = normalizeText(keyword.text);
  const keywordTokens = tokenize(normalizedKeyword);
  const queryTokens = tokenize(normalizedQuery);

  if (keywordTokens.length === 0) {
    return 0;
  }

  const exactMatch = normalizedQuery.includes(normalizedKeyword);
  if (exactMatch) {
    return 1;
  }

  const phraseScore = getBestPhraseScore(normalizedQuery, normalizedKeyword);
  const basePhraseScore = Math.min(
    phraseScore + (keywordTokens.length > 1 ? PHRASE_BOOST : 0),
    1,
  );

  const synonyms = synonymMap.get(normalizedKeyword) ?? keyword.synonyms ?? [];
  const synonymMatch = synonyms.some((synonym) =>
    normalizedQuery.includes(synonym),
  );
  const synonymScore = synonymMatch
    ? Math.min(basePhraseScore + SYNONYM_BOOST, 1)
    : basePhraseScore;

  const bestFuzzy = Math.max(
    fuzzyScore(normalizedKeyword, normalizedQuery),
    ...queryTokens.map((token) => fuzzyScore(normalizedKeyword, token)),
  );

  return Math.max(synonymScore, bestFuzzy);
}

export function calculateSimilarity(
  text: string,
  keywords: FAQKeywordEntry[],
): number {
  if (!keywords || keywords.length === 0) {
    return 0;
  }

  const synonymMap = buildSynonymMap(keywords);
  let totalWeight = 0;
  let weightedScore = 0;

  for (const entry of keywords) {
    const keyword = parseKeywordEntry(entry);
    const weight = keyword.weight ?? DEFAULT_KEYWORD_WEIGHT;
    const score = scoreKeywordMatch(text, keyword, synonymMap);
    totalWeight += weight;
    weightedScore += score * weight;
  }

  return totalWeight > 0 ? weightedScore / totalWeight : 0;
}

export function findBestMatch(
  query: string,
  serverData: ServerData,
): FAQItem | null {
  const result = findBestMatchWithScore(query, serverData);
  return result.score >= MIN_SIMILARITY_SCORE ? result.faq : null;
}

export function findBestMatchWithScore(
  query: string,
  serverData: ServerData,
): { faq: FAQItem | null; score: number } {
  const faqList = Object.values(serverData.faqs);
  if (faqList.length === 0) return { faq: null, score: 0 };

  let bestMatch: FAQItem | null = null;
  let bestScore = 0;

  for (const faq of faqList) {
    const score = calculateSimilarity(query, faq.keywords);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = faq;
    }
  }

  return { faq: bestMatch, score: bestScore };
}

export function generateId(): string {
  return `faq_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
