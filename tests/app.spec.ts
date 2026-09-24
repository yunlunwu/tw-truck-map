import { test, expect } from '@playwright/test';
import { mockTaipeiApis } from './mocks';

// The tab bar / per-screen navigation only exists below the app's desktop
// breakpoint (App.jsx: isDesktop = vw >= 1200 renders a totally different
// dashboard instead). Pin these tests to a phone-sized viewport so they're
// exercising the same UI every run regardless of the project's own device
// defaults — see responsive-layout.spec.ts for the breakpoint itself.
test.use({ viewport: { width: 430, height: 900 } });

test.beforeEach(async ({ page }) => {
  await mockTaipeiApis(page);
});

test.describe('app shell', () => {
  test('loads on the map tab with the tab bar visible', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Taipei Rubbish Truck Tracker/);
    await expect(page.getByPlaceholder('Search address or landmark…')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Map' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Times' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guide' })).toBeVisible();
  });

  test('renders the mocked truck as running', async ({ page }) => {
    await page.goto('/');

    // Confirms the whole fetch → process → render pipeline: one truck was
    // stubbed in tests/mocks.ts, so this text is only correct if it made it
    // all the way from the mocked API response to the screen.
    await expect(page.getByText('Live · 1 running')).toBeVisible();
  });

  test('tab bar switches between screens', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Times' }).click();
    await expect(page.getByText("Today's collection times")).toBeVisible();

    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByPlaceholder('Enter suburb, route or number plate')).toBeVisible();

    await page.getByRole('button', { name: 'Saved' }).click();
    await expect(page.getByText('Saved places', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Guide' }).click();
    await expect(page.getByText('Sorting guide')).toBeVisible();

    await page.getByRole('button', { name: 'Map' }).click();
    await expect(page.getByPlaceholder('Search address or landmark…')).toBeVisible();
  });
});
