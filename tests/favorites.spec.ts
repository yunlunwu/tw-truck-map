import { test, expect } from '@playwright/test';
import { mockTaipeiApis } from './mocks';

test.use({ viewport: { width: 430, height: 900 } });

test.beforeEach(async ({ page }) => {
  await mockTaipeiApis(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Saved' }).click();
});

test('shows the empty state with no saved places', async ({ page }) => {
  await expect(page.getByText(/No saved places yet/)).toBeVisible();
});

test('adds and then deletes a saved place', async ({ page }) => {
  // Not `exact`, the "Add a place" prompt card below the list also matches
  // "Add" as a substring — pin to the top-right trigger button by its exact name.
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('Add saved place')).toBeVisible();

  await page.getByPlaceholder('Home').fill('Test Home');
  await page.getByPlaceholder('臺北市大安區永康街47巷8號').fill('台北市大安區信義路一段1號');
  // Both the top-right trigger and the modal's own submit button are labelled
  // "Add" — scope to the form to click the right one.
  await page.locator('form').getByRole('button', { name: 'Add' }).click();

  // forwardGeocode is mocked to resolve, so the modal closes on its own.
  await expect(page.getByText('Add saved place')).toBeHidden();
  await expect(page.getByText('Test Home')).toBeVisible();

  // Not `exact`, the favorite card itself is also a `role="button"` whose
  // accessible name is its full text content (name + address + "Delete").
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete', exact: true }).click();

  await expect(page.getByText('Test Home')).toBeHidden();
  await expect(page.getByText(/No saved places yet/)).toBeVisible();
});
