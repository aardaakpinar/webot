import type { FAQItem, ServerData } from './types.js';

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\u0131/g, 'i')
    .replace(/\u0130/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function calculateSimilarity(text: string, keywords: string[]): number {
  const normalizedText = normalizeText(text);
  const words = normalizedText.split(/\s+/);

  let matchCount = 0;
  for (const keyword of keywords) {
    const normalizedKeyword = normalizeText(keyword);
    if (words.some(word => word.includes(normalizedKeyword) || normalizedKeyword.includes(word))) {
      matchCount++;
    }
  }

  return matchCount > 0 ? matchCount / keywords.length : 0;
}

export function findBestMatch(query: string, serverData: ServerData): FAQItem | null {
  const result = findBestMatchWithScore(query, serverData);
  return result.score >= 0.3 ? result.faq : null;
}

export function findBestMatchWithScore(query: string, serverData: ServerData): { faq: FAQItem | null; score: number } {
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
