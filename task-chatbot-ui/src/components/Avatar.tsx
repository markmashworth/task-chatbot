export function BotAvatar({ size = 30 }: { size?: number }) {
  return (
    <div
      className="tb-bot-avatar"
      style={{ width: size, height: size, borderRadius: size * 0.32 }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="none" aria-hidden="true">
        <path
          d="M12 1.6c.5 4.6 2.2 6.3 6.8 6.8 -4.6.5 -6.3 2.2 -6.8 6.8 -.5 -4.6 -2.2 -6.3 -6.8 -6.8 4.6 -.5 6.3 -2.2 6.8 -6.8Z"
          fill="#fff"
        />
        <path
          d="M18.8 14.4c.3 2.6 1.2 3.5 3.6 3.8 -2.4.3 -3.3 1.2 -3.6 3.8 -.3 -2.6 -1.2 -3.5 -3.6 -3.8 2.4 -.3 3.3 -1.2 3.6 -3.8Z"
          fill="#fff"
          opacity="0.85"
        />
      </svg>
    </div>
  );
}

export function YouAvatar() {
  return <div className="tb-you-avatar">You</div>;
}
