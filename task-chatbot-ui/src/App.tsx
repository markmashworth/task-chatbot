import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

import type { ChatMessage, Conversation, Settings } from './types';
import { STORE_KEY, ACTIVE_KEY, SETTINGS_KEY } from './constants';
import { nowTs, uid, loadConversations, loadSettings, applySettingsCssVars } from './utils';
import { streamFromBackend } from './api';
import { Sidebar } from './components/Sidebar';
import { Message, TypingRow } from './components/Message';
import { EmptyState } from './components/EmptyState';
import { Composer } from './components/Composer';
import { SettingsPanel } from './components/SettingsPanel';

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeId, setActiveId] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_KEY) || null
  );
  const [draft, setDraft] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const messages = active?.messages ?? [];

  // Persistence
  useEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
  }, [activeId]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Apply CSS variables whenever appearance settings change
  useEffect(() => {
    applySettingsCssVars(settings);
  }, [settings.accent, settings.font, settings.density]);

  // Auto-scroll to bottom on new messages or typing indicator
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, isTyping]);

  function updateSettings(patch: Partial<Settings>) {
    setSettings((prev) => ({ ...prev, ...patch }));
  }

  const send = useCallback(
    async (textArg?: string) => {
      const text = (textArg != null ? textArg : draft).trim();
      if (!text || isTyping) return;
      setDraft('');

      const userMsg: ChatMessage = { role: 'user', content: text, ts: nowTs() };

      const title = text.length > 40 ? text.slice(0, 40) + '...' : text;
      const existing = conversations.find((c) => c.id === activeId);
      const convId = existing ? existing.id : uid();
      const base = existing ?? {
        id: convId,
        title,
        messages: [],
        createdAt: Date.now(),
      };
      const workingHistory = base.messages.map((m) => ({ role: m.role, content: m.content }));
      const updated: Conversation = {
        ...base,
        messages: [...base.messages, userMsg],
        title: base.messages.length === 0 ?  title : base.title,
      };

      setConversations((prev) =>
        existing
          ? prev.map((c) => (c.id === convId ? updated : c))
          : [updated, ...prev]
      );
      if (convId !== activeId) setActiveId(convId);
      setIsTyping(true);

      try {
        const abortCtrl = new AbortController();
        let accumulated = '';
        let streamStarted = false;

        await streamFromBackend(
          text,
          workingHistory,
          (token) => {
            accumulated += token;
            if (!streamStarted) {
              streamStarted = true;
              setIsTyping(false);
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === convId
                    ? { ...c, messages: [...c.messages, { role: 'assistant', content: accumulated, ts: nowTs(), streaming: true }] }
                    : c
                )
              );
            } else {
              setConversations((prev) =>
                prev.map((c) => {
                  if (c.id !== convId) return c;
                  const msgs = [...c.messages];
                  const last = msgs[msgs.length - 1];
                  if (last?.streaming) msgs[msgs.length - 1] = { ...last, content: accumulated };
                  return { ...c, messages: msgs };
                })
              );
            }
          },
          abortCtrl.signal,
        );

        // Finalise: strip the streaming flag now the response is complete
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convId) return c;
            const msgs = c.messages.map((m) =>
              m.streaming ? { role: m.role, content: m.content, ts: m.ts } : m
            );
            return { ...c, messages: msgs };
          })
        );
      } catch (err) {
        const isHttpError = err instanceof Error && err.message.startsWith('HTTP');
        const content = isHttpError
          ? `Server error: ${err.message}. Check the backend logs and try again.`
          : "Couldn't reach the backend. Make sure the server is running on port 8080 and try again.";
        const botMsg: ChatMessage = { role: 'assistant', content, ts: nowTs(), error: true };
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId ? { ...c, messages: [...c.messages, botMsg] } : c
          )
        );
      } finally {
        setIsTyping(false);
      }
    },
    [draft, isTyping, activeId, conversations]
  );

  function newChat() {
    setActiveId(null);
    setDraft('');
  }

  function deleteConv(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (id === activeId) setActiveId(null);
  }

  const title = active ? active.title : 'New conversation';
  const showEmpty = messages.length === 0 && !isTyping;

  return (
    <div className="tb-app">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={newChat}
        onDelete={deleteConv}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
      />

      <main className="tb-main">
        <header className="tb-header">
          <div className="tb-header-title">{title}</div>
          <button
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ink-faint)',
              display: 'grid',
              placeItems: 'center',
              width: 32,
              height: 32,
              borderRadius: 8,
              flexShrink: 0,
            }}
            onClick={() => setSettingsOpen((v) => !v)}
            aria-label="Settings"
            title="Settings"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
              <path
                d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </button>
        </header>

        <div className="tb-scroll" ref={scrollRef}>
          {showEmpty ? (
            <EmptyState
              onPick={(s) => {
                setDraft(s);
                const el = document.querySelector('.tb-input') as HTMLTextAreaElement;
                if (el) el.focus();
              }}
            />
          ) : (
            <div className="tb-thread">
              {messages.map((m, i) => (
                <Message
                  key={i}
                  role={m.role}
                  content={m.content}
                  ts={m.ts}
                  showTime={settings.showTime}
                  error={m.error}
                />
              ))}
              {isTyping && <TypingRow />}
            </div>
          )}
        </div>

        <Composer
          value={draft}
          onChange={setDraft}
          onSend={() => send()}
          disabled={isTyping}
        />
      </main>

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onChange={updateSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
