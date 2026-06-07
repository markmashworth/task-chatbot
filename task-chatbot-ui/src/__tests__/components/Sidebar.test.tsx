import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from '../../components/Sidebar';
import type { Conversation } from '../../types';

const mockConversations: Conversation[] = [
  { id: 'c1', title: 'First Chat', messages: [], createdAt: 1000 },
  { id: 'c2', title: 'Second Chat', messages: [], createdAt: 2000 },
];

function renderSidebar(overrides: Partial<Parameters<typeof Sidebar>[0]> = {}) {
  return render(
    <Sidebar
      conversations={[]}
      activeId={null}
      onSelect={() => {}}
      onNew={() => {}}
      onDelete={() => {}}
      collapsed={false}
      onToggle={() => {}}
      {...overrides}
    />,
  );
}

describe('Sidebar — expanded state', () => {
  it('shows the brand name', () => {
    renderSidebar();
    expect(screen.getByText('TaskBot')).toBeInTheDocument();
  });

  it('shows the New chat button', () => {
    renderSidebar();
    expect(screen.getByText('New chat')).toBeInTheDocument();
  });

  it('shows "No conversations yet" when the list is empty', () => {
    renderSidebar();
    expect(screen.getByText('No conversations yet')).toBeInTheDocument();
  });

  it('renders each conversation title', () => {
    renderSidebar({ conversations: mockConversations });
    expect(screen.getByText('First Chat')).toBeInTheDocument();
    expect(screen.getByText('Second Chat')).toBeInTheDocument();
  });

  it('applies the active class to the active conversation', () => {
    const { container } = renderSidebar({ conversations: mockConversations, activeId: 'c1' });
    const items = container.querySelectorAll('.tb-convo');
    expect(items[0]).toHaveClass('tb-convo-active');
    expect(items[1]).not.toHaveClass('tb-convo-active');
  });

  it('does not apply the collapsed class when collapsed is false', () => {
    const { container } = renderSidebar({ collapsed: false });
    expect(container.querySelector('.tb-sidebar')).not.toHaveClass('tb-sidebar-collapsed');
  });
});

describe('Sidebar — collapsed state', () => {
  it('hides the brand name', () => {
    renderSidebar({ collapsed: true });
    expect(screen.queryByText('TaskBot')).not.toBeInTheDocument();
  });

  it('hides conversations', () => {
    renderSidebar({ conversations: mockConversations, collapsed: true });
    expect(screen.queryByText('First Chat')).not.toBeInTheDocument();
  });

  it('hides the New chat button', () => {
    renderSidebar({ collapsed: true });
    expect(screen.queryByText('New chat')).not.toBeInTheDocument();
  });

  it('applies the tb-sidebar-collapsed class', () => {
    const { container } = renderSidebar({ collapsed: true });
    expect(container.querySelector('.tb-sidebar')).toHaveClass('tb-sidebar-collapsed');
  });
});

describe('Sidebar — interactions', () => {
  it('calls onNew when the New chat button is clicked', async () => {
    const onNew = vi.fn();
    renderSidebar({ onNew });
    await userEvent.click(screen.getByText('New chat'));
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it('calls onSelect with the conversation id when a conversation is clicked', async () => {
    const onSelect = vi.fn();
    renderSidebar({ conversations: mockConversations, onSelect });
    await userEvent.click(screen.getByText('First Chat'));
    expect(onSelect).toHaveBeenCalledWith('c1');
  });

  it('calls onDelete with the conversation id when the delete button is clicked', async () => {
    const onDelete = vi.fn();
    renderSidebar({ conversations: mockConversations, onDelete });
    const deleteButtons = screen.getAllByLabelText('Delete conversation');
    await userEvent.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith('c1');
  });

  it('does not call onSelect when the delete button is clicked', async () => {
    const onSelect = vi.fn();
    renderSidebar({ conversations: mockConversations, onSelect });
    const deleteButtons = screen.getAllByLabelText('Delete conversation');
    await userEvent.click(deleteButtons[0]);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('calls onToggle when the collapse button is clicked', async () => {
    const onToggle = vi.fn();
    renderSidebar({ onToggle });
    await userEvent.click(screen.getByLabelText('Toggle sidebar'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
