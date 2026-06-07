import { test, expect, type Route } from '@playwright/test';

// Build a minimal SSE response body from a single response string.
function sseBody(text: string): string {
  return `data: ${JSON.stringify({ token: text })}\n\ndata: [DONE]\n\n`;
}

// Route handler factory: fulfils /api/v1/chat with a mocked SSE stream.
function mockChat(text = 'Hello from TaskBot') {
  return async (route: Route) => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      body: sseBody(text),
    });
  };
}

// Clear localStorage before every test so each one starts with a blank slate.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/');
});

// ─── Empty state ──────────────────────────────────────────────────────────────

test.describe('Empty state', () => {
  test('shows the TaskBot greeting', async ({ page }) => {
    await expect(page.getByText("Hi, I'm TaskBot.")).toBeVisible();
  });

  test('shows the subtitle', async ({ page }) => {
    await expect(page.getByText('Find out what your teammates are up to!')).toBeVisible();
  });

  test('renders suggestion chips', async ({ page }) => {
    await expect(page.getByRole('button', { name: /working on right now/i })).toBeVisible();
  });

  test('composer textarea is present', async ({ page }) => {
    await expect(page.getByRole('textbox')).toBeVisible();
  });

  test('send button is disabled when the composer is empty', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Send' })).toBeDisabled();
  });
});

// ─── Suggestion chips ─────────────────────────────────────────────────────────

test.describe('Suggestion chips', () => {
  test('clicking a chip populates the composer', async ({ page }) => {
    await page.getByRole('button', { name: /working on right now/i }).click();
    const value = await page.getByRole('textbox').inputValue();
    expect(value).toContain('Mark');
  });

  test('clicking a chip enables the send button', async ({ page }) => {
    await page.getByRole('button', { name: /working on right now/i }).click();
    await expect(page.getByRole('button', { name: 'Send' })).toBeEnabled();
  });
});

// ─── Settings panel ───────────────────────────────────────────────────────────

test.describe('Settings panel', () => {
  test('opens when the settings button is clicked', async ({ page }) => {
    await page.getByLabel('Settings', { exact: true }).click();
    await expect(page.getByText('Appearance')).toBeVisible();
  });

  test('closes when the close button is clicked', async ({ page }) => {
    await page.getByLabel('Settings', { exact: true }).click();
    await page.getByLabel('Close settings').click();
    await expect(page.getByText('Appearance')).not.toBeVisible();
  });

  test('toggles on repeated clicks of the settings button', async ({ page }) => {
    await page.getByLabel('Settings', { exact: true }).click();
    await expect(page.getByText('Appearance')).toBeVisible();
    await page.getByLabel('Settings', { exact: true }).click();
    await expect(page.getByText('Appearance')).not.toBeVisible();
  });

  test('changing the accent colour updates the CSS variable', async ({ page }) => {
    await page.getByLabel('Settings', { exact: true }).click();
    await page.getByLabel('Accent green').click();
    const accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
    );
    expect(accent).toBe('#1f9d6b');
  });

  test('toggling timestamps hides them from messages', async ({ page }) => {
    await page.route('**/api/v1/chat', mockChat());
    await page.getByRole('textbox').fill('Test');
    await page.keyboard.press('Enter');
    await page.locator('.tb-msg-user').waitFor();

    // Timestamps are shown by default.
    await expect(page.locator('.tb-msg-time').first()).toBeVisible();

    await page.getByLabel('Settings', { exact: true }).click();
    await page.getByRole('switch').click();

    await expect(page.locator('.tb-msg-time')).toHaveCount(0);
  });
});

// ─── Sidebar ─────────────────────────────────────────────────────────────────

test.describe('Sidebar', () => {
  test('shows the TaskBot brand name', async ({ page }) => {
    await expect(page.locator('.tb-brand-name')).toHaveText('TaskBot');
  });

  test('collapses when the toggle button is clicked', async ({ page }) => {
    await page.getByLabel('Toggle sidebar').click();
    await expect(page.getByText('New chat')).not.toBeVisible();
    await expect(page.locator('.tb-sidebar')).toHaveClass(/tb-sidebar-collapsed/);
  });

  test('expands again after a second toggle', async ({ page }) => {
    await page.getByLabel('Toggle sidebar').click();
    await page.getByLabel('Toggle sidebar').click();
    await expect(page.getByText('New chat')).toBeVisible();
    await expect(page.locator('.tb-sidebar')).not.toHaveClass(/tb-sidebar-collapsed/);
  });
});

// ─── Sending messages ─────────────────────────────────────────────────────────

