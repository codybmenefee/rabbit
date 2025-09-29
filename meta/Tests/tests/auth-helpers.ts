import { Page } from '@playwright/test';

/**
 * Authentication helpers for Playwright testing
 * These utilities help bypass or mock authentication during testing
 */

export class AuthHelpers {
  constructor(private page: Page) {}

  /**
   * Bypass authentication by mocking Clerk's authentication state
   * This sets up a mock authenticated user for testing
   */
  async mockAuthenticatedUser(userData?: {
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  }) {
    const defaultUser = {
      id: 'test-user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      ...userData
    };

    // Mock Clerk's authentication state
    await this.page.addInitScript((user) => {
      // Mock Clerk's authentication functions
      (window as any).__CLERK_FRONTEND_API = 'https://api.clerk.dev';
      (window as any).__CLERK_PUBLISHABLE_KEY = 'pk_test_dummy_key_for_testing';
      
      // Mock the user object
      (window as any).__CLERK_USER = user;
      
      // Mock Clerk's authentication state
      (window as any).__CLERK_IS_SIGNED_IN = true;
      (window as any).__CLERK_SESSION_ID = 'test-session-123';
      
      // Override Clerk's authentication checks
      (window as any).Clerk = {
        user: user,
        session: { id: 'test-session-123' },
        isSignedIn: () => true,
        isLoaded: () => true,
        load: () => Promise.resolve(),
        signOut: () => Promise.resolve(),
        signIn: () => Promise.resolve(),
        signUp: () => Promise.resolve(),
      };
    }, defaultUser);
  }

  /**
   * Mock unauthenticated state for testing sign-in flows
   */
  async mockUnauthenticatedUser() {
    await this.page.addInitScript(() => {
      (window as any).__CLERK_USER = null;
      (window as any).__CLERK_IS_SIGNED_IN = false;
      (window as any).__CLERK_SESSION_ID = null;
      
      (window as any).Clerk = {
        user: null,
        session: null,
        isSignedIn: () => false,
        isLoaded: () => true,
        load: () => Promise.resolve(),
        signOut: () => Promise.resolve(),
        signIn: () => Promise.resolve(),
        signUp: () => Promise.resolve(),
      };
    });
  }

  /**
   * Navigate to a protected route with authentication bypassed
   */
  async navigateToProtectedRoute(route: string, authenticated = true) {
    if (authenticated) {
      await this.mockAuthenticatedUser();
    } else {
      await this.mockUnauthenticatedUser();
    }
    
    await this.page.goto(route);
  }

  /**
   * Wait for authentication state to be loaded
   */
  async waitForAuthState() {
    await this.page.waitForFunction(() => {
      return (window as any).Clerk?.isLoaded?.() === true;
    });
  }
}

/**
 * Utility function to create authenticated test context
 */
export async function createAuthenticatedTestContext(page: Page) {
  const authHelpers = new AuthHelpers(page);
  await authHelpers.mockAuthenticatedUser();
  return authHelpers;
}

/**
 * Utility function to create unauthenticated test context
 */
export async function createUnauthenticatedTestContext(page: Page) {
  const authHelpers = new AuthHelpers(page);
  await authHelpers.mockUnauthenticatedUser();
  return authHelpers;
}
