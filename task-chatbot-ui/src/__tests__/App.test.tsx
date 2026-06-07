import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

vi.mock('../api', () => ({
  streamFromBackend: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  localStorage.clear();
});

async function sendMessage(text: string) {
  await userEvent.type(screen.getByRole('textbox'), text);
  await userEvent.keyboard('{Enter}');
  // Wait until the message body appears in the thread
  await waitFor(() => screen.getByText(text, { selector: '.tb-msg-body' }));
}

describe('App — initial render', () => {
  it('renders the empty state on first load', () => {
    render(<App />);
    expect(screen.getByText("Hi, I'm TaskBot.")).toBeInTheDocument();
  });

  it('shows "New conversation" as the header title when no conversation is active', () => {
    render(<App />);
    expect(screen.getByText('New conversation')).toBeInTheDocument();
  });

  it('renders the composer textarea', () => {
    render(<App />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders the sidebar with the TaskBot brand', () => {
    render(<App />);
    // "TaskBot" appears in both the sidebar brand and the TypingRow/Message name;
    // getAllByText handles the ambiguity gracefully.
    expect(screen.getAllByText('TaskBot').length).toBeGreaterThan(0);
  });

  it('does not render the settings panel on load', () => {
    render(<App />);
    expect(screen.queryByLabelText('Close settings')).not.toBeInTheDocument();
  });
});

describe('App — settings panel', () => {
  it('opens the settings panel when the settings button is clicked', async () => {
    render(<App />);
    await userEvent.click(screen.getByLabelText('Settings'));
    expect(screen.getByText('Appearance')).toBeInTheDocument();
  });

  it('closes the settings panel when the close button is clicked', async () => {
    render(<App />);
    await userEvent.click(screen.getByLabelText('Settings'));
    await userEvent.click(screen.getByLabelText('Close settings'));
    expect(screen.queryByText('Appearance')).not.toBeInTheDocument();
  });

  it('toggles the settings panel on repeated clicks of the settings button', async () => {
    render(<App />);
    await userEvent.click(screen.getByLabelText('Settings'));
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Settings'));
    expect(screen.queryByText('Appearance')).not.toBeInTheDocument();
  });
});

describe('App — suggestion chips', () => {
  it('populates the composer draft when a suggestion chip is clicked', async () => {
    render(<App />);
    const chips = screen.getAllByRole('button', { name: /Mark/i });
    await userEvent.click(chips[0]);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toContain('Mark');
  });
});

describe('App — sending messages', () => {
  it('shows the user message in the thread after sending', async () => {
    render(<App />);
    await sendMessage('Hello world');
    expect(screen.getByText('Hello world', { selector: '.tb-msg-body' })).toBeInTheDocument();
  });

  it('hides the empty state after the first message is sent', async () => {
    render(<App />);
    await sendMessage('Hello');
    expect(screen.queryByText("Hi, I'm TaskBot.")).not.toBeInTheDocument();
  });

  it('clears the composer draft after sending', async () => {
    render(<App />);
    await sendMessage('Hello');
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
  });

  it('uses the message text as the conversation title', async () => {
    render(<App />);
    await sendMessage('Short message');
    expect(screen.getByText('Short message', { selector: '.tb-convo-title' })).toBeInTheDocument();
  });

  it('truncates the title to 40 characters with ellipsis for long messages', async () => {
    render(<App />);
    const longMsg = 'This is a very long message that exceeds forty characters';
    await sendMessage(longMsg);
    const title = screen.getByText(/This is a very long message that exceed/, { selector: '.tb-convo-title' });
    expect(title.textContent).toHaveLength(43); // 40 chars + '...'
  });
});

describe('App — conversation management', () => {
  it('shows the empty state again after clicking "New chat"', async () => {
    render(<App />);
    await sendMessage('First message');
    await userEvent.click(screen.getByText('New chat'));
    expect(screen.getByText("Hi, I'm TaskBot.")).toBeInTheDocument();
  });

  it('lists created conversations in the sidebar', async () => {
    render(<App />);
    await sendMessage('Hello sidebar');
    expect(screen.getByText('Hello sidebar', { selector: '.tb-convo-title' })).toBeInTheDocument();
  });

  it('removes a conversation from the sidebar when deleted', async () => {
    render(<App />);
    await sendMessage('To be deleted');
    await userEvent.click(screen.getByLabelText('Delete conversation'));
    expect(screen.queryByText('To be deleted', { selector: '.tb-convo-title' })).not.toBeInTheDocument();
  });

  it('shows the empty state after the active conversation is deleted', async () => {
    render(<App />);
    await sendMessage('Temporary chat');
    await userEvent.click(screen.getByLabelText('Delete conversation'));
    expect(screen.getByText("Hi, I'm TaskBot.")).toBeInTheDocument();
  });
});

describe('App — sidebar collapse', () => {
  it('collapses the sidebar when the toggle button is clicked', async () => {
    const { container } = render(<App />);
    await userEvent.click(screen.getByLabelText('Toggle sidebar'));
    expect(container.querySelector('.tb-sidebar-collapsed')).toBeInTheDocument();
  });

  it('expands the sidebar again when the toggle button is clicked twice', async () => {
    const { container } = render(<App />);
    await userEvent.click(screen.getByLabelText('Toggle sidebar'));
    await userEvent.click(screen.getByLabelText('Toggle sidebar'));
    expect(container.querySelector('.tb-sidebar-collapsed')).not.toBeInTheDocument();
  });
});
