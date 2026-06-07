import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Composer } from '../../components/Composer';

describe('Composer', () => {
  it('renders the textarea and send button', () => {
    render(<Composer value="" onChange={() => {}} onSend={() => {}} disabled={false} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
  });

  it('shows the placeholder text', () => {
    render(<Composer value="" onChange={() => {}} onSend={() => {}} disabled={false} />);
    expect(screen.getByPlaceholderText("Ask about a teammate's work…")).toBeInTheDocument();
  });

  it('disables both the textarea and send button when disabled prop is true', () => {
    render(<Composer value="hello" onChange={() => {}} onSend={() => {}} disabled={true} />);
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('disables the send button when value is empty', () => {
    render(<Composer value="" onChange={() => {}} onSend={() => {}} disabled={false} />);
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('disables the send button when value is only whitespace', () => {
    render(<Composer value="   " onChange={() => {}} onSend={() => {}} disabled={false} />);
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('enables the send button when value has content', () => {
    render(<Composer value="hello" onChange={() => {}} onSend={() => {}} disabled={false} />);
    expect(screen.getByRole('button', { name: 'Send' })).not.toBeDisabled();
  });

  it('calls onChange when the user types', async () => {
    const onChange = vi.fn();
    render(<Composer value="" onChange={onChange} onSend={() => {}} disabled={false} />);
    await userEvent.type(screen.getByRole('textbox'), 'a');
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('calls onSend when Enter is pressed with a non-empty value', () => {
    const onSend = vi.fn();
    render(<Composer value="hello" onChange={() => {}} onSend={onSend} disabled={false} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('calls onSend when the send button is clicked', async () => {
    const onSend = vi.fn();
    render(<Composer value="hello" onChange={() => {}} onSend={onSend} disabled={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('does not call onSend when Shift+Enter is pressed', () => {
    const onSend = vi.fn();
    render(<Composer value="hello" onChange={() => {}} onSend={onSend} disabled={false} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('does not call onSend when Enter is pressed with an empty value', () => {
    const onSend = vi.fn();
    render(<Composer value="" onChange={() => {}} onSend={onSend} disabled={false} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('does not call onSend when Enter is pressed while disabled', () => {
    const onSend = vi.fn();
    render(<Composer value="hello" onChange={() => {}} onSend={onSend} disabled={true} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
  });
});
