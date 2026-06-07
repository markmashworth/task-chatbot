import { render, screen } from '@testing-library/react';
import { BotAvatar, YouAvatar } from '../../components/Avatar';

describe('BotAvatar', () => {
  it('renders with the default size of 30', () => {
    const { container } = render(<BotAvatar />);
    const div = container.querySelector('.tb-bot-avatar') as HTMLElement;
    expect(div).toBeInTheDocument();
    expect(div.style.width).toBe('30px');
    expect(div.style.height).toBe('30px');
  });

  it('renders with a custom size', () => {
    const { container } = render(<BotAvatar size={56} />);
    const div = container.querySelector('.tb-bot-avatar') as HTMLElement;
    expect(div.style.width).toBe('56px');
    expect(div.style.height).toBe('56px');
  });

  it('sets border-radius proportionally to size', () => {
    const { container } = render(<BotAvatar size={100} />);
    const div = container.querySelector('.tb-bot-avatar') as HTMLElement;
    expect(div.style.borderRadius).toBe('32px');
  });

  it('renders an SVG icon', () => {
    const { container } = render(<BotAvatar />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('marks the SVG as decorative with aria-hidden', () => {
    const { container } = render(<BotAvatar />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('YouAvatar', () => {
  it('renders with "You" text', () => {
    render(<YouAvatar />);
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('has the correct CSS class', () => {
    const { container } = render(<YouAvatar />);
    expect(container.querySelector('.tb-you-avatar')).toBeInTheDocument();
  });
});
