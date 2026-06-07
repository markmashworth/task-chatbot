import React from 'react';

// ── Inline token regex ────────────────────────────────────────────────────────
// Matches (in priority order):
//   [text](url)   — Markdown link         → groups: [1]=text, [2]=url
//   **text**      — bold                  → group:  [3]=inner text
//   JIRA-42 etc.  — mono tokens           → group:  [4]=token
const INLINE_RE = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*\n]+)\*\*|([A-Z]{2,}-\d+|[\w.-]+@[0-9a-f]{6,}|#\d+|@[\w-]+)/g;

function safeHref(url: string): string {
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:' ? url : '#';
  } catch {
    return '#';
  }
}

function inlineTokens(text: string, keyPrefix: string | number): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let idx = 0;
  INLINE_RE.lastIndex = 0;

  let m: RegExpExecArray | null;
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));

    if (m[1] !== undefined) {
      const isKey = /^[A-Z]{2,}-\d+$/.test(m[1]);
      nodes.push(
        <a
          key={`${keyPrefix}-${idx}`}
          href={safeHref(m[2])}
          target="_blank"
          rel="noopener noreferrer"
          className={isKey ? 'tb-mono tb-link-key' : 'tb-link'}
        >
          {m[1]}
        </a>
      );
    } else if (m[3] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-${idx}`}>{m[3]}</strong>);
    } else {
      nodes.push(<span key={`${keyPrefix}-${idx}`} className="tb-mono">{m[4]}</span>);
    }

    last = m.index + m[0].length;
    idx++;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

// ── Line classification ───────────────────────────────────────────────────────

// Matches indented "Status: value", "Priority: value", "Reporter: value", "Due: value" lines.
const META_LINE_RE = /^\s{2,}(Status|Priority|Reporter|Due):\s+(.+)$/;

type FlatItem =
  | { type: 'plain'; line: string; status?: string; idx: number }
  | { type: 'field'; key: string; val: string; idx: number };

/**
 * Classify each line, then pull "Status:" up into the preceding plain line
 * so the status lozenge renders inline with the bullet text.
 * Priority, Reporter, Due stay as individual field rows.
 */
function processLines(lines: string[]): FlatItem[] {
  const raw: FlatItem[] = lines.map((line, idx) => {
    const m = META_LINE_RE.exec(line);
    return m
      ? { type: 'field', key: m[1], val: m[2].trim(), idx }
      : { type: 'plain', line, idx };
  });

  const result: FlatItem[] = [];
  for (const item of raw) {
    if (item.type === 'field' && item.key === 'Status') {
      const prev = result[result.length - 1];
      if (prev?.type === 'plain') {
        result[result.length - 1] = { ...prev, status: item.val };
        continue;
      }
    }
    result.push(item);
  }
  return result;
}

// ── Status / priority helpers ─────────────────────────────────────────────────

function statusCategory(s: string): 'progress' | 'review' | 'done' | 'blocked' | 'default' {
  const v = s.toLowerCase();
  if (/done|closed|resolved|complet|finish|fixed/.test(v))    return 'done';
  if (/progress|active|develop|implement|coding/.test(v))     return 'progress';
  if (/review|testing|qa|verif/.test(v))                      return 'review';
  if (/blocked|hold|waiting|impediment/.test(v))              return 'blocked';
  return 'default';
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444', highest: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#94a3b8',
  lowest:   '#cbd5e1',
};

function priorityColor(priority: string): string {
  const p = priority.toLowerCase();
  for (const [k, v] of Object.entries(PRIORITY_COLORS)) {
    if (p.includes(k)) return v;
  }
  return '#cbd5e1';
}

function formatMetaDate(iso: string): string {
  try {
    const [y, mo, d] = iso.split('-').map(Number);
    return new Date(y, mo - 1, d).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return iso; }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldLine({ fieldKey, val }: { fieldKey: string; val: string }) {
  const renderedVal: React.ReactNode =
    fieldKey === 'Due' ? formatMetaDate(val) :
    fieldKey === 'Priority' ? (
      <><span className="tb-priority-dot" style={{ background: priorityColor(val) }} />{val}</>
    ) : val;

  return (
    <div className="tb-field-line">
      <span className="tb-field-key">{fieldKey}:</span>
      <span className="tb-field-val">{renderedVal}</span>
    </div>
  );
}

// ── FormattedText ─────────────────────────────────────────────────────────────

export function FormattedText({ text }: { text: string }) {
  const items = processLines(text.split('\n'));
  return (
    <div className="tb-msg-body">
      {items.map((item) => {
        if (item.type === 'field') {
          return <FieldLine key={item.idx} fieldKey={item.key} val={item.val} />;
        }

        const { line, idx } = item;
        if (line.trim() === '') return <div className="tb-line-gap" key={idx} />;
        if (line.trim() === '———') return <hr className="tb-divider" key={idx} />;

        const trimmed = line.trimStart();

        // Section heading: entire line is **text** with nothing else
        if (/^\*\*[^*\n]+\*\*$/.test(line.trim())) {
          const headingText = line.trim().slice(2, -2);
          return <div className="tb-heading" key={idx}>{headingText}</div>;
        }

        const isBullet = trimmed.startsWith('• ') || trimmed.startsWith('•') || trimmed.startsWith('- ');
        const isSub = /^\s{2,}/.test(line) && !isBullet;

        let content: string;
        if (trimmed.startsWith('• '))      content = trimmed.slice(2).trim();
        else if (trimmed.startsWith('•'))  content = trimmed.slice(1).trim();
        else if (trimmed.startsWith('- ')) content = trimmed.slice(2).trim();
        else                               content = line.trim();

        if (isBullet) {
          return (
            <div className="tb-bullet" key={idx}>
              <span className="tb-dot" aria-hidden="true">›</span>
              <span className="tb-bullet-content">
                <span className="tb-bullet-text">{inlineTokens(content, idx)}</span>
                {item.status && (
                  <span className="tb-status-pill" data-s={statusCategory(item.status)}>
                    {item.status}
                  </span>
                )}
              </span>
            </div>
          );
        }
        if (isSub) {
          return <div className="tb-subline" key={idx}>{inlineTokens(content, idx)}</div>;
        }
        return <div className="tb-pline" key={idx}>{inlineTokens(content, idx)}</div>;
      })}
    </div>
  );
}
