import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { put } from '@vercel/blob'
import GoogleProvider from 'next-auth/providers/google'

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    session: async ({ session, token }: any) => {
      if (session?.user) {
        session.user.id = token.sub!
      }
      return session
    },
    jwt: async ({ user, token }: any) => {
      if (user) {
        token.uid = user.id
      }
      return token
    },
  },
  session: {
    strategy: 'jwt' as const,
  },
}

export async function POST(request: NextRequest) {
  try {
    // Get session to verify authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { path, data } = await request.json()
    
    if (!path || !data) {
      return NextResponse.json({ error: 'Missing path or data' }, { status: 400 })
    }

    // Verify the path belongs to the authenticated user
    const expectedPrefix = `users/${session.user.id}/`
    if (!path.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Upload to Vercel Blob
    const blob = await put(path, JSON.stringify(data), {
      access: 'public',
      contentType: 'application/json',
      allowOverwrite: true
    })

    return NextResponse.json({ url: blob.url })

  } catch (error) {
    console.error('Blob upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}