export interface FAQKeyword {
  text: string;
  weight?: number;
  synonyms?: string[];
}

export type FAQKeywordEntry = string | FAQKeyword;

export interface FAQItem {
  id: string;
  answer: string;
  keywords: FAQKeywordEntry[];
  createdBy: string;
  createdAt: number;
}

export interface ServerData {
  faqs: Record<string, FAQItem>;
  admins: string[];
  ownerId?: string;
  serverName: string;
  serverId: string;
  createdAt: number;
}
