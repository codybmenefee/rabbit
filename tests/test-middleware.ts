import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Test middleware that bypasses authentication for Playwright testing
 * This should be used instead of the main middleware.ts during testing
 */

// Allow unauthenticated access to all routes during testing
const isPublicRoute = createRouteMatcher([
  "/(.*)", // Allow all routes in test mode
]);

export default clerkMiddleware(async (auth, req) => {
  // In test mode, skip authentication entirely
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    return;
  }
  
  // Use normal authentication for non-test environments
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});
