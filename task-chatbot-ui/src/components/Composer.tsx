import { useRef, useEffect } from 'react';

export function Composer({ value, onChange, onSend, disabled }: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [value]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) onSend();
    }
  }

  return (
    <div className="tb-composer">
      <div className="tb-composer-inner">
        <textarea
          ref={taRef}
          className="tb-input"
          rows={1}
          placeholder="Ask about a teammate's work…"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKey}
        />
        <button
          className="tb-send"
          disabled={!value.trim() || disabled}
          onClick={onSend}
          aria-label="Send"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12h13M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
