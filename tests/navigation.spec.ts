import { test, expect } from '@playwright/test';
import { AuthHelpers, createAuthenticatedTestContext } from './auth-helpers';

test.describe('Navigation Menu', () => {
  let authHelpers: AuthHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = await createAuthenticatedTestContext(page);
  });

  test('should display the correct navigation tabs', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check that the navigation menu contains the expected tabs
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Video' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Channel' })).toBeVisible();
    
    // Verify that old navigation items are not present
    await expect(page.getByRole('link', { name: 'Analytics' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Topics' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'History' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Trends' })).not.toBeVisible();
  });

  test('should navigate to correct routes when clicking navigation links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test Dashboard navigation
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL('/');
    
    // Test Video navigation (should go to /history)
    await page.getByRole('link', { name: 'Video' }).click();
    await expect(page).toHaveURL('/history');
    
    // Test Channel navigation
    await page.getByRole('link', { name: 'Channel' }).click();
    await expect(page).toHaveURL('/channels');
  });

  test('should show active state for current page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Dashboard should be active when on home page
    const dashboardLink = page.getByRole('link', { name: 'Dashboard' });
    await expect(dashboardLink).toHaveClass(/bg-purple-500\/10/);
    
    // Navigate to Video page and check active state
    await page.getByRole('link', { name: 'Video' }).click();
    await page.waitForLoadState('networkidle');
    
    const videoLink = page.getByRole('link', { name: 'Video' });
    await expect(videoLink).toHaveClass(/bg-purple-500\/10/);
  });

  test('should display bottom navigation items', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that Import Data and Settings are still present
    await expect(page.getByRole('link', { name: 'Import Data' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that mobile menu button is visible
    const menuButton = page.getByRole('button', { name: 'Open navigation menu' });
    await expect(menuButton).toBeVisible();
    
    // Open mobile menu
    await menuButton.click();
    
    // Check that navigation items are visible in mobile menu
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Video' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Channel' })).toBeVisible();
  });
});

test.describe('Navigation without Authentication', () => {
  test('should redirect to sign-in when accessing protected routes without auth', async ({ page }) => {
    // Don't mock authentication for this test
    await page.goto('/history');
    
    // Should redirect to Clerk sign-in
    await expect(page).toHaveURL(/accounts\.dev\/sign-in/);
  });
});
