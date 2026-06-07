import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '../../components/EmptyState';
import { SUGGESTIONS } from '../../constants';

describe('EmptyState', () => {
  it('renders the title', () => {
    render(<EmptyState onPick={() => {}} />);
    expect(screen.getByText("Hi, I'm TaskBot.")).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<EmptyState onPick={() => {}} />);
    expect(screen.getByText('Find out what your teammates are up to!')).toBeInTheDocument();
  });

  it('renders a chip button for each suggestion', () => {
    render(<EmptyState onPick={() => {}} />);
    SUGGESTIONS.forEach((s) => {
      expect(screen.getByText(s)).toBeInTheDocument();
    });
    expect(screen.getAllByRole('button')).toHaveLength(SUGGESTIONS.length);
  });

  it('calls onPick with the suggestion text when a chip is clicked', async () => {
    const onPick = vi.fn();
    render(<EmptyState onPick={onPick} />);
    await userEvent.click(screen.getByText(SUGGESTIONS[0]));
    expect(onPick).toHaveBeenCalledWith(SUGGESTIONS[0]);
  });

  it('calls onPick with the correct text for each chip', async () => {
    const onPick = vi.fn();
    render(<EmptyState onPick={onPick} />);
    for (const suggestion of SUGGESTIONS) {
      await userEvent.click(screen.getByText(suggestion));
      expect(onPick).toHaveBeenCalledWith(suggestion);
    }
    expect(onPick).toHaveBeenCalledTimes(SUGGESTIONS.length);
  });

  it('renders the bot avatar', () => {
    const { container } = render(<EmptyState onPick={() => {}} />);
    expect(container.querySelector('.tb-bot-avatar')).toBeInTheDocument();
  });
});
