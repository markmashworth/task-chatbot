import type { Conversation, Settings } from './types';
import { STORE_KEY, SETTINGS_KEY, ACCENTS, FONTS } from './constants';

export const DEFAULT_SETTINGS: Settings = {
  accent: 'blue',
  font: 'DM Sans',
  density: 'comfortable',
  showTime: true,
};

export function nowTs(): string {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function applySettingsCssVars(settings: Settings): void {
  const root = document.documentElement;
  const a = ACCENTS[settings.accent];
  root.style.setProperty('--accent', a.c);
  root.style.setProperty('--accent-h', String(a.h));
  root.style.setProperty('--app-font', FONTS[settings.font]);
  root.setAttribute('data-density', settings.density);
}
