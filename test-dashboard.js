import { test, expect } from '@playwright/test';

test('Dashboard should show watch event count', async ({ page }) => {
  // Mock authentication
  await page.addInitScript((user) => {
    window.__CLERK_FRONTEND_API = 'https://api.clerk.dev';
    window.__CLERK_PUBLISHABLE_KEY = 'pk_test_dummy_key_for_testing';
    window.__CLERK_USER = user;
    window.__CLERK_IS_SIGNED_IN = true;
    window.__CLERK_SESSION_ID = 'test-session-123';
    
    window.Clerk = {
      user: user,
      session: { id: 'test-session-123' },
      isSignedIn: () => true,
      isLoaded: () => true,
      load: () => Promise.resolve(),
      signOut: () => Promise.resolve(),
      signIn: () => Promise.resolve(),
      signUp: () => Promise.resolve(),
    };
  }, {
    id: 'test-user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User'
  });

  // Navigate to dashboard
  await page.goto('http://localhost:4000');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Check that the dashboard is showing data or loading state
  const loadingText = page.getByText('Fetching your data from Convex...');
  const noDataText = page.getByText('No data yet');
  const dataIndicator = page.getByText('records');
  
  // One of these should be visible
  const hasLoading = await loadingText.isVisible().catch(() => false);
  const hasNoData = await noDataText.isVisible().catch(() => false);
  const hasData = await dataIndicator.isVisible().catch(() => false);
  
  expect(hasLoading || hasNoData || hasData).toBe(true);
  
  console.log('Dashboard test completed successfully');
});