test.describe('Sending messages', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/chat', mockChat());
  });

  test('user message appears in the thread', async ({ page }) => {
    await page.getByRole('textbox').fill('Hello bot');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.locator('.tb-msg-user .tb-msg-body')).toHaveText('Hello bot');
  });

  test('bot response appears after sending', async ({ page }) => {
    await page.getByRole('textbox').fill('Hello bot');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.locator('.tb-msg-bot .tb-bubble-bot')).toContainText('Hello from TaskBot');
  });

  test('Enter key sends the message', async ({ page }) => {
    await page.getByRole('textbox').fill('Hello via keyboard');
    await page.keyboard.press('Enter');
    await expect(page.locator('.tb-msg-user .tb-msg-body')).toHaveText('Hello via keyboard');
  });

  test('Shift+Enter inserts a newline without sending', async ({ page }) => {
    await page.getByRole('textbox').fill('Not sent');
    await page.keyboard.press('Shift+Enter');
    await expect(page.locator('.tb-msg-user')).not.toBeVisible();
    const value = await page.getByRole('textbox').inputValue();
    expect(value).toContain('Not sent');
  });

  test('composer is cleared after sending', async ({ page }) => {
    await page.getByRole('textbox').fill('Clear me');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByRole('textbox')).toHaveValue('');
  });

  test('empty state disappears after the first message', async ({ page }) => {
    await page.getByRole('textbox').fill('First message');
    await page.keyboard.press('Enter');
    await expect(page.getByText("Hi, I'm TaskBot.")).not.toBeVisible();
  });

  test('header title updates to the conversation title', async ({ page }) => {
    await page.getByRole('textbox').fill('My question');
    await page.keyboard.press('Enter');
    await expect(page.locator('.tb-header-title')).toHaveText('My question');
  });

  test('conversation appears in the sidebar', async ({ page }) => {
    await page.getByRole('textbox').fill('Sidebar entry');
    await page.keyboard.press('Enter');
    await expect(page.locator('.tb-convo-title', { hasText: 'Sidebar entry' })).toBeVisible();
  });
});

// ─── Conversation management ──────────────────────────────────────────────────

test.describe('Conversation management', () => {
  // Send one message before each test in this block.
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/chat', mockChat());
    await page.getByRole('textbox').fill('Test conversation');
    await page.keyboard.press('Enter');
    await page.locator('.tb-msg-user').waitFor();
  });

  test('New chat returns to the empty state', async ({ page }) => {
    await page.getByText('New chat').click();
    await expect(page.getByText("Hi, I'm TaskBot.")).toBeVisible();
  });

  test('New chat resets the header title', async ({ page }) => {
    await page.getByText('New chat').click();
    await expect(page.locator('.tb-header-title')).toHaveText('New conversation');
  });

  test('deleting a conversation removes it from the sidebar', async ({ page }) => {
    await page.getByLabel('Delete conversation').click();
    await expect(page.locator('.tb-convo-title', { hasText: 'Test conversation' })).not.toBeVisible();
  });

  test('deleting the active conversation returns to the empty state', async ({ page }) => {
    await page.getByLabel('Delete conversation').click();
    await expect(page.getByText("Hi, I'm TaskBot.")).toBeVisible();
  });

  test('switching to a previous conversation restores its messages', async ({ page }) => {
    await page.getByText('New chat').click();
    await page.getByRole('textbox').fill('Second conversation');
    await page.keyboard.press('Enter');
    await page.locator('.tb-msg-user').waitFor();

    await page.locator('.tb-convo-title', { hasText: 'Test conversation' }).click();
    await expect(page.locator('.tb-msg-user .tb-msg-body')).toHaveText('Test conversation');
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

test.describe('Error handling', () => {
  test('shows an error bubble when the backend returns HTTP 500', async ({ page }) => {
    await page.route('**/api/v1/chat', (route) => route.fulfill({ status: 500 }));
    await page.getByRole('textbox').fill('This will fail');
    await page.keyboard.press('Enter');
    await expect(page.locator('.tb-bubble-error')).toBeVisible();
    await expect(page.locator('.tb-bubble-error')).toContainText('Server error');
  });

  test('shows an error bubble when the network is unavailable', async ({ page }) => {
    await page.route('**/api/v1/chat', (route) => route.abort('failed'));
    await page.getByRole('textbox').fill('No network');
    await page.keyboard.press('Enter');
    await expect(page.locator('.tb-bubble-error')).toBeVisible();
    await expect(page.locator('.tb-bubble-error')).toContainText("Couldn't reach the backend");
  });
});
