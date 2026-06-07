import { render, screen } from '@testing-library/react';
import { Message, TypingRow } from '../../components/Message';

describe('Message — user role', () => {
  it('shows the "You" label in the message header', () => {
    const { container } = render(<Message role="user" content="Hello" ts="12:00 PM" showTime={true} />);
    expect(container.querySelector('.tb-msg-name')).toHaveTextContent('You');
  });

  it('renders the message content', () => {
    render(<Message role="user" content="Hello there" ts="12:00 PM" showTime={true} />);
    expect(screen.getByText('Hello there')).toBeInTheDocument();
  });

  it('applies the tb-msg-user class', () => {
    const { container } = render(<Message role="user" content="Hi" ts="12:00 PM" showTime={false} />);
    expect(container.querySelector('.tb-msg-user')).toBeInTheDocument();
  });

  it('applies the tb-bubble-user class', () => {
    const { container } = render(<Message role="user" content="Hi" ts="12:00 PM" showTime={false} />);
    expect(container.querySelector('.tb-bubble-user')).toBeInTheDocument();
  });
});

describe('Message — assistant role', () => {
  it('shows the "TaskBot" label', () => {
    render(<Message role="assistant" content="Hi there" ts="12:00 PM" showTime={true} />);
    expect(screen.getByText('TaskBot')).toBeInTheDocument();
  });

  it('renders the message content', () => {
    render(<Message role="assistant" content="Hi there" ts="12:00 PM" showTime={true} />);
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });

  it('applies the tb-msg-bot class', () => {
    const { container } = render(<Message role="assistant" content="Hi" ts="12:00 PM" showTime={false} />);
    expect(container.querySelector('.tb-msg-bot')).toBeInTheDocument();
  });

  it('applies the tb-bubble-bot class for a normal response', () => {
    const { container } = render(<Message role="assistant" content="Hi" ts="12:00 PM" showTime={false} />);
    expect(container.querySelector('.tb-bubble-bot')).toBeInTheDocument();
    expect(container.querySelector('.tb-bubble-error')).not.toBeInTheDocument();
  });

  it('applies tb-bubble-error instead of tb-bubble-bot when error is true', () => {
    const { container } = render(
      <Message role="assistant" content="Error!" ts="12:00 PM" showTime={false} error={true} />,
    );
    expect(container.querySelector('.tb-bubble-error')).toBeInTheDocument();
    expect(container.querySelector('.tb-bubble-bot')).not.toBeInTheDocument();
  });
});

describe('Message — timestamp', () => {
  it('shows the timestamp when showTime is true', () => {
    render(<Message role="user" content="Hi" ts="3:45 PM" showTime={true} />);
    expect(screen.getByText('3:45 PM')).toBeInTheDocument();
  });

  it('hides the timestamp when showTime is false', () => {
    render(<Message role="user" content="Hi" ts="3:45 PM" showTime={false} />);
    expect(screen.queryByText('3:45 PM')).not.toBeInTheDocument();
  });

  it('hides the timestamp when ts is empty', () => {
    const { container } = render(<Message role="user" content="Hi" ts="" showTime={true} />);
    expect(container.querySelector('.tb-msg-time')).not.toBeInTheDocument();
  });
});

describe('TypingRow', () => {
  it('renders the TaskBot label', () => {
    render(<TypingRow />);
    expect(screen.getByText('TaskBot')).toBeInTheDocument();
  });

  it('renders exactly three typing dots', () => {
    const { container } = render(<TypingRow />);
    expect(container.querySelectorAll('.tb-tdot')).toHaveLength(3);
  });

  it('has the tb-typing class on the bubble', () => {
    const { container } = render(<TypingRow />);
    expect(container.querySelector('.tb-typing')).toBeInTheDocument();
  });

  it('renders the bot avatar', () => {
    const { container } = render(<TypingRow />);
    expect(container.querySelector('.tb-bot-avatar')).toBeInTheDocument();
  });
});
