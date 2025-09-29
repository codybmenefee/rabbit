import { test, expect } from '@playwright/test';
import { AuthHelpers, createAuthenticatedTestContext } from './auth-helpers';

/**
 * Simple test to demonstrate authentication bypass for Playwright
 * This test shows how to navigate to protected routes without authentication
 */

test('should access protected routes with authentication bypass', async ({ page }) => {
  // Create authenticated test context
  const authHelpers = await createAuthenticatedTestContext(page);
  
  // Navigate to protected routes that would normally require authentication
  await authHelpers.navigateToProtectedRoute('/history');
  await expect(page).toHaveURL('/history');
  
  await authHelpers.navigateToProtectedRoute('/channels');
  await expect(page).toHaveURL('/channels');
  
  await authHelpers.navigateToProtectedRoute('/settings');
  await expect(page).toHaveURL('/settings');
});

test('should handle unauthenticated state', async ({ page }) => {
  // Create unauthenticated test context
  const authHelpers = new AuthHelpers(page);
  await authHelpers.mockUnauthenticatedUser();
  
  // Navigate to protected route - should redirect to sign-in
  await page.goto('/history');
  
  // Should redirect to Clerk sign-in page
  await expect(page).toHaveURL(/accounts\.dev\/sign-in/);
});

test('should work with navigation menu', async ({ page }) => {
  // Create authenticated test context
  const authHelpers = await createAuthenticatedTestContext(page);
  
  // Navigate to home page
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Test navigation to Video page
  await page.getByRole('link', { name: 'Video' }).click();
  await expect(page).toHaveURL('/history');
  
  // Test navigation to Channel page
  await page.getByRole('link', { name: 'Channel' }).click();
  await expect(page).toHaveURL('/channels');
  
  // Test navigation back to Dashboard
  await page.getByRole('link', { name: 'Dashboard' }).click();
  await expect(page).toHaveURL('/');
});
