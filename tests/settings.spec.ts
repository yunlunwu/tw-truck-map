import { test, expect } from '@playwright/test';
import { mockTaipeiApis } from './mocks';

// Run against the desktop layout: its Settings trigger is a labelled button
// ("Settings"), whereas the phone shell only has an unlabelled gear icon —
// this makes for a more robust selector, and both layouts share the same
// <TweaksPanel/>, so the panel's own behaviour is identical either way.
test.use({ viewport: { width: 1440, height: 900 } });

const ACCENT = 'rgb(15, 123, 90)'; // t.accent from theme() in shared.jsx — the "active" highlight colour

test.beforeEach(async ({ page }) => {
  await mockTaipeiApis(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
});

test('toggles dark mode', async ({ page }) => {
  // Light is selected by default.
  await expect(page.getByRole('button', { name: 'Light' })).toHaveCSS('background-color', ACCENT);

  await page.getByRole('button', { name: 'Dark' }).click();

  await expect(page.getByRole('button', { name: 'Dark' })).toHaveCSS('background-color', ACCENT);
  await expect(page.getByRole('button', { name: 'Light' })).not.toHaveCSS('background-color', ACCENT);
});

test('toggles information density', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Comfortable' })).toHaveCSS('background-color', ACCENT);

  await page.getByRole('button', { name: 'Compact' }).click();

  await expect(page.getByRole('button', { name: 'Compact' })).toHaveCSS('background-color', ACCENT);
  await expect(page.getByRole('button', { name: 'Comfortable' })).not.toHaveCSS('background-color', ACCENT);
});

test('switches language', async ({ page }) => {
  // The language buttons themselves are never translated ("中文" / "English"
  // literals in i18n.jsx), so they're a stable selector regardless of state.
  await expect(page.getByText('Language')).toBeVisible();

  await page.getByRole('button', { name: '中文' }).click();

  await expect(page.getByText('語言')).toBeVisible();
  await expect(page.getByText('Language')).toHaveCount(0);
});

test('pins the location to a preset', async ({ page }) => {
  // App.jsx kicks off an async reverse-geocode of the (mocked) GPS position on
  // mount and applies it whenever it resolves, with no cancellation if the
  // location changes in the meantime. Wait for that first write to land so it
  // can't race with — and clobber — the preset click below.
  await expect(page.getByText('新北市永和區測試路')).toBeVisible();

  await page.getByRole('button', { name: 'Taipei Station' }).click();

  // The desktop address bar's placeholder reflects the shared "current
  // location" from context (properly localized), so it's a robust place to
  // confirm the pin took effect.
  await expect(page.getByPlaceholder(/current: Taipei Station/)).toBeVisible();
});
