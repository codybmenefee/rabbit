'use client'

import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/nextjs'

export function LoginButton() {
  return (
    <>
      <SignedIn>
        <div className="flex items-center gap-3">
          <UserButton afterSignOutUrl="/" />
        </div>
      </SignedIn>
      <SignedOut>
        <SignInButton>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Sign in</button>
        </SignInButton>
      </SignedOut>
    </>
  )
}
