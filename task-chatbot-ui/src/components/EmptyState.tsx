import { BotAvatar } from './Avatar';
import { SUGGESTIONS } from '../constants';

export function EmptyState({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="tb-empty">
      <div className="tb-empty-inner">
        <BotAvatar size={56} />
        <h1 className="tb-empty-title">Hi, I'm TaskBot.</h1>
        <p className="tb-empty-sub">Find out what your teammates are up to!</p>
        <div className="tb-chips">
          {SUGGESTIONS.map((s) => (
            <button className="tb-chip" key={s} onClick={() => onPick(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
