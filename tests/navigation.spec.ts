import { test, expect } from '@playwright/test';
import { AuthHelpers, createAuthenticatedTestContext } from './auth-helpers';

test.describe('Basic Navigation and Dashboard', () => {
  let authHelpers: AuthHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = await createAuthenticatedTestContext(page);
  });

  test('should load dashboard with KPIs and chart', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Assert dashboard loads
    await expect(page.getByTestId('total-videos')).toBeVisible(); // Assume data-testid added if needed, or text
    await expect(page.getByText(/Total Videos/)).toBeVisible();
    await expect(page.getByText(/Unique Channels/)).toBeVisible();
    await expect(page.locator('svg')).toBeVisible(); // Chart present

    // Basic functionality
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
  });

  test('should redirect unauthenticated to sign-in', async ({ page }) => {
    // Don't mock auth
    await page.goto('/');
    await expect(page).toHaveURL(/sign-in/);
  });
});
