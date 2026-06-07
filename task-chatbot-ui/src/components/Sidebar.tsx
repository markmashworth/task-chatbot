import type { Conversation } from '../types';
import { BotAvatar } from './Avatar';

export function Sidebar({ conversations, activeId, onSelect, onNew, onDelete, collapsed, onToggle }: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside className={'tb-sidebar' + (collapsed ? ' tb-sidebar-collapsed' : '')}>
      <div className="tb-brand">
        <BotAvatar size={28} />
        {!collapsed && <span className="tb-brand-name">TaskBot</span>}
        <button className="tb-collapse" onClick={onToggle} aria-label="Toggle sidebar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d={collapsed ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {!collapsed && (
        <>
          <button className="tb-new" onClick={onNew}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            New chat
          </button>

          <div className="tb-convo-label">Conversations</div>
          <div className="tb-convo-list">
            {conversations.length === 0 && (
              <div className="tb-convo-empty">No conversations yet</div>
            )}
            {conversations.map((c) => (
              <div
                key={c.id}
                className={'tb-convo' + (c.id === activeId ? ' tb-convo-active' : '')}
                onClick={() => onSelect(c.id)}
              >
                <span className="tb-convo-title">{c.title}</span>
                <button
                  className="tb-convo-del"
                  onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                  aria-label="Delete conversation"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}
