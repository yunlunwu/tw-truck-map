import { test, expect } from '@playwright/test';
import { mockTaipeiApis } from './mocks';

// App.jsx switches its entire layout at a hard breakpoint (isDesktop = window
// width >= 1200): a phone shell with a bottom tab bar below it, a single-page
// desktop dashboard at/above it. Exercise both sides of that branch, plus the
// live resize (App.jsx recomputes isDesktop on `resize`, it isn't fixed at
// mount).
test('renders the phone shell below 1200px and the desktop dashboard at/above it', async ({ page }) => {
  await mockTaipeiApis(page);

  await page.setViewportSize({ width: 430, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Map' })).toBeVisible();
  await expect(page.getByText('Taipei Rubbish Truck Map')).toHaveCount(0);

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByText('Taipei Rubbish Truck Map')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Map' })).toHaveCount(0);

  await page.setViewportSize({ width: 430, height: 900 });
  await expect(page.getByRole('button', { name: 'Map' })).toBeVisible();
});
