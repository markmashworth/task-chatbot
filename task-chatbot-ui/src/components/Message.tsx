import { BotAvatar, YouAvatar } from './Avatar';
import { FormattedText } from './FormattedText';

export function Message({ role, content, ts, showTime, error }: {
  role: 'user' | 'assistant';
  content: string;
  ts: string;
  showTime: boolean;
  error?: boolean;
}) {
  const isUser = role === 'user';
  return (
    <div className={'tb-msg ' + (isUser ? 'tb-msg-user' : 'tb-msg-bot')}>
      <div className="tb-msg-avatar">
        {isUser ? <YouAvatar /> : <BotAvatar />}
      </div>
      <div className="tb-msg-main">
        <div className="tb-msg-meta">
          <span className="tb-msg-name">{isUser ? 'You' : 'TaskBot'}</span>
          {showTime && ts && <span className="tb-msg-time">{ts}</span>}
        </div>
        <div className={'tb-bubble ' + (isUser ? 'tb-bubble-user' : error ? 'tb-bubble-error' : 'tb-bubble-bot')}>
          {isUser
            ? <div className="tb-msg-body">{content}</div>
            : <FormattedText text={content} />}
        </div>
      </div>
    </div>
  );
}

export function TypingRow() {
  return (
    <div className="tb-msg tb-msg-bot">
      <div className="tb-msg-avatar"><BotAvatar /></div>
      <div className="tb-msg-main">
        <div className="tb-msg-meta"><span className="tb-msg-name">TaskBot</span></div>
        <div className="tb-bubble tb-bubble-bot tb-typing">
          <span className="tb-tdot" />
          <span className="tb-tdot" />
          <span className="tb-tdot" />
        </div>
      </div>
    </div>
  );
}
