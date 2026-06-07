import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPanel } from '../../components/SettingsPanel';
import type { Settings } from '../../types';

const defaultSettings: Settings = {
  accent: 'blue',
  font: 'DM Sans',
  density: 'comfortable',
  showTime: true,
};

describe('SettingsPanel — rendering', () => {
  it('renders the panel heading', () => {
    render(<SettingsPanel settings={defaultSettings} onChange={() => {}} onClose={() => {}} />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders the Appearance section', () => {
    render(<SettingsPanel settings={defaultSettings} onChange={() => {}} onClose={() => {}} />);
    expect(screen.getByText('Appearance')).toBeInTheDocument();
  });

  it('renders the Messages section', () => {
    render(<SettingsPanel settings={defaultSettings} onChange={() => {}} onClose={() => {}} />);
    expect(screen.getByText('Messages')).toBeInTheDocument();
  });

  it('renders an accent chip for each accent colour', () => {
    render(<SettingsPanel settings={defaultSettings} onChange={() => {}} onClose={() => {}} />);
    ['green', 'blue', 'violet', 'amber'].forEach((name) => {
      expect(screen.getByLabelText(`Accent ${name}`)).toBeInTheDocument();
    });
  });

  it('marks the active accent chip with data-on="1"', () => {
    render(<SettingsPanel settings={defaultSettings} onChange={() => {}} onClose={() => {}} />);
    expect(screen.getByLabelText('Accent blue')).toHaveAttribute('data-on', '1');
    expect(screen.getByLabelText('Accent green')).toHaveAttribute('data-on', '0');
  });

  it('renders the font selector with the current font selected', () => {
    render(<SettingsPanel settings={defaultSettings} onChange={() => {}} onClose={() => {}} />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('DM Sans');
  });

  it('renders the density segmented control', () => {
    render(<SettingsPanel settings={defaultSettings} onChange={() => {}} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: 'compact' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'comfortable' })).toBeInTheDocument();
  });

  it('sets aria-checked on the timestamp toggle to match showTime', () => {
    render(<SettingsPanel settings={defaultSettings} onChange={() => {}} onClose={() => {}} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('sets aria-checked="false" when showTime is false', () => {
    render(
      <SettingsPanel settings={{ ...defaultSettings, showTime: false }} onChange={() => {}} onClose={() => {}} />,
    );
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });
});

describe('SettingsPanel — interactions', () => {
  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    render(<SettingsPanel settings={defaultSettings} onChange={() => {}} onClose={onClose} />);
    await userEvent.click(screen.getByLabelText('Close settings'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onChange with the new accent when an accent chip is clicked', async () => {
    const onChange = vi.fn();
    render(<SettingsPanel settings={defaultSettings} onChange={onChange} onClose={() => {}} />);
    await userEvent.click(screen.getByLabelText('Accent green'));
    expect(onChange).toHaveBeenCalledWith({ accent: 'green' });
  });

  it('does not fire onChange when the already-active accent chip is clicked', async () => {
    const onChange = vi.fn();
    render(<SettingsPanel settings={defaultSettings} onChange={onChange} onClose={() => {}} />);
    await userEvent.click(screen.getByLabelText('Accent blue'));
    expect(onChange).toHaveBeenCalledWith({ accent: 'blue' });
  });

  it('calls onChange with the new font when the font select changes', async () => {
    const onChange = vi.fn();
    render(<SettingsPanel settings={defaultSettings} onChange={onChange} onClose={() => {}} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Figtree');
    expect(onChange).toHaveBeenCalledWith({ font: 'Figtree' });
  });

  it('calls onChange with the new density when a density option is clicked', async () => {
    const onChange = vi.fn();
    render(<SettingsPanel settings={defaultSettings} onChange={onChange} onClose={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'compact' }));
    expect(onChange).toHaveBeenCalledWith({ density: 'compact' });
  });

  it('calls onChange to toggle showTime off when the toggle is clicked', async () => {
    const onChange = vi.fn();
    render(<SettingsPanel settings={defaultSettings} onChange={onChange} onClose={() => {}} />);
    await userEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith({ showTime: false });
  });

  it('calls onChange to toggle showTime on when the toggle is clicked and currently off', async () => {
    const onChange = vi.fn();
    render(
      <SettingsPanel settings={{ ...defaultSettings, showTime: false }} onChange={onChange} onClose={() => {}} />,
    );
    await userEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith({ showTime: true });
  });
});
