'use client'

import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ConvexReactClient } from 'convex/react'
import { ReactNode } from 'react'

/**
 * Test providers that bypass Clerk authentication
 * This should be used instead of the main providers.tsx during testing
 */

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL as string
const convex = new ConvexReactClient(convexUrl)

// Mock Clerk hooks for testing
const mockUseAuth = () => ({
  isLoaded: true,
  isSignedIn: true,
  userId: 'test-user-123',
  sessionId: 'test-session-123',
  getToken: () => Promise.resolve('test-token'),
  signOut: () => Promise.resolve(),
  signIn: () => Promise.resolve(),
  signUp: () => Promise.resolve(),
})

export function TestProviders({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={mockUseAuth}>
      {children}
    </ConvexProviderWithClerk>
  )
}
