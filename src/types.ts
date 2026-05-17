export interface FAQItem {
  id: string;
  answer: string;
  keywords: string[];
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
