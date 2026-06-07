export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  ts: string;
  streaming?: boolean;
  error?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

export interface Settings {
  accent: 'green' | 'blue' | 'violet' | 'amber';
  font: 'DM Sans' | 'Figtree' | 'System';
  density: 'compact' | 'comfortable';
  showTime: boolean;
}
