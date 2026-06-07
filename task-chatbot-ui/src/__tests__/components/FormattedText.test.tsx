import { render, screen } from '@testing-library/react';
import { FormattedText } from '../../components/FormattedText';

describe('FormattedText — plain text and structure', () => {
  it('renders plain text', () => {
    render(<FormattedText text="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders an empty line as a gap div', () => {
    const { container } = render(<FormattedText text={"line1\n\nline2"} />);
    expect(container.querySelector('.tb-line-gap')).toBeInTheDocument();
  });

  it('renders ——— as a horizontal divider', () => {
    const { container } = render(<FormattedText text="———" />);
    expect(container.querySelector('hr.tb-divider')).toBeInTheDocument();
  });
});

describe('FormattedText — inline formatting', () => {
  it('renders **text** as a <strong> element', () => {
    render(<FormattedText text="some **bold** text" />);
    expect(screen.getByText('bold').tagName).toBe('STRONG');
  });

  it('renders a Markdown link as an <a> element', () => {
    render(<FormattedText text="[Click here](https://example.com)" />);
    const link = screen.getByText('Click here');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('blocks non-http/https URLs by replacing them with #', () => {
    render(<FormattedText text="[evil](javascript:alert(1))" />);
    expect(screen.getByText('evil')).toHaveAttribute('href', '#');
  });

  it('renders JIRA-style link text with the tb-link-key class', () => {
    const { container } = render(<FormattedText text="[ABC-123](https://jira.example.com)" />);
    expect(container.querySelector('.tb-link-key')).toHaveTextContent('ABC-123');
  });

  it('renders a JIRA ticket token (e.g. ABC-123) as a mono span', () => {
    const { container } = render(<FormattedText text="Ticket ABC-123 is done" />);
    expect(container.querySelector('.tb-mono')).toHaveTextContent('ABC-123');
  });
});

describe('FormattedText — section headings', () => {
  it('renders a line that is entirely **text** as a heading', () => {
    const { container } = render(<FormattedText text="**Section Title**" />);
    const heading = container.querySelector('.tb-heading');
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Section Title');
  });

  it('does not render inline **bold** as a heading when surrounded by other text', () => {
    const { container } = render(<FormattedText text="some **bold** word" />);
    expect(container.querySelector('.tb-heading')).not.toBeInTheDocument();
  });
});

describe('FormattedText — bullet points', () => {
  it('renders a • bullet item', () => {
    const { container } = render(<FormattedText text="• First item" />);
    expect(container.querySelector('.tb-bullet')).toBeInTheDocument();
    expect(container.querySelector('.tb-bullet-text')).toHaveTextContent('First item');
  });

  it('renders a - bullet item', () => {
    const { container } = render(<FormattedText text="- Second item" />);
    expect(container.querySelector('.tb-bullet')).toBeInTheDocument();
    expect(container.querySelector('.tb-bullet-text')).toHaveTextContent('Second item');
  });

  it('renders multiple bullet items', () => {
    const { container } = render(<FormattedText text={"• Alpha\n• Beta\n• Gamma"} />);
    expect(container.querySelectorAll('.tb-bullet')).toHaveLength(3);
  });
});

describe('FormattedText — status pills', () => {
  it('renders a status pill when Status metadata follows a bullet', () => {
    const text = '• A task\n  Status: In Progress';
    const { container } = render(<FormattedText text={text} />);
    const pill = container.querySelector('.tb-status-pill');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveTextContent('In Progress');
  });

  it('assigns data-s="done" for done-like statuses', () => {
    const { container } = render(<FormattedText text={'• Task\n  Status: Done'} />);
    expect(container.querySelector('.tb-status-pill')).toHaveAttribute('data-s', 'done');
  });

  it('assigns data-s="progress" for in-progress statuses', () => {
    const { container } = render(<FormattedText text={'• Task\n  Status: In Progress'} />);
    expect(container.querySelector('.tb-status-pill')).toHaveAttribute('data-s', 'progress');
  });

  it('assigns data-s="review" for review statuses', () => {
    const { container } = render(<FormattedText text={'• Task\n  Status: In Review'} />);
    expect(container.querySelector('.tb-status-pill')).toHaveAttribute('data-s', 'review');
  });

  it('assigns data-s="blocked" for blocked statuses', () => {
    const { container } = render(<FormattedText text={'• Task\n  Status: Blocked'} />);
    expect(container.querySelector('.tb-status-pill')).toHaveAttribute('data-s', 'blocked');
  });

  it('assigns data-s="default" for unrecognised statuses', () => {
    const { container } = render(<FormattedText text={'• Task\n  Status: Pending'} />);
    expect(container.querySelector('.tb-status-pill')).toHaveAttribute('data-s', 'default');
  });
});

describe('FormattedText — field lines', () => {
  it('renders a Priority field line with a priority dot', () => {
    const { container } = render(<FormattedText text={'• Task\n  Priority: High'} />);
    expect(container.querySelector('.tb-field-line')).toBeInTheDocument();
    expect(container.querySelector('.tb-priority-dot')).toBeInTheDocument();
  });

  it('renders a Reporter field line', () => {
    const { container } = render(<FormattedText text={'• Task\n  Reporter: Alice'} />);
    const field = container.querySelector('.tb-field-line');
    expect(field).toBeInTheDocument();
    expect(field).toHaveTextContent('Reporter:');
    expect(field).toHaveTextContent('Alice');
  });

  it('renders a Due field line with a formatted date', () => {
    const { container } = render(<FormattedText text={'• Task\n  Due: 2025-12-25'} />);
    const field = container.querySelector('.tb-field-line');
    expect(field).toBeInTheDocument();
    expect(field).toHaveTextContent('Due:');
    // The date is locale-formatted, just check it exists and doesn't show raw ISO
    expect(field?.textContent).not.toContain('2025-12-25');
  });

  it('renders Priority with a coloured dot based on the priority level', () => {
    const { container: high } = render(<FormattedText text={'• T\n  Priority: High'} />);
    const { container: low } = render(<FormattedText text={'• T\n  Priority: Low'} />);
    const highColor = (high.querySelector('.tb-priority-dot') as HTMLElement).style.background;
    const lowColor = (low.querySelector('.tb-priority-dot') as HTMLElement).style.background;
    expect(highColor).not.toBe(lowColor);
  });
});
